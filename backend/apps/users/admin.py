from django.contrib import admin

from .models import User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("keycloak_sub", "email", "display_name", "created_at")
    search_fields = ("keycloak_sub", "email", "display_name")
    ordering = ("-created_at",)
    fieldsets = (
        (None, {"fields": ("keycloak_sub", "email", "display_name", "is_active")}),
    )
