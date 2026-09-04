from __future__ import annotations

import re
import secrets
from html import escape

from django.conf import settings
from django.utils import timezone

from .models import Book

DEFAULT_OG_IMAGE = "https://book.bettercodelab.com/og-image.png"
OG_DESCRIPTION_FALLBACK = "of.me 북로그에서 읽은 책"
OG_SHARE_CTA = "나만의 독서 기록을 남겨 보세요."
OG_DESCRIPTION_MAX_LEN = 140
_ALADIN_COVER_SIZE_RE = re.compile(r"/cover\d+/")


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


def _normalize_og_text(text: str) -> str:
    return " ".join(text.split())


def share_description(book: Book) -> str:
    completion = _normalize_og_text(book.completion_sentence or "")
    if completion:
        body = f"「{completion}」"
    else:
        first_quote = book.quotes.order_by("created_at").first()
        if first_quote:
            body = _normalize_og_text(first_quote.quote)
        else:
            body = OG_DESCRIPTION_FALLBACK

    # Keep CTA intact; trim body so Kakao previews are less likely to cut mid-CTA.
    prefix = f"{OG_SHARE_CTA} "
    max_body = max(0, OG_DESCRIPTION_MAX_LEN - len(prefix))
    if len(body) > max_body:
        body = body[: max(0, max_body - 1)] + "…" if max_body > 0 else ""
    return f"{prefix}{body}".strip()


def share_og_title(book: Book) -> str:
    title = book.title.strip()
    author = (book.author or "").strip()
    if author:
        return f"{title} · {author}"
    return title


def share_cover_image_url(book: Book) -> str:
    cover = (book.cover_url or "").strip()
    if not cover.startswith("https://"):
        return DEFAULT_OG_IMAGE
    if "image.aladin.co.kr" in cover:
        return _ALADIN_COVER_SIZE_RE.sub("/cover500/", cover)
    return cover


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
