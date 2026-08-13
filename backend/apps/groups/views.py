from django.db import transaction
from django.db.models import Case, Count, IntegerField, Value, When
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.books.models import Book

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
    user_display_name,
)
from .utils import make_unique_slug


def _active_membership(group: Group, user) -> GroupMembership | None:
    return group.memberships.filter(user=user, status=GroupMembership.Status.ACTIVE).first()


def _can_manage_group(membership: GroupMembership | None) -> bool:
    if membership is None:
        return False
    return membership.role in (GroupMembership.Role.OWNER, GroupMembership.Role.ADMIN)


class GroupViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "head", "options"]
    lookup_field = "slug"

    def get_queryset(self):
        qs = (
            Group.objects.filter(
                memberships__user=self.request.user,
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
            user=self.request.user,
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

        if domain not in GroupContext.Domain.values:
            return Response({"domain": ["Invalid domain."]}, status=status.HTTP_400_BAD_REQUEST)

        group = Group.objects.create(
            name=name,
            slug=make_unique_slug(name),
            created_by=request.user,
        )
        GroupMembership.objects.create(
            group=group,
            user=request.user,
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

        group = (
            Group.objects.filter(slug=slug, context__domain=domain)
            .select_related("context")
            .first()
        )
        if group is None:
            return Response({"slug": ["독서모임을 찾을 수 없습니다."]}, status=status.HTTP_404_NOT_FOUND)

        membership = GroupMembership.objects.filter(group=group, user=request.user).first()
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
            user=request.user,
            role=GroupMembership.Role.MEMBER,
            status=GroupMembership.Status.PENDING,
        )
        output = GroupListSerializer(group, context={"request": request})
        return Response(output.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def members(self, request, slug=None):
        group = self.get_object()
        membership = _active_membership(group, request.user)
        statuses = [GroupMembership.Status.ACTIVE]
        if _can_manage_group(membership):
            statuses.append(GroupMembership.Status.PENDING)

        memberships = (
            group.memberships.filter(status__in=statuses)
            .select_related("user")
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
        return Response(GroupMemberSerializer(memberships, many=True).data)

    @action(detail=True, methods=["post"], url_path=r"members/(?P<user_id>[^/.]+)/approve")
    def approve_member(self, request, slug=None, user_id=None):
        group = self.get_object()
        membership = _active_membership(group, request.user)
        if not _can_manage_group(membership):
            return Response(
                {"detail": "방장 또는 관리자만 승인할 수 있습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        pending = get_object_or_404(
            GroupMembership,
            group=group,
            user_id=user_id,
            status=GroupMembership.Status.PENDING,
        )
        pending.status = GroupMembership.Status.ACTIVE
        pending.role = GroupMembership.Role.MEMBER
        pending.save(update_fields=["status", "role"])
        return Response(GroupMemberSerializer(pending).data)

    @action(detail=True, methods=["get", "post"], url_path="books")
    def books(self, request, slug=None):
        group = self.get_object()

        if request.method == "GET":
            readings = group.readings.select_related("set_by").order_by("-created_at")
            serializer = GroupReadingSerializer(readings, many=True)
            return Response({"results": serializer.data})

        membership = _active_membership(group, request.user)
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
            output = GroupReadingSerializer(existing)
            return Response(output.data, status=status.HTTP_200_OK)

        reading = GroupReading.objects.create(
            group=group,
            set_by=request.user,
            **serializer.validated_data,
        )
        output = GroupReadingSerializer(reading)
        return Response(output.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path=r"books/(?P<reading_id>[^/.]+)")
    def book_detail(self, request, slug=None, reading_id=None):
        group = self.get_object()
        reading = get_object_or_404(
            GroupReading.objects.select_related("set_by"),
            pk=reading_id,
            group=group,
        )

        member_user_ids = group.memberships.filter(
            status=GroupMembership.Status.ACTIVE,
        ).values_list("user_id", flat=True)

        member_books = (
            Book.objects.filter(
                owner_id__in=member_user_ids,
                aladin_item_id=reading.aladin_item_id,
            )
            .select_related("owner")
            .prefetch_related("quotes")
            .order_by("owner__display_name", "owner__email", "owner_id")
        )

        writings = []
        for book in member_books:
            quotes = [
                {
                    "quote": quote.quote,
                    "memo": quote.memo,
                    "page": quote.page,
                    "created_at": quote.created_at,
                }
                for quote in book.quotes.all()
            ]
            completion_sentence = book.completion_sentence.strip()
            if not quotes and not completion_sentence:
                continue
            writings.append(
                {
                    "user_id": book.owner_id,
                    "display_name": user_display_name(book.owner),
                    "completion_sentence": completion_sentence,
                    "quotes": quotes,
                }
            )

        payload = {
            "book": GroupReadingSerializer(reading).data,
            "writings": GroupMemberWritingSerializer(writings, many=True).data,
        }
        return Response(payload)

    @action(detail=True, methods=["get", "post"], url_path="posts")
    def posts(self, request, slug=None):
        group = self.get_object()

        if request.method == "GET":
            posts = (
                group.posts.select_related("author")
                .annotate(comment_count=Count("comments"))
                .order_by("-created_at")
            )
            serializer = GroupPostListSerializer(posts, many=True)
            return Response({"results": serializer.data})

        serializer = GroupPostWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        post = GroupPost.objects.create(
            group=group,
            author=request.user,
            title=serializer.validated_data["title"],
            body=serializer.validated_data["body"],
        )
        output = GroupPostDetailSerializer(post)
        return Response(output.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path=r"posts/(?P<post_id>[^/.]+)")
    def post_detail(self, request, slug=None, post_id=None):
        group = self.get_object()
        post = get_object_or_404(GroupPost, pk=post_id, group=group)
        serializer = GroupPostDetailSerializer(post)
        return Response(serializer.data)

    @action(detail=True, methods=["get", "post"], url_path=r"posts/(?P<post_id>[^/.]+)/comments")
    def post_comments(self, request, slug=None, post_id=None):
        group = self.get_object()
        post = get_object_or_404(GroupPost, pk=post_id, group=group)

        if request.method == "GET":
            comments = post.comments.select_related("author").order_by("created_at")
            serializer = GroupCommentSerializer(comments, many=True)
            return Response({"results": serializer.data})

        serializer = GroupCommentWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        comment = GroupComment.objects.create(
            post=post,
            author=request.user,
            body=serializer.validated_data["body"],
        )
        output = GroupCommentSerializer(comment)
        return Response(output.data, status=status.HTTP_201_CREATED)
