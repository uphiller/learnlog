from rest_framework import serializers

from apps.core.profanity import PROFANITY_ERROR, contains_profanity

from .models import User


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("display_name", "email")
        read_only_fields = ("email",)

    def validate_display_name(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError("이름을 입력해 주세요.")
        if len(value) > 255:
            raise serializers.ValidationError("이름은 255자 이하여야 합니다.")
        if contains_profanity(value):
            raise serializers.ValidationError(PROFANITY_ERROR)
        return value
