from datetime import date, timedelta

from django.conf import settings
from django.db.models import Count
from django.utils import timezone
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .aladin import AladinError, lookup_total_pages, search_books
from .models import Book, BookQuote
from .serializers import (
    BookCompletionSerializer,
    BookCreateSerializer,
    BookListSerializer,
    BookQuoteSerializer,
    BookQuoteWriteSerializer,
    BookShareStatusSerializer,
    PeerBookSerializer,
    PeerQuoteSerializer,
)
from .share_utils import build_share_url, ensure_share_token
from .utils import PEER_BOOK_LIMIT, PEER_QUOTE_LIMIT, is_book_finished


class HistoryCalendarView(APIView):
    """User activity (books, quotes) grouped by local calendar date."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = timezone.localdate()
        try:
            year = int(request.query_params.get("year", today.year))
            month = int(request.query_params.get("month", today.month))
        except (TypeError, ValueError):
            return Response({"detail": "year and month must be integers."}, status=400)

        if month < 1 or month > 12:
            return Response({"detail": "month must be 1–12."}, status=400)

        month_start = date(year, month, 1)
        if month == 12:
            next_month = date(year + 1, 1, 1)
        else:
            next_month = date(year, month + 1, 1)
        month_end = next_month - timedelta(days=1)

        owner_sub = request.user.keycloak_sub
        books = Book.objects.filter(
            owner_keycloak_sub=owner_sub,
            created_at__date__gte=month_start,
            created_at__date__lte=month_end,
        )
        quotes = BookQuote.objects.filter(
            book__owner_keycloak_sub=owner_sub,
            created_at__date__gte=month_start,
            created_at__date__lte=month_end,
        ).select_related("book")

        events_by_date: dict[str, list[dict]] = {}

        def append_event(day_iso: str, event: dict) -> None:
            events_by_date.setdefault(day_iso, []).append(event)

        for book in books:
            day_iso = timezone.localtime(book.created_at).date().isoformat()
            append_event(
                day_iso,
                {
                    "kind": "book",
                    "id": book.id,
                    "book_id": book.id,
                    "title": book.title,
                    "subtitle": book.author,
                    "occurred_at": book.created_at.isoformat(),
                },
            )

        for quote in quotes:
            day_iso = timezone.localtime(quote.created_at).date().isoformat()
            preview = quote.quote[:120] + ("…" if len(quote.quote) > 120 else "")
            append_event(
                day_iso,
                {
                    "kind": "quote",
                    "id": quote.id,
                    "book_id": quote.book_id,
                    "title": quote.book.title,
                    "preview": preview,
                    "occurred_at": quote.created_at.isoformat(),
                },
            )

        for day_events in events_by_date.values():
            day_events.sort(key=lambda e: e["occurred_at"])

        return Response(
            {
                "year": year,
                "month": month,
                "events_by_date": events_by_date,
            }
        )


class BookSearchView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        q = request.query_params.get("q", "").strip()
        if not q:
            return Response({"results": []})

        try:
            start = int(request.query_params.get("start", 1))
        except ValueError:
            start = 1

        ttb_key = getattr(settings, "ALADIN_TTB_KEY", "")
        try:
            results = search_books(ttb_key, q, start=start)
        except AladinError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

        return Response({"results": results})


class BookViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        qs = Book.objects.filter(owner_keycloak_sub=self.request.user.keycloak_sub)
        if self.action in ("list", "retrieve", "peer_quotes", "peer_books", "complete"):
            qs = qs.prefetch_related("quotes")
        return qs

    def get_serializer_class(self):
        if self.action == "create":
            return BookCreateSerializer
        return BookListSerializer

    def _resolve_total_pages(self, aladin_item_id: str) -> int | None:
        ttb_key = getattr(settings, "ALADIN_TTB_KEY", "")
        try:
            return lookup_total_pages(ttb_key, aladin_item_id)
        except AladinError:
            return None

    def perform_create(self, serializer):
        total_pages = self._resolve_total_pages(serializer.validated_data["aladin_item_id"])
        serializer.save(
            owner_keycloak_sub=self.request.user.keycloak_sub,
            total_pages=total_pages,
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        existing = Book.objects.filter(
            owner_keycloak_sub=request.user.keycloak_sub,
            aladin_item_id=serializer.validated_data["aladin_item_id"],
        ).first()
        if existing:
            if existing.total_pages is None:
                total_pages = self._resolve_total_pages(existing.aladin_item_id)
                if total_pages is not None:
                    existing.total_pages = total_pages
                    existing.save(update_fields=["total_pages"])
            output = BookListSerializer(existing)
            return Response(output.data, status=status.HTTP_200_OK)
        self.perform_create(serializer)
        output = BookListSerializer(serializer.instance)
        return Response(output.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="complete")
    def complete(self, request, pk=None):
        book = self.get_object()
        if book.completion_sentence.strip():
            return Response(
                {"detail": "이미 완독 뱃지를 받았습니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = BookCompletionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        book.completion_sentence = serializer.validated_data["completion_sentence"]
        book.save(update_fields=["completion_sentence"])
        return Response(BookListSerializer(book).data)

    @action(detail=True, methods=["get"], url_path="peer-quotes")
    def peer_quotes(self, request, pk=None):
        book = self.get_object()
        if not is_book_finished(book):
            return Response({"unlocked": False, "results": []})

        peer_qs = (
            BookQuote.objects.filter(book__aladin_item_id=book.aladin_item_id)
            .exclude(book__owner_keycloak_sub=request.user.keycloak_sub)
            .order_by("?")[:PEER_QUOTE_LIMIT]
        )
        return Response(
            {
                "unlocked": True,
                "results": PeerQuoteSerializer(peer_qs, many=True).data,
            }
        )

    @action(detail=True, methods=["get"], url_path="peer-books")
    def peer_books(self, request, pk=None):
        book = self.get_object()
        if not is_book_finished(book):
            return Response({"unlocked": False, "results": []})

        peer_owner_subs = (
            Book.objects.filter(aladin_item_id=book.aladin_item_id)
            .exclude(owner_keycloak_sub=request.user.keycloak_sub)
            .values_list("owner_keycloak_sub", flat=True)
            .distinct()
        )
        my_aladin_ids = Book.objects.filter(owner_keycloak_sub=request.user.keycloak_sub).values_list(
            "aladin_item_id", flat=True
        )

        aggregated = (
            Book.objects.filter(owner_keycloak_sub__in=peer_owner_subs)
            .exclude(aladin_item_id=book.aladin_item_id)
            .exclude(aladin_item_id__in=my_aladin_ids)
            .values("aladin_item_id")
            .annotate(reader_count=Count("owner_keycloak_sub", distinct=True))
            .order_by("-reader_count")[:PEER_BOOK_LIMIT]
        )

        results = []
        for row in aggregated:
            sample = (
                Book.objects.filter(aladin_item_id=row["aladin_item_id"])
                .order_by("-created_at")
                .first()
            )
            if not sample:
                continue
            results.append(
                {
                    "aladin_item_id": sample.aladin_item_id,
                    "title": sample.title,
                    "author": sample.author,
                    "cover_url": sample.cover_url,
                    "isbn13": sample.isbn13,
                    "publisher": sample.publisher,
                    "pub_date": sample.pub_date,
                    "total_pages": sample.total_pages,
                    "reader_count": row["reader_count"],
                }
            )

        return Response(
            {
                "unlocked": True,
                "results": PeerBookSerializer(results, many=True).data,
            }
        )

    @action(detail=True, methods=["get", "post", "delete"], url_path="share")
    def share(self, request, pk=None):
        book = self.get_object()

        if request.method == "GET":
            share_url = build_share_url(book.share_token) if book.is_shared and book.share_token else ""
            return Response(
                BookShareStatusSerializer(
                    {"is_shared": book.is_shared, "share_url": share_url},
                ).data
            )

        if request.method == "DELETE":
            book.is_shared = False
            book.save(update_fields=["is_shared"])
            return Response(
                BookShareStatusSerializer({"is_shared": False, "share_url": ""}).data
            )

        token = ensure_share_token(book)
        book.is_shared = True
        book.shared_at = timezone.now()
        book.save(update_fields=["share_token", "is_shared", "shared_at"])
        return Response(
            BookShareStatusSerializer(
                {"is_shared": True, "share_url": build_share_url(token)},
            ).data
        )


class BookQuoteViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        qs = BookQuote.objects.filter(
            book__owner_keycloak_sub=self.request.user.keycloak_sub,
        ).select_related("book")
        book_id = self.request.query_params.get("book")
        if book_id:
            qs = qs.filter(book_id=book_id)
        return qs

    def get_serializer_class(self):
        if self.action in ("create", "partial_update", "update"):
            return BookQuoteWriteSerializer
        return BookQuoteSerializer

    def create(self, request, *args, **kwargs):
        book_id = request.data.get("book")
        book = Book.objects.filter(
            id=book_id,
            owner_keycloak_sub=request.user.keycloak_sub,
        ).first()
        if not book:
            return Response({"book": ["Book not found."]}, status=status.HTTP_400_BAD_REQUEST)
        write_serializer = BookQuoteWriteSerializer(data=request.data)
        write_serializer.is_valid(raise_exception=True)
        quote = BookQuote.objects.create(book=book, **write_serializer.validated_data)
        return Response(BookQuoteSerializer(quote).data, status=status.HTTP_201_CREATED)
