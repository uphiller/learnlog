from django.contrib import admin

from .models import Group, GroupComment, GroupContext, GroupMembership, GroupPost, GroupReading


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


@admin.register(GroupReading)
class GroupReadingAdmin(admin.ModelAdmin):
    list_display = ("title", "group", "set_by", "created_at")
    search_fields = ("title", "group__name")


@admin.register(GroupPost)
class GroupPostAdmin(admin.ModelAdmin):
    list_display = ("title", "group", "author", "created_at")
    search_fields = ("title", "group__name")


@admin.register(GroupComment)
class GroupCommentAdmin(admin.ModelAdmin):
    list_display = ("post", "author", "created_at")
    search_fields = ("body", "post__title")
