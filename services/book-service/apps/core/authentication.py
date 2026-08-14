from __future__ import annotations

import json
import os
import time
import urllib.request
from typing import Any

import jwt
from rest_framework.authentication import BaseAuthentication, get_authorization_header
from rest_framework.exceptions import AuthenticationFailed

HEADER_SUB = "HTTP_X_USER_SUB"
HEADER_EMAIL = "HTTP_X_USER_EMAIL"
HEADER_NAME = "HTTP_X_USER_NAME"

_jwks_cache: dict[str, Any] | None = None
_jwks_fetched_at: float = 0.0
JWKS_TTL_SECONDS = 300


class AuthenticatedIdentity:
    """Lightweight request identity for services without a local User table."""

    def __init__(self, keycloak_sub: str, email: str = "", display_name: str = ""):
        self.keycloak_sub = keycloak_sub
        self.email = email
        self.display_name = display_name or email or keycloak_sub
        self.is_authenticated = True
        self.is_active = True
        self.pk = None

    def __str__(self) -> str:
        return self.display_name


def _keycloak_issuer() -> str:
    return os.environ.get("KEYCLOAK_ISSUER", "https://auth.bettercodelab.com/realms/board")


def _jwks_url() -> str:
    return os.environ.get(
        "KEYCLOAK_JWKS_URL",
        f"{_keycloak_issuer()}/protocol/openid-connect/certs",
    )


def _get_jwks() -> dict[str, Any]:
    global _jwks_cache, _jwks_fetched_at
    now = time.time()
    if _jwks_cache and now - _jwks_fetched_at < JWKS_TTL_SECONDS:
        return _jwks_cache
    with urllib.request.urlopen(_jwks_url(), timeout=5) as resp:
        _jwks_cache = json.load(resp)
    _jwks_fetched_at = now
    return _jwks_cache


def _claims_from_token(token: str) -> dict[str, Any]:
    header = jwt.get_unverified_header(token)
    jwks = _get_jwks()
    kid = header.get("kid")
    keys = jwks.get("keys", [])
    key_data = next((k for k in keys if k.get("kid") == kid), None)
    if not key_data and keys:
        key_data = keys[0]
    if not key_data:
        raise AuthenticationFailed("Unable to find JWT signing key.")

    public_key = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(key_data))
    return jwt.decode(
        token,
        public_key,
        algorithms=["RS256"],
        issuer=_keycloak_issuer(),
        options={"verify_aud": False},
    )


def identity_from_claims(claims: dict[str, Any]) -> AuthenticatedIdentity:
    sub = claims.get("sub") or claims.get("preferred_username") or claims.get("sid")
    if not sub:
        raise AuthenticationFailed("Token missing subject claim.")
    email = claims.get("email", "")
    display_name = claims.get("name") or claims.get("preferred_username") or email or sub
    return AuthenticatedIdentity(keycloak_sub=sub, email=email, display_name=display_name)


class KeycloakGatewayAuthentication(BaseAuthentication):
    """
    Trust identity headers injected by Kong after JWT validation.
    Never accept these headers from clients directly (Kong must strip them).
    """

    def authenticate(self, request):
        sub = request.META.get(HEADER_SUB)
        if not sub:
            return None

        email = request.META.get(HEADER_EMAIL, "")
        display_name = request.META.get(HEADER_NAME, "") or email
        return (AuthenticatedIdentity(keycloak_sub=sub, email=email, display_name=display_name), None)


class KeycloakJWTAuthentication(BaseAuthentication):
    """
    Validate Keycloak Bearer JWT when gateway identity headers are not present.
    Kong still validates JWT at the edge; this backs up identity inside the private network.
    """

    def authenticate(self, request):
        if request.META.get(HEADER_SUB):
            return None

        auth = get_authorization_header(request).split()
        if not auth or auth[0].lower() != b"bearer":
            return None
        if len(auth) != 2:
            raise AuthenticationFailed("Invalid Authorization header.")

        token = auth[1].decode("utf-8")
        try:
            claims = _claims_from_token(token)
        except jwt.PyJWTError as exc:
            raise AuthenticationFailed("Invalid token.") from exc

        return (identity_from_claims(claims), None)
