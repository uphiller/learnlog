import os


def env_list(name: str, default: str) -> list[str]:
    return os.environ.get(name, default).split(",")


def database_config() -> dict:
    config = {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("POSTGRES_DB", "board"),
        "USER": os.environ.get("POSTGRES_USER", "board"),
        "PASSWORD": os.environ.get("POSTGRES_PASSWORD", "board"),
        "HOST": os.environ.get("POSTGRES_HOST", "localhost"),
        "PORT": os.environ.get("POSTGRES_PORT", "5432"),
    }
    schema = os.environ.get("POSTGRES_SCHEMA", "").strip()
    options: dict[str, str] = {}
    if schema:
        options["options"] = f'-c search_path="{schema}",public'
    sslmode = os.environ.get("POSTGRES_SSLMODE", "").strip()
    if sslmode:
        options["sslmode"] = sslmode
    if options:
        config["OPTIONS"] = options
    return {"default": config}


def rest_framework_config() -> dict:
    return {
        "DEFAULT_AUTHENTICATION_CLASSES": [
            "apps.users.authentication.KeycloakGatewayAuthentication",
            "apps.users.authentication.KeycloakJWTAuthentication",
        ],
        "DEFAULT_PERMISSION_CLASSES": [
            "rest_framework.permissions.IsAuthenticated",
        ],
        "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
        "PAGE_SIZE": 10,
        "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    }


def cors_config() -> dict:
    return {
        "CORS_ALLOWED_ORIGINS": env_list(
            "CORS_ALLOWED_ORIGINS",
            "https://log.bettercodelab.com,https://board.bettercodelab.com,http://localhost:5173,http://localhost:8000",
        ),
        "CORS_ALLOW_CREDENTIALS": True,
    }
