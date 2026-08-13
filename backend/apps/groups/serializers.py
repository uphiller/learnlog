from rest_framework import serializers

from .models import Group, GroupMembership


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


class GroupBookReaderSerializer(serializers.Serializer):
    display_name = serializers.CharField()
    completion_sentence = serializers.CharField()


class GroupBookSerializer(serializers.Serializer):
    aladin_item_id = serializers.CharField()
    title = serializers.CharField()
    author = serializers.CharField()
    cover_url = serializers.URLField()
    isbn13 = serializers.CharField()
    publisher = serializers.CharField()
    pub_date = serializers.CharField()
    total_pages = serializers.IntegerField(allow_null=True)
    reader_count = serializers.IntegerField(min_value=1)
    readers = GroupBookReaderSerializer(many=True)


class GroupCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)

    def validate_name(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError("모임명을 입력해 주세요.")
        return value
