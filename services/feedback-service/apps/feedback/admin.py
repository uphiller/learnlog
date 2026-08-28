from django.contrib import admin

from .models import FeatureRequest, FeatureRequestComment, FeatureRequestVote


@admin.register(FeatureRequest)
class FeatureRequestAdmin(admin.ModelAdmin):
    list_display = ("title", "status", "vote_count", "author_keycloak_sub", "created_at")
    list_filter = ("status",)
    search_fields = ("title", "body", "author_keycloak_sub")


@admin.register(FeatureRequestComment)
class FeatureRequestCommentAdmin(admin.ModelAdmin):
    list_display = ("request", "author_keycloak_sub", "created_at")
    search_fields = ("body", "request__title")


@admin.register(FeatureRequestVote)
class FeatureRequestVoteAdmin(admin.ModelAdmin):
    list_display = ("request", "voter_keycloak_sub", "created_at")
    search_fields = ("voter_keycloak_sub", "request__title")
