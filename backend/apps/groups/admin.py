from django.contrib import admin

from .models import Group, GroupContext, GroupMembership


@admin.register(Group)
class GroupAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "created_by", "created_at")
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(GroupMembership)
class GroupMembershipAdmin(admin.ModelAdmin):
    list_display = ("group", "user", "role", "status", "joined_at")
    list_filter = ("role", "status")


@admin.register(GroupContext)
class GroupContextAdmin(admin.ModelAdmin):
    list_display = ("group", "domain")
