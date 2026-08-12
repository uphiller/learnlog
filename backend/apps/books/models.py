from django.conf import settings
from django.db import models


class Book(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="books",
    )
    aladin_item_id = models.CharField(max_length=32)
    title = models.CharField(max_length=500)
    author = models.CharField(max_length=500, blank=True)
    cover_url = models.URLField(max_length=500, blank=True)
    isbn13 = models.CharField(max_length=13, blank=True)
    publisher = models.CharField(max_length=200, blank=True)
    pub_date = models.CharField(max_length=32, blank=True)
    total_pages = models.PositiveIntegerField(null=True, blank=True)
    completion_sentence = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["owner", "aladin_item_id"],
                name="books_book_owner_aladin_item_uniq",
            ),
        ]

    def __str__(self) -> str:
        return self.title


class BookQuote(models.Model):
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name="quotes")
    quote = models.TextField()
    memo = models.TextField(blank=True)
    page = models.CharField(max_length=32, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.quote[:50]
