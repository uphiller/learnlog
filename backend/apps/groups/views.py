from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Group, GroupContext, GroupMembership
from .serializers import GroupCreateSerializer, GroupListSerializer
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
