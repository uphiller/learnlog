from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import BookQuoteViewSet, BookSearchView, BookViewSet, HistoryCalendarView

router = DefaultRouter()
router.register("books", BookViewSet, basename="book")
router.register("quotes", BookQuoteViewSet, basename="quote")

urlpatterns = [
    path("history/calendar/", HistoryCalendarView.as_view(), name="history-calendar"),
    path("books/search/", BookSearchView.as_view(), name="book-search"),
    path("", include(router.urls)),
]
