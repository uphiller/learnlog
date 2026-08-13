from django.db import transaction
from django.db.models import Case, IntegerField, Value, When
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.books.models import Book
from apps.books.utils import is_book_finished

from .models import Group, GroupContext, GroupMembership
from .serializers import (
    GroupBookSerializer,
    GroupCreateSerializer,
    GroupListSerializer,
    GroupMemberSerializer,
)
from .utils import make_unique_slug


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

    @action(detail=True, methods=["get"])
    def books(self, request, slug=None):
        group = self.get_object()
        member_ids = list(
            group.memberships.filter(status=GroupMembership.Status.ACTIVE).values_list(
                "user_id", flat=True
            )
        )
        if not member_ids:
            return Response({"results": []})

        books = (
            Book.objects.filter(owner_id__in=member_ids)
            .select_related("owner")
            .prefetch_related("quotes")
        )

        aggregated: dict[str, dict] = {}
        for book in books:
            if not is_book_finished(book):
                continue
            entry = aggregated.get(book.aladin_item_id)
            if entry is None:
                entry = {
                    "aladin_item_id": book.aladin_item_id,
                    "title": book.title,
                    "author": book.author,
                    "cover_url": book.cover_url,
                    "isbn13": book.isbn13,
                    "publisher": book.publisher,
                    "pub_date": book.pub_date,
                    "total_pages": book.total_pages,
                    "readers": [],
                }
                aggregated[book.aladin_item_id] = entry
            owner = book.owner
            entry["readers"].append(
                {
                    "display_name": owner.display_name or owner.email or owner.keycloak_sub,
                    "completion_sentence": book.completion_sentence,
                }
            )

        results = []
        for entry in aggregated.values():
            entry["reader_count"] = len(entry["readers"])
            results.append(entry)
        results.sort(key=lambda item: (-item["reader_count"], item["title"]))

        serializer = GroupBookSerializer(results, many=True)
        return Response({"results": serializer.data})
