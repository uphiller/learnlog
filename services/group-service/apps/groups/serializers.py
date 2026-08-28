from rest_framework import serializers

from apps.core.profanity import PROFANITY_ERROR, contains_profanity

from .models import Group, GroupComment, GroupMembership, GroupPost, GroupReading
from .user_client import display_name_for_sub


class GroupListSerializer(serializers.ModelSerializer):
    my_role = serializers.SerializerMethodField()
    my_status = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Group
        fields = ("id", "name", "slug", "my_role", "my_status", "member_count", "created_at")

    def get_my_role(self, obj: Group) -> str | None:
        membership = self._membership_for(obj)
        return membership.role if membership else None

    def get_my_status(self, obj: Group) -> str | None:
        membership = self._membership_for(obj)
        return membership.status if membership else None

    def get_member_count(self, obj: Group) -> int:
        return obj.memberships.filter(status=GroupMembership.Status.ACTIVE).count()

    def _membership_for(self, obj: Group) -> GroupMembership | None:
        keycloak_sub = self.context["request"].user.keycloak_sub
        return (
            obj.memberships.filter(
                member_keycloak_sub=keycloak_sub,
                status__in=(
                    GroupMembership.Status.ACTIVE,
                    GroupMembership.Status.PENDING,
                ),
            )
            .order_by("-joined_at")
            .first()
        )


class GroupJoinSerializer(serializers.Serializer):
    slug = serializers.SlugField(max_length=120, allow_unicode=True)

    def validate_slug(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError("모임 주소를 입력해 주세요.")
        return value


class GroupMemberSerializer(serializers.ModelSerializer):
    keycloak_sub = serializers.CharField(source="member_keycloak_sub")
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = GroupMembership
        fields = ("keycloak_sub", "display_name", "role", "status", "joined_at")

    def get_display_name(self, obj: GroupMembership) -> str:
        profiles = self.context.get("user_profiles", {})
        return display_name_for_sub(profiles, obj.member_keycloak_sub)


class GroupReadingSerializer(serializers.ModelSerializer):
    set_by_name = serializers.SerializerMethodField()

    class Meta:
        model = GroupReading
        fields = (
            "id",
            "aladin_item_id",
            "title",
            "author",
            "cover_url",
            "isbn13",
            "publisher",
            "pub_date",
            "total_pages",
            "set_by_name",
            "created_at",
        )

    def get_set_by_name(self, obj: GroupReading) -> str:
        profiles = self.context.get("user_profiles", {})
        return display_name_for_sub(profiles, obj.set_by_keycloak_sub)


class GroupMemberBookQuoteSerializer(serializers.Serializer):
    quote = serializers.CharField()
    memo = serializers.CharField()
    page = serializers.CharField()
    created_at = serializers.DateTimeField()


class GroupMemberWritingSerializer(serializers.Serializer):
    keycloak_sub = serializers.CharField()
    display_name = serializers.CharField()
    completion_sentence = serializers.CharField(allow_blank=True, required=False)
    quotes = GroupMemberBookQuoteSerializer(many=True)


class GroupReadingCreateSerializer(serializers.Serializer):
    aladin_item_id = serializers.CharField(max_length=32)
    title = serializers.CharField(max_length=500)
    author = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")
    cover_url = serializers.URLField(max_length=500, required=False, allow_blank=True, default="")
    isbn13 = serializers.CharField(max_length=13, required=False, allow_blank=True, default="")
    publisher = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")
    pub_date = serializers.CharField(max_length=32, required=False, allow_blank=True, default="")
    total_pages = serializers.IntegerField(required=False, allow_null=True, min_value=1)

    def validate_aladin_item_id(self, value: str) -> str:
        value = str(value).strip()
        if not value:
            raise serializers.ValidationError("aladin_item_id is required.")
        return value

    def validate_title(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError("title is required.")
        return value


class GroupPostListSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    comment_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = GroupPost
        fields = ("id", "title", "body", "author_name", "comment_count", "created_at")

    def get_author_name(self, obj: GroupPost) -> str:
        profiles = self.context.get("user_profiles", {})
        return display_name_for_sub(profiles, obj.author_keycloak_sub)


class GroupPostDetailSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = GroupPost
        fields = ("id", "title", "body", "author_name", "created_at", "updated_at")

    def get_author_name(self, obj: GroupPost) -> str:
        profiles = self.context.get("user_profiles", {})
        return display_name_for_sub(profiles, obj.author_keycloak_sub)


class GroupPostWriteSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200)
    body = serializers.CharField()

    def validate_title(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError("제목을 입력해 주세요.")
        if contains_profanity(value):
            raise serializers.ValidationError(PROFANITY_ERROR)
        return value

    def validate_body(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError("내용을 입력해 주세요.")
        if contains_profanity(value):
            raise serializers.ValidationError(PROFANITY_ERROR)
        return value


class GroupCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = GroupComment
        fields = ("id", "body", "author_name", "created_at")

    def get_author_name(self, obj: GroupComment) -> str:
        profiles = self.context.get("user_profiles", {})
        return display_name_for_sub(profiles, obj.author_keycloak_sub)


class GroupCommentWriteSerializer(serializers.Serializer):
    body = serializers.CharField()

    def validate_body(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError("댓글을 입력해 주세요.")
        if contains_profanity(value):
            raise serializers.ValidationError(PROFANITY_ERROR)
        return value


class GroupCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)

    def validate_name(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError("모임명을 입력해 주세요.")
        if contains_profanity(value):
            raise serializers.ValidationError(PROFANITY_ERROR)
        return value
