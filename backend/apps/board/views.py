from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Post
from .permissions import IsAuthorOrReadOnly
from .serializers import PostDetailSerializer, PostListSerializer, PostWriteSerializer


class PostViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAuthorOrReadOnly]
    queryset = Post.objects.select_related("author").all()

    def get_serializer_class(self):
        if self.action == "list":
            return PostListSerializer
        if self.action in ("create", "update", "partial_update"):
            return PostWriteSerializer
        return PostDetailSerializer

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)
