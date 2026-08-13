from django.db import transaction
from django.db.models import Case, Count, IntegerField, Value, When
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Group, GroupComment, GroupContext, GroupMembership, GroupPost, GroupReading
from .serializers import (
    GroupCommentSerializer,
    GroupCommentWriteSerializer,
    GroupCreateSerializer,
    GroupListSerializer,
    GroupMemberSerializer,
    GroupPostDetailSerializer,
    GroupPostListSerializer,
    GroupPostWriteSerializer,
    GroupReadingCreateSerializer,
    GroupReadingSerializer,
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
                memberships__status=GroupMembership.Status.ACTIVE,
            )
            .distinct()
            .select_related("context")
        )
        domain = self.request.query_params.get("domain")
        if domain:
            qs = qs.filter(context__domain=domain)
        return qs

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

    @action(detail=True, methods=["get"])
    def members(self, request, slug=None):
        group = self.get_object()
        memberships = (
            group.memberships.filter(status=GroupMembership.Status.ACTIVE)
            .select_related("user")
            .annotate(
                role_order=Case(
                    When(role=GroupMembership.Role.OWNER, then=Value(0)),
                    When(role=GroupMembership.Role.ADMIN, then=Value(1)),
                    default=Value(2),
                    output_field=IntegerField(),
                )
            )
            .order_by("role_order", "joined_at")
        )
        return Response(GroupMemberSerializer(memberships, many=True).data)

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
