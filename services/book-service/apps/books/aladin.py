import json
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

ALADIN_ITEM_SEARCH_URL = "http://www.aladin.co.kr/ttb/api/ItemSearch.aspx"
ALADIN_ITEM_LOOKUP_URL = "http://www.aladin.co.kr/ttb/api/ItemLookUp.aspx"
ALADIN_API_VERSION = "20131101"


class AladinError(Exception):
    pass


def _normalize_items(payload: dict[str, Any]) -> list[dict[str, Any]]:
    item = payload.get("item")
    if not item:
        return []
    if isinstance(item, list):
        return item
    return [item]


def _fetch_aladin_json(url: str) -> dict[str, Any]:
    request = urllib.request.Request(url, headers={"User-Agent": "board-platform/1.0"})
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            raw = response.read().decode("utf-8")
    except urllib.error.URLError as exc:
        raise AladinError(f"Aladin request failed: {exc}") from exc

    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise AladinError("Invalid JSON from Aladin") from exc


def _extract_total_pages(item: dict[str, Any]) -> int | None:
    sub_info = item.get("subInfo") or {}
    page = sub_info.get("itemPage")
    if page is None or page == "":
        return None
    try:
        pages = int(page)
    except (TypeError, ValueError):
        return None
    return pages if pages > 0 else None


def item_to_search_hit(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "aladin_item_id": str(item.get("itemId", "")),
        "title": item.get("title", "") or "",
        "author": item.get("author", "") or "",
        "cover_url": item.get("cover", "") or "",
        "isbn13": item.get("isbn13", "") or "",
        "publisher": item.get("publisher", "") or "",
        "pub_date": item.get("pubDate", "") or "",
        "total_pages": _extract_total_pages(item),
    }


def lookup_total_pages(ttb_key: str, aladin_item_id: str) -> int | None:
    if not ttb_key:
        raise AladinError("ALADIN_TTB_KEY is not configured")
    item_id = str(aladin_item_id).strip()
    if not item_id:
        return None

    params = {
        "TTBKey": ttb_key,
        "ItemId": item_id,
        "ItemIdType": "ItemId",
        "Output": "JS",
        "Version": ALADIN_API_VERSION,
    }
    url = f"{ALADIN_ITEM_LOOKUP_URL}?{urllib.parse.urlencode(params)}"
    payload = _fetch_aladin_json(url)
    item = payload.get("item")
    if not item:
        return None
    if isinstance(item, list):
        item = item[0] if item else {}
    return _extract_total_pages(item)


def search_books(
    ttb_key: str,
    query: str,
    *,
    start: int = 1,
    max_results: int = 20,
) -> list[dict[str, Any]]:
    if not ttb_key:
        raise AladinError("ALADIN_TTB_KEY is not configured")
    query = query.strip()
    if not query:
        return []

    params = {
        "TTBKey": ttb_key,
        "Query": query,
        "QueryType": "Keyword",
        "SearchTarget": "Book",
        "Start": max(1, start),
        "MaxResults": min(max(1, max_results), 50),
        "Cover": "MidBig",
        "Output": "JS",
        "Version": ALADIN_API_VERSION,
    }
    url = f"{ALADIN_ITEM_SEARCH_URL}?{urllib.parse.urlencode(params)}"
    payload = _fetch_aladin_json(url)
    return [item_to_search_hit(item) for item in _normalize_items(payload)]
