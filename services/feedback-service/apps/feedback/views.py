from django.conf import settings
from django.db import transaction
from django.db.models import Count, Exists, OuterRef
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from .models import FeatureRequest, FeatureRequestComment, FeatureRequestVote
from .serializers import (
    FeatureRequestCommentSerializer,
    FeatureRequestCommentWriteSerializer,
    FeatureRequestDetailSerializer,
    FeatureRequestListSerializer,
    FeatureRequestStatusSerializer,
    FeatureRequestWriteSerializer,
)
from .user_client import user_profiles_for_subs


def _is_feedback_admin(keycloak_sub: str) -> bool:
    return keycloak_sub in settings.FEEDBACK_ADMIN_SUBS


def _subs_from_requests(requests) -> list[str]:
    return [item.author_keycloak_sub for item in requests]


def _subs_from_comments(comments) -> list[str]:
    return [item.author_keycloak_sub for item in comments]


class FeatureRequestViewSet(viewsets.ViewSet):
    def list(self, request):
        qs = FeatureRequest.objects.annotate(comment_count=Count("comments"))
        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)

        ordering = request.query_params.get("ordering", "-vote_count")
        allowed = {"vote_count", "-vote_count", "created_at", "-created_at"}
        if ordering in allowed:
            qs = qs.order_by(ordering, "-id")
        else:
            qs = qs.order_by("-vote_count", "-created_at")

        keycloak_sub = request.user.keycloak_sub
        qs = qs.annotate(
            voted=Exists(
                FeatureRequestVote.objects.filter(
                    request_id=OuterRef("pk"),
                    voter_keycloak_sub=keycloak_sub,
                )
            )
        )

        if "page" in request.query_params:
            paginator = PageNumberPagination()
            paginator.page_size = 10
            page = paginator.paginate_queryset(qs, request)
            profiles = user_profiles_for_subs(_subs_from_requests(page))
            serializer = FeatureRequestListSerializer(
                page,
                many=True,
                context={"user_profiles": profiles},
            )
            return paginator.get_paginated_response(serializer.data)

        items = list(qs)
        profiles = user_profiles_for_subs(_subs_from_requests(items))
        serializer = FeatureRequestListSerializer(
            items,
            many=True,
            context={"user_profiles": profiles},
        )
        return Response({"results": serializer.data})

    def create(self, request):
        serializer = FeatureRequestWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = FeatureRequest.objects.create(
            author_keycloak_sub=request.user.keycloak_sub,
            title=serializer.validated_data["title"],
            body=serializer.validated_data["body"],
        )
        profiles = user_profiles_for_subs([item.author_keycloak_sub])
        output = FeatureRequestDetailSerializer(
            item,
            context={
                "user_profiles": profiles,
                "voted_request_ids": set(),
                "viewer_sub": request.user.keycloak_sub,
            },
        )
        return Response(output.data, status=status.HTTP_201_CREATED)

    def retrieve(self, request, pk=None):
        item = FeatureRequest.objects.filter(pk=pk).first()
        if item is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        voted = FeatureRequestVote.objects.filter(
            request=item,
            voter_keycloak_sub=request.user.keycloak_sub,
        ).exists()
        profiles = user_profiles_for_subs([item.author_keycloak_sub])
        serializer = FeatureRequestDetailSerializer(
            item,
            context={
                "user_profiles": profiles,
                "voted_request_ids": {item.pk} if voted else set(),
                "viewer_sub": request.user.keycloak_sub,
            },
        )
        return Response(serializer.data)

    def destroy(self, request, pk=None):
        item = FeatureRequest.objects.filter(pk=pk).first()
        if item is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if item.author_keycloak_sub != request.user.keycloak_sub:
            return Response(
                {"detail": "삭제 권한이 없습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def partial_update(self, request, pk=None):
        if not _is_feedback_admin(request.user.keycloak_sub):
            return Response(
                {"detail": "상태 변경 권한이 없습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        item = FeatureRequest.objects.filter(pk=pk).first()
        if item is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = FeatureRequestStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item.status = serializer.validated_data["status"]
        item.save(update_fields=["status", "updated_at"])

        voted = FeatureRequestVote.objects.filter(
            request=item,
            voter_keycloak_sub=request.user.keycloak_sub,
        ).exists()
        profiles = user_profiles_for_subs([item.author_keycloak_sub])
        output = FeatureRequestDetailSerializer(
            item,
            context={
                "user_profiles": profiles,
                "voted_request_ids": {item.pk} if voted else set(),
                "viewer_sub": request.user.keycloak_sub,
            },
        )
        return Response(output.data)

    @action(detail=True, methods=["post"], url_path="vote")
    def vote(self, request, pk=None):
        item = FeatureRequest.objects.filter(pk=pk).first()
        if item is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        keycloak_sub = request.user.keycloak_sub
        with transaction.atomic():
            locked = FeatureRequest.objects.select_for_update().get(pk=item.pk)
            existing = FeatureRequestVote.objects.filter(
                request=locked,
                voter_keycloak_sub=keycloak_sub,
            ).first()
            if existing:
                existing.delete()
                if locked.vote_count > 0:
                    locked.vote_count -= 1
                    locked.save(update_fields=["vote_count", "updated_at"])
                voted = False
            else:
                FeatureRequestVote.objects.create(
                    request=locked,
                    voter_keycloak_sub=keycloak_sub,
                )
                locked.vote_count += 1
                locked.save(update_fields=["vote_count", "updated_at"])
                voted = True
            item = locked

        profiles = user_profiles_for_subs([item.author_keycloak_sub])
        output = FeatureRequestDetailSerializer(
            item,
            context={
                "user_profiles": profiles,
                "voted_request_ids": {item.pk} if voted else set(),
                "viewer_sub": keycloak_sub,
            },
        )
        return Response(output.data)

    @action(detail=True, methods=["get", "post"], url_path="comments")
    def comments(self, request, pk=None):
        item = FeatureRequest.objects.filter(pk=pk).first()
        if item is None:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == "GET":
            comments = item.comments.order_by("created_at")
            profiles = user_profiles_for_subs(_subs_from_comments(comments))
            serializer = FeatureRequestCommentSerializer(
                comments,
                many=True,
                context={"user_profiles": profiles},
            )
            return Response({"results": serializer.data})

        serializer = FeatureRequestCommentWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        comment = FeatureRequestComment.objects.create(
            request=item,
            author_keycloak_sub=request.user.keycloak_sub,
            body=serializer.validated_data["body"],
        )
        profiles = user_profiles_for_subs([comment.author_keycloak_sub])
        output = FeatureRequestCommentSerializer(
            comment,
            context={"user_profiles": profiles},
        )
        return Response(output.data, status=status.HTTP_201_CREATED)
