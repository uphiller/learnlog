from rest_framework import serializers

from apps.core.profanity import PROFANITY_ERROR, contains_profanity

from .models import FeatureRequest, FeatureRequestComment
from .user_client import display_name_for_sub


def _clean_text(value: str, empty_message: str) -> str:
    value = value.strip()
    if not value:
        raise serializers.ValidationError(empty_message)
    if contains_profanity(value):
        raise serializers.ValidationError(PROFANITY_ERROR)
    return value


class FeatureRequestListSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    comment_count = serializers.IntegerField(read_only=True)
    voted = serializers.BooleanField(read_only=True)

    class Meta:
        model = FeatureRequest
        fields = (
            "id",
            "title",
            "body",
            "status",
            "author_name",
            "vote_count",
            "voted",
            "comment_count",
            "created_at",
        )

    def get_author_name(self, obj: FeatureRequest) -> str:
        profiles = self.context.get("user_profiles", {})
        return display_name_for_sub(profiles, obj.author_keycloak_sub)


class FeatureRequestDetailSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    voted = serializers.SerializerMethodField()

    class Meta:
        model = FeatureRequest
        fields = (
            "id",
            "title",
            "body",
            "status",
            "author_name",
            "vote_count",
            "voted",
            "created_at",
            "updated_at",
        )

    def get_author_name(self, obj: FeatureRequest) -> str:
        profiles = self.context.get("user_profiles", {})
        return display_name_for_sub(profiles, obj.author_keycloak_sub)

    def get_voted(self, obj: FeatureRequest) -> bool:
        voted_ids = self.context.get("voted_request_ids")
        if voted_ids is not None:
            return obj.pk in voted_ids
        return False


class FeatureRequestWriteSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200)
    body = serializers.CharField()

    def validate_title(self, value: str) -> str:
        return _clean_text(value, "제목을 입력해 주세요.")

    def validate_body(self, value: str) -> str:
        return _clean_text(value, "내용을 입력해 주세요.")


class FeatureRequestStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=FeatureRequest.Status.choices)


class FeatureRequestCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = FeatureRequestComment
        fields = ("id", "body", "author_name", "created_at")

    def get_author_name(self, obj: FeatureRequestComment) -> str:
        profiles = self.context.get("user_profiles", {})
        return display_name_for_sub(profiles, obj.author_keycloak_sub)


class FeatureRequestCommentWriteSerializer(serializers.Serializer):
    body = serializers.CharField()

    def validate_body(self, value: str) -> str:
        return _clean_text(value, "댓글을 입력해 주세요.")
