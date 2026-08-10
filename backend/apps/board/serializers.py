from rest_framework import serializers

from .models import Post


class AuthorSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    display_name = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)


class PostListSerializer(serializers.ModelSerializer):
    author = AuthorSerializer(read_only=True)

    class Meta:
        model = Post
        fields = ("id", "title", "author", "created_at", "updated_at")


class PostDetailSerializer(serializers.ModelSerializer):
    author = AuthorSerializer(read_only=True)

    class Meta:
        model = Post
        fields = ("id", "title", "body", "author", "created_at", "updated_at")


class PostWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Post
        fields = ("title", "body")
