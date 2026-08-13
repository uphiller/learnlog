from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request

from django.conf import settings

from board_common.internal import INTERNAL_API_KEY_HEADER


class BookServiceError(Exception):
    def __init__(self, status: int, detail: str):
        self.status = status
        self.detail = detail
        super().__init__(detail)


def fetch_member_writings(*, aladin_item_id: str, keycloak_subs: list[str]) -> list[dict]:
    if not keycloak_subs:
        return []

    query = urllib.parse.urlencode(
        {
            "aladin_item_id": aladin_item_id,
            "keycloak_subs": ",".join(keycloak_subs),
        }
    )
    url = f"{settings.BOOK_SERVICE_URL.rstrip('/')}/api/internal/member-writings/?{query}"
    request = urllib.request.Request(
        url,
        headers={INTERNAL_API_KEY_HEADER: settings.INTERNAL_API_KEY},
        method="GET",
    )

    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            payload = json.load(response)
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace") or exc.reason
        raise BookServiceError(exc.code, detail) from exc
    except urllib.error.URLError as exc:
        raise BookServiceError(503, f"Book service unavailable: {exc.reason}") from exc

    return payload.get("results", [])
