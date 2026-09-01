from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .internal_views import MemberWritingsView
from .share_views import BookShareOgImageView, BookSharePreviewView, BookSharePublicView
from .views import BookQuoteViewSet, BookSearchView, BookViewSet, HistoryCalendarView

router = DefaultRouter()
router.register("books", BookViewSet, basename="book")
router.register("quotes", BookQuoteViewSet, basename="quote")

urlpatterns = [
    path(
        "books/share/<str:token>/preview/",
        BookSharePreviewView.as_view(),
        name="book-share-preview",
    ),
    path(
        "books/share/<str:token>/og-image/",
        BookShareOgImageView.as_view(),
        name="book-share-og-image",
    ),
    path(
        "books/share/<str:token>/",
        BookSharePublicView.as_view(),
        name="book-share-public",
    ),
    path(
        "internal/member-writings/",
        MemberWritingsView.as_view(),
        name="internal-member-writings",
    ),
    path("history/calendar/", HistoryCalendarView.as_view(), name="history-calendar"),
    path("books/search/", BookSearchView.as_view(), name="book-search"),
    path("", include(router.urls)),
]
