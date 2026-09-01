from __future__ import annotations

import secrets
from html import escape

from django.conf import settings
from django.utils import timezone

from .models import Book

DEFAULT_OG_IMAGE = "https://book.bettercodelab.com/og-image.png"
OG_DESCRIPTION_FALLBACK = "of.me 북로그에서 읽은 책"


def book_public_origin() -> str:
    return getattr(settings, "BOOK_PUBLIC_ORIGIN", "https://book.bettercodelab.com").rstrip("/")


def ensure_share_token(book: Book) -> str:
    if not book.share_token:
        book.share_token = secrets.token_urlsafe(16)
    return book.share_token


def build_share_url(token: str) -> str:
    return f"{book_public_origin()}/share/{token}"


def get_shared_book(token: str) -> Book | None:
    return (
        Book.objects.filter(share_token=token, is_shared=True)
        .prefetch_related("quotes")
        .first()
    )


def share_og_image_url(token: str) -> str:
    return f"{book_public_origin()}/api/books/share/{token}/og-image/"


def share_description(book: Book) -> str:
    completion = (book.completion_sentence or "").strip()
    if completion:
        return f"「{completion}」"
    first_quote = book.quotes.order_by("created_at").first()
    if first_quote:
        text = first_quote.quote.strip()
        if len(text) > 120:
            text = text[:120] + "…"
        return text
    return OG_DESCRIPTION_FALLBACK


def share_og_title(book: Book) -> str:
    title = book.title.strip()
    author = (book.author or "").strip()
    if author:
        return f"{title} · {author}"
    return title


def share_cover_image_url(book: Book) -> str:
    cover = (book.cover_url or "").strip()
    if cover.startswith("https://"):
        return cover
    return DEFAULT_OG_IMAGE


def render_share_preview_html(
    *,
    book: Book,
    token: str,
    share_url: str,
    og_image_url: str,
) -> str:
    og_title = escape(share_og_title(book))
    description = escape(share_description(book))
    page_title = escape(f"{share_og_title(book)} · of.me")
    safe_share_url = escape(share_url)
    safe_og_image = escape(og_image_url)
    safe_cover = escape(share_cover_image_url(book))
    image_alt = escape(f"{book.title.strip()} 표지")

    return f"""<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <title>{page_title}</title>
  <meta name="description" content="{description}" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="of.me" />
  <meta property="og:locale" content="ko_KR" />
  <meta property="og:url" content="{safe_share_url}" />
  <meta property="og:title" content="{og_title}" />
  <meta property="og:description" content="{description}" />
  <meta property="og:image" content="{safe_cover}" />
  <meta property="og:image:alt" content="{image_alt}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{og_title}" />
  <meta name="twitter:description" content="{description}" />
  <meta name="twitter:image" content="{safe_cover}" />
  <link rel="canonical" href="{safe_share_url}" />
</head>
<body>
  <p>{og_title}</p>
</body>
</html>
"""
