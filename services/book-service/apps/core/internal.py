import os

INTERNAL_API_KEY_HEADER = "X-Internal-Api-Key"


def internal_api_key() -> str:
    return os.environ.get("INTERNAL_API_KEY", "")


def is_valid_internal_request(request) -> bool:
    expected = internal_api_key()
    if not expected:
        return False
    return request.headers.get(INTERNAL_API_KEY_HEADER) == expected
