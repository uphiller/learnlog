"""Lightweight profanity check for user-generated text (general level)."""

from __future__ import annotations

import re
import unicodedata

# General-level blocked terms (Korean + English). Not exhaustive.
_BLOCKED_TERMS: frozenset[str] = frozenset(
    {
        # Korean
        "씨발",
        "시발",
        "씨팔",
        "시팔",
        "씨ㅂ",
        "ㅅㅂ",
        "ㅆㅂ",
        "병신",
        "븅신",
        "병쉰",
        "지랄",
        "좆",
        "좇",
        "ㅈ같",
        "존나",
        "졸라",
        "꺼져",
        "닥쳐",
        "니미",
        "느금마",
        "느금",
        "애미",
        "애비",
        "개새",
        "개쉐",
        "개색",
        "개새끼",
        "씹",
        "쌍놈",
        "쌍년",
        "걸레",
        "창녀",
        "보지",
        "자지",
        "장애인놈",
        "장애인년",
        # English
        "fuck",
        "fucking",
        "fucker",
        "shit",
        "bitch",
        "asshole",
        "bastard",
        "dick",
        "pussy",
        "cunt",
        "motherfucker",
        "nigger",
        "nigga",
    }
)

_LEET_MAP = str.maketrans(
    {
        "0": "o",
        "1": "i",
        "3": "e",
        "4": "a",
        "5": "s",
        "7": "t",
        "@": "a",
        "$": "s",
    }
)

_NON_WORD = re.compile(
    r"[^0-9a-zA-Z가-힣ㄱ-ㅎㅏ-ㅣ"
    r"\u1100-\u11FF\u3131-\u318E]+"
)

PROFANITY_ERROR = "부적절한 표현이 포함되어 있습니다."


def normalize_for_profanity(text: str) -> str:
    # NFC keeps Hangul syllables/jamo intact; NFKC would strip compatibility jamo.
    text = unicodedata.normalize("NFC", text or "")
    text = text.casefold()
    text = text.translate(_LEET_MAP)
    # Collapse separators often used to bypass filters: 시 발, s.h.i.t, ㅅ_ㅂ
    text = _NON_WORD.sub("", text)
    return text


def contains_profanity(text: str) -> bool:
    normalized = normalize_for_profanity(text)
    if not normalized:
        return False
    for term in _BLOCKED_TERMS:
        needle = normalize_for_profanity(term)
        if needle and needle in normalized:
            return True
    return False


def reject_if_profane(value: str) -> str:
    """Raise ValueError with a user-facing message when blocked terms are found."""
    if contains_profanity(value):
        raise ValueError(PROFANITY_ERROR)
    return value
