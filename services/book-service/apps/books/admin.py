from django.contrib import admin

from .models import Book, BookQuote


@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = ("title", "author", "owner_keycloak_sub", "created_at")
    search_fields = ("title", "author", "isbn13")


@admin.register(BookQuote)
class BookQuoteAdmin(admin.ModelAdmin):
    list_display = ("book", "quote", "created_at")
    search_fields = ("quote", "memo")
