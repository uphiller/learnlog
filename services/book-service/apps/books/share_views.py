from django.http import HttpResponse, HttpResponseRedirect
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import BookPublicSerializer
from .share_utils import (
    build_share_url,
    get_shared_book,
    render_share_preview_html,
    share_cover_image_url,
    share_og_image_url,
)


class BookSharePublicView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token: str):
        book = get_shared_book(token)
        if not book:
            return Response({"detail": "공유된 책을 찾을 수 없습니다."}, status=404)
        return Response(BookPublicSerializer(book).data)


class BookSharePreviewView(APIView):
    """HTML with Open Graph meta tags for social crawlers."""

    permission_classes = [AllowAny]

    def get(self, request, token: str):
        book = get_shared_book(token)
        if not book:
            return HttpResponse("Not found", status=404, content_type="text/plain; charset=utf-8")
        share_url = build_share_url(token)
        html = render_share_preview_html(
            book=book,
            token=token,
            share_url=share_url,
            og_image_url=share_og_image_url(token),
        )
        response = HttpResponse(html, content_type="text/html; charset=utf-8")
        response["Cache-Control"] = "public, max-age=3600"
        return response


class BookShareOgImageView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token: str):
        book = get_shared_book(token)
        if not book:
            return HttpResponse(status=404)
        return HttpResponseRedirect(share_cover_image_url(book))
