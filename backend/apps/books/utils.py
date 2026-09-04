import re

PEER_QUOTE_LIMIT = 3
PEER_BOOK_LIMIT = 3


def parse_page_number(page: str) -> int | None:
    if not page:
        return None
    match = re.search(r"\d+", page)
    if not match:
        return None
    try:
        n = int(match.group())
    except ValueError:
        return None
    return n if n > 0 else None


def get_read_page(book) -> int | None:
    pages = [parse_page_number(q.page) for q in book.quotes.all()]
    pages = [p for p in pages if p is not None]
    return max(pages) if pages else None


def is_book_finished(book) -> bool:
    return bool(str(getattr(book, "completion_sentence", "") or "").strip())
