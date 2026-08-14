from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.internal import is_valid_internal_request

from .models import Book


class MemberWritingsView(APIView):
    """Internal API for group-service to fetch member writings for a shared book."""

    authentication_classes: list = []
    permission_classes: list = []

    def get(self, request):
        if not is_valid_internal_request(request):
            return Response({"detail": "Forbidden."}, status=403)

        aladin_item_id = request.query_params.get("aladin_item_id", "").strip()
        keycloak_subs = [
            value.strip()
            for value in request.query_params.get("keycloak_subs", "").split(",")
            if value.strip()
        ]
        if not aladin_item_id or not keycloak_subs:
            return Response({"detail": "aladin_item_id and keycloak_subs are required."}, status=400)

        member_books = (
            Book.objects.filter(
                owner_keycloak_sub__in=keycloak_subs,
                aladin_item_id=aladin_item_id,
            )
            .prefetch_related("quotes")
            .order_by("owner_keycloak_sub", "id")
        )

        writings = []
        for book in member_books:
            quotes = [
                {
                    "quote": quote.quote,
                    "memo": quote.memo,
                    "page": quote.page,
                    "created_at": quote.created_at.isoformat(),
                }
                for quote in book.quotes.all()
            ]
            completion_sentence = book.completion_sentence.strip()
            if not quotes and not completion_sentence:
                continue
            writings.append(
                {
                    "keycloak_sub": book.owner_keycloak_sub,
                    "completion_sentence": completion_sentence,
                    "quotes": quotes,
                }
            )

        return Response({"results": writings})
