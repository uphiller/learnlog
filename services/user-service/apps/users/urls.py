from django.urls import path

from .internal_views import InternalUsersView
from .views import MeView

urlpatterns = [
    path("users/me/", MeView.as_view(), name="users-me"),
    path("internal/users/", InternalUsersView.as_view(), name="internal-users"),
]
