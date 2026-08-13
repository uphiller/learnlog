from rest_framework import serializers

from .models import Group, GroupMembership, GroupReading


class GroupListSerializer(serializers.ModelSerializer):
    my_role = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Group
        fields = ("id", "name", "slug", "my_role", "member_count", "created_at")

    def get_my_role(self, obj: Group) -> str | None:
        membership = self._membership_for(obj)
        return membership.role if membership else None

    def get_member_count(self, obj: Group) -> int:
        return obj.memberships.filter(status=GroupMembership.Status.ACTIVE).count()

    def _membership_for(self, obj: Group) -> GroupMembership | None:
        user = self.context["request"].user
        return obj.memberships.filter(user=user, status=GroupMembership.Status.ACTIVE).first()


class GroupMemberSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = GroupMembership
        fields = ("user_id", "display_name", "role", "joined_at")

    def get_display_name(self, obj: GroupMembership) -> str:
        user = obj.user
        return user.display_name or user.email or user.keycloak_sub


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
        user = obj.set_by
        return user.display_name or user.email or user.keycloak_sub


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


class GroupCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)

    def validate_name(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError("모임명을 입력해 주세요.")
        return value
