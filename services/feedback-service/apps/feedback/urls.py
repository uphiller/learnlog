from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import FeatureRequestViewSet

router = DefaultRouter()
router.register("feedback/requests", FeatureRequestViewSet, basename="feedback-request")

urlpatterns = [
    path("", include(router.urls)),
]
