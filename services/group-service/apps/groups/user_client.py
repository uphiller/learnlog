from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request

from django.conf import settings

from board_common.internal import INTERNAL_API_KEY_HEADER


class UserServiceError(Exception):
    def __init__(self, status: int, detail: str):
        self.status = status
        self.detail = detail
        super().__init__(detail)


def fetch_users_by_sub(*, keycloak_subs: list[str]) -> list[dict]:
    if not keycloak_subs:
        return []

    query = urllib.parse.urlencode({"keycloak_subs": ",".join(keycloak_subs)})
    url = f"{settings.USER_SERVICE_URL.rstrip('/')}/api/internal/users/?{query}"
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
        raise UserServiceError(exc.code, detail) from exc
    except urllib.error.URLError as exc:
        raise UserServiceError(503, f"User service unavailable: {exc.reason}") from exc

    return payload.get("results", [])


def user_profiles_for_subs(keycloak_subs: list[str]) -> dict[str, dict]:
    unique_subs = list(dict.fromkeys(sub for sub in keycloak_subs if sub))
    if not unique_subs:
        return {}

    try:
        results = fetch_users_by_sub(keycloak_subs=unique_subs)
    except UserServiceError:
        return {sub: {"keycloak_sub": sub, "display_name": sub, "email": ""} for sub in unique_subs}

    profiles = {item["keycloak_sub"]: item for item in results}
    for sub in unique_subs:
        profiles.setdefault(sub, {"keycloak_sub": sub, "display_name": sub, "email": ""})
    return profiles


def display_name_for_sub(profiles: dict[str, dict], keycloak_sub: str) -> str:
    profile = profiles.get(keycloak_sub, {})
    return profile.get("display_name") or keycloak_sub
