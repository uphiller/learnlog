from django.db import transaction
from django.db.models import Case, Count, IntegerField, Value, When
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .book_client import BookServiceError, fetch_member_writings
from .models import Group, GroupComment, GroupContext, GroupMembership, GroupPost, GroupReading
from .serializers import (
    GroupCommentSerializer,
    GroupCommentWriteSerializer,
    GroupCreateSerializer,
    GroupJoinSerializer,
    GroupListSerializer,
    GroupMemberSerializer,
    GroupMemberWritingSerializer,
    GroupPostDetailSerializer,
    GroupPostListSerializer,
    GroupPostWriteSerializer,
    GroupReadingCreateSerializer,
    GroupReadingSerializer,
)
from .user_client import display_name_for_sub, user_profiles_for_subs
from .utils import make_unique_slug


def _active_membership(group: Group, keycloak_sub: str) -> GroupMembership | None:
    return group.memberships.filter(
        member_keycloak_sub=keycloak_sub,
        status=GroupMembership.Status.ACTIVE,
    ).first()


def _can_manage_group(membership: GroupMembership | None) -> bool:
    if membership is None:
        return False
    return membership.role in (GroupMembership.Role.OWNER, GroupMembership.Role.ADMIN)


def _subs_from_memberships(memberships) -> list[str]:
    return [membership.member_keycloak_sub for membership in memberships]


def _subs_from_readings(readings) -> list[str]:
    return [reading.set_by_keycloak_sub for reading in readings]


def _subs_from_posts(posts) -> list[str]:
    return [post.author_keycloak_sub for post in posts]


def _subs_from_comments(comments) -> list[str]:
    return [comment.author_keycloak_sub for comment in comments]


class GroupViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "head", "options"]
    lookup_field = "slug"

    def get_queryset(self):
        keycloak_sub = self.request.user.keycloak_sub
        qs = (
            Group.objects.filter(
                memberships__member_keycloak_sub=keycloak_sub,
                memberships__status__in=(
                    GroupMembership.Status.ACTIVE,
                    GroupMembership.Status.PENDING,
                ),
            )
            .distinct()
            .select_related("context")
        )
        domain = self.request.query_params.get("domain")
        if domain:
            qs = qs.filter(context__domain=domain)
        return qs

    def get_object(self):
        group = super().get_object()
        membership = group.memberships.filter(
            member_keycloak_sub=self.request.user.keycloak_sub,
            status=GroupMembership.Status.ACTIVE,
        ).first()
        if membership is None:
            from rest_framework.exceptions import NotFound

            raise NotFound("독서모임을 찾을 수 없습니다.")
        return group

    def get_serializer_class(self):
        if self.action == "create":
            return GroupCreateSerializer
        return GroupListSerializer

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = GroupCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        name = serializer.validated_data["name"]
        domain = request.query_params.get("domain", GroupContext.Domain.BOOK)
        keycloak_sub = request.user.keycloak_sub

        if domain not in GroupContext.Domain.values:
            return Response({"domain": ["Invalid domain."]}, status=status.HTTP_400_BAD_REQUEST)

        group = Group.objects.create(
            name=name,
            slug=make_unique_slug(name),
            created_by_keycloak_sub=keycloak_sub,
        )
        GroupMembership.objects.create(
            group=group,
            member_keycloak_sub=keycloak_sub,
            role=GroupMembership.Role.OWNER,
            status=GroupMembership.Status.ACTIVE,
        )
        GroupContext.objects.create(group=group, domain=domain)

        output = GroupListSerializer(group, context={"request": request})
        return Response(output.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], url_path="join")
    def join(self, request):
        serializer = GroupJoinSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        slug = serializer.validated_data["slug"]
        domain = request.query_params.get("domain", GroupContext.Domain.BOOK)
        keycloak_sub = request.user.keycloak_sub

        group = (
            Group.objects.filter(slug=slug, context__domain=domain)
            .select_related("context")
            .first()
        )
        if group is None:
            return Response({"slug": ["독서모임을 찾을 수 없습니다."]}, status=status.HTTP_404_NOT_FOUND)

        membership = GroupMembership.objects.filter(
            group=group,
            member_keycloak_sub=keycloak_sub,
        ).first()
        if membership:
            if membership.status == GroupMembership.Status.ACTIVE:
                return Response({"detail": "이미 참여 중인 독서모임입니다."}, status=status.HTTP_400_BAD_REQUEST)
            if membership.status == GroupMembership.Status.PENDING:
                output = GroupListSerializer(group, context={"request": request})
                return Response(output.data, status=status.HTTP_200_OK)
            if membership.status == GroupMembership.Status.BANNED:
                return Response({"detail": "참가할 수 없는 독서모임입니다."}, status=status.HTTP_403_FORBIDDEN)

        GroupMembership.objects.create(
            group=group,
            member_keycloak_sub=keycloak_sub,
            role=GroupMembership.Role.MEMBER,
            status=GroupMembership.Status.PENDING,
        )
        output = GroupListSerializer(group, context={"request": request})
        return Response(output.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def members(self, request, slug=None):
        group = self.get_object()
        membership = _active_membership(group, request.user.keycloak_sub)
        statuses = [GroupMembership.Status.ACTIVE]
        if _can_manage_group(membership):
            statuses.append(GroupMembership.Status.PENDING)

        memberships = (
            group.memberships.filter(status__in=statuses)
            .annotate(
                role_order=Case(
                    When(status=GroupMembership.Status.PENDING, then=Value(0)),
                    When(role=GroupMembership.Role.OWNER, then=Value(1)),
                    When(role=GroupMembership.Role.ADMIN, then=Value(2)),
                    default=Value(3),
                    output_field=IntegerField(),
                )
            )
            .order_by("role_order", "joined_at")
        )
        profiles = user_profiles_for_subs(_subs_from_memberships(memberships))
        return Response(
            GroupMemberSerializer(
                memberships,
                many=True,
                context={"user_profiles": profiles},
            ).data
        )

    @action(detail=True, methods=["post"], url_path=r"members/(?P<keycloak_sub>[^/.]+)/approve")
    def approve_member(self, request, slug=None, keycloak_sub=None):
        group = self.get_object()
        membership = _active_membership(group, request.user.keycloak_sub)
        if not _can_manage_group(membership):
            return Response(
                {"detail": "방장 또는 관리자만 승인할 수 있습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        pending = get_object_or_404(
            GroupMembership,
            group=group,
            member_keycloak_sub=keycloak_sub,
            status=GroupMembership.Status.PENDING,
        )
        pending.status = GroupMembership.Status.ACTIVE
        pending.role = GroupMembership.Role.MEMBER
        pending.save(update_fields=["status", "role"])
        profiles = user_profiles_for_subs([pending.member_keycloak_sub])
        return Response(
            GroupMemberSerializer(pending, context={"user_profiles": profiles}).data
        )

    @action(detail=True, methods=["get", "post"], url_path="books")
    def books(self, request, slug=None):
        group = self.get_object()

        if request.method == "GET":
            readings = group.readings.order_by("-created_at")
            profiles = user_profiles_for_subs(_subs_from_readings(readings))
            serializer = GroupReadingSerializer(
                readings,
                many=True,
                context={"user_profiles": profiles},
            )
            return Response({"results": serializer.data})

        membership = _active_membership(group, request.user.keycloak_sub)
        if not _can_manage_group(membership):
            return Response(
                {"detail": "방장 또는 관리자만 책을 등록할 수 있습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = GroupReadingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        aladin_item_id = serializer.validated_data["aladin_item_id"]

        existing = group.readings.filter(aladin_item_id=aladin_item_id).first()
        if existing:
            profiles = user_profiles_for_subs([existing.set_by_keycloak_sub])
            output = GroupReadingSerializer(existing, context={"user_profiles": profiles})
            return Response(output.data, status=status.HTTP_200_OK)

        reading = GroupReading.objects.create(
            group=group,
            set_by_keycloak_sub=request.user.keycloak_sub,
            **serializer.validated_data,
        )
        profiles = user_profiles_for_subs([reading.set_by_keycloak_sub])
        output = GroupReadingSerializer(reading, context={"user_profiles": profiles})
        return Response(output.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path=r"books/(?P<reading_id>[^/.]+)")
    def book_detail(self, request, slug=None, reading_id=None):
        group = self.get_object()
        reading = get_object_or_404(
            GroupReading.objects.filter(pk=reading_id, group=group),
        )

        memberships = group.memberships.filter(status=GroupMembership.Status.ACTIVE)
        keycloak_subs = _subs_from_memberships(memberships)

        try:
            remote_writings = fetch_member_writings(
                aladin_item_id=reading.aladin_item_id,
                keycloak_subs=keycloak_subs,
            )
        except BookServiceError as exc:
            return Response({"detail": exc.detail}, status=exc.status)

        member_subs = {membership.member_keycloak_sub for membership in memberships}
        profiles = user_profiles_for_subs(keycloak_subs)

        writings = []
        for item in remote_writings:
            sub = item["keycloak_sub"]
            if sub not in member_subs:
                continue
            writings.append(
                {
                    "keycloak_sub": sub,
                    "display_name": display_name_for_sub(profiles, sub),
                    "completion_sentence": item.get("completion_sentence", ""),
                    "quotes": item.get("quotes", []),
                }
            )

        reading_profiles = user_profiles_for_subs([reading.set_by_keycloak_sub])
        payload = {
            "book": GroupReadingSerializer(
                reading,
                context={"user_profiles": reading_profiles},
            ).data,
            "writings": GroupMemberWritingSerializer(writings, many=True).data,
        }
        return Response(payload)

    @action(detail=True, methods=["get", "post"], url_path="posts")
    def posts(self, request, slug=None):
        group = self.get_object()

        if request.method == "GET":
            posts = (
                group.posts.annotate(comment_count=Count("comments"))
                .order_by("-created_at")
            )
            profiles = user_profiles_for_subs(_subs_from_posts(posts))
            serializer = GroupPostListSerializer(
                posts,
                many=True,
                context={"user_profiles": profiles},
            )
            return Response({"results": serializer.data})

        serializer = GroupPostWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        post = GroupPost.objects.create(
            group=group,
            author_keycloak_sub=request.user.keycloak_sub,
            title=serializer.validated_data["title"],
            body=serializer.validated_data["body"],
        )
        profiles = user_profiles_for_subs([post.author_keycloak_sub])
        output = GroupPostDetailSerializer(post, context={"user_profiles": profiles})
        return Response(output.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path=r"posts/(?P<post_id>[^/.]+)")
    def post_detail(self, request, slug=None, post_id=None):
        group = self.get_object()
        post = get_object_or_404(GroupPost, pk=post_id, group=group)
        profiles = user_profiles_for_subs([post.author_keycloak_sub])
        serializer = GroupPostDetailSerializer(post, context={"user_profiles": profiles})
        return Response(serializer.data)

    @action(detail=True, methods=["get", "post"], url_path=r"posts/(?P<post_id>[^/.]+)/comments")
    def post_comments(self, request, slug=None, post_id=None):
        group = self.get_object()
        post = get_object_or_404(GroupPost, pk=post_id, group=group)

        if request.method == "GET":
            comments = post.comments.order_by("created_at")
            profiles = user_profiles_for_subs(_subs_from_comments(comments))
            serializer = GroupCommentSerializer(
                comments,
                many=True,
                context={"user_profiles": profiles},
            )
            return Response({"results": serializer.data})

        serializer = GroupCommentWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        comment = GroupComment.objects.create(
            post=post,
            author_keycloak_sub=request.user.keycloak_sub,
            body=serializer.validated_data["body"],
        )
        profiles = user_profiles_for_subs([comment.author_keycloak_sub])
        output = GroupCommentSerializer(comment, context={"user_profiles": profiles})
        return Response(output.data, status=status.HTTP_201_CREATED)
