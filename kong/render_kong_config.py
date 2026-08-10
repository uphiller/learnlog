#!/usr/bin/env python3
"""Fetch Keycloak JWKS and render kong.yml from template."""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request
from base64 import urlsafe_b64decode

JWKS_URL = os.environ.get(
    "KEYCLOAK_JWKS_URL",
    "http://keycloak:8080/realms/board/protocol/openid-connect/certs",
)
ISSUER = os.environ.get(
    "KEYCLOAK_ISSUER",
    "https://auth.bettercodelab.com/realms/board",
)
TEMPLATE = os.environ.get("KONG_TEMPLATE", "/kong/kong.yml.template")
OUTPUT = os.environ.get("KONG_DECLARATIVE_CONFIG", "/tmp/kong.yml")


def b64url_to_int(data: str) -> int:
    padded = data + "=" * (-len(data) % 4)
    return int.from_bytes(urlsafe_b64decode(padded), "big")


def jwk_to_pem(jwk: dict) -> str:
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.hazmat.primitives import serialization

    n = b64url_to_int(jwk["n"])
    e = b64url_to_int(jwk["e"])
    public_key = rsa.RSAPublicNumbers(e, n).public_key()
    pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    return pem.decode("utf-8")


def fetch_jwks(url: str, retries: int = 60, delay: float = 2.0) -> dict:
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(url, timeout=5) as resp:
                return json.load(resp)
        except (urllib.error.URLError, TimeoutError) as exc:
            if attempt == retries - 1:
                raise SystemExit(f"Failed to fetch JWKS from {url}: {exc}") from exc
            time.sleep(delay)
    raise SystemExit("unreachable")


def pick_signing_jwk(jwks: dict) -> dict:
    keys = jwks.get("keys", [])
    sig_rsa = [
        k
        for k in keys
        if k.get("kty") == "RSA" and k.get("use", "sig") == "sig"
    ]
    if sig_rsa:
        for k in sig_rsa:
            if k.get("alg") in (None, "RS256"):
                return k
        return sig_rsa[0]
    rsa = [k for k in keys if k.get("kty") == "RSA"]
    if not rsa:
        raise SystemExit("No RSA keys in JWKS")
    return rsa[0]


def main() -> None:
    jwks = fetch_jwks(JWKS_URL)
    pem = jwk_to_pem(pick_signing_jwk(jwks))
    indented_pem = "\n".join(f"          {line}" for line in pem.splitlines())
    with open(TEMPLATE, encoding="utf-8") as f:
        template = f.read()

    rendered = template.replace("__JWT_ISSUER__", ISSUER).replace(
        "__JWT_RSA_INDENTED__", indented_pem
    )

    pem_path = os.environ.get("JWT_PUBLIC_KEY_PATH", "/tmp/jwt_public.pem")
    with open(pem_path, "w", encoding="utf-8") as f:
        f.write(pem)

    with open(OUTPUT, "w", encoding="utf-8") as f:
        f.write(rendered)

    print(f"Wrote Kong config to {OUTPUT}", file=sys.stderr)


if __name__ == "__main__":
    main()
