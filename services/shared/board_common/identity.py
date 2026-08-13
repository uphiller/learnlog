from __future__ import annotations


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
