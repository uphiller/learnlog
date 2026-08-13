"""
Django settings for user-service.
"""

import os
from pathlib import Path

from board_common.django_settings import cors_config, database_config, rest_framework_config

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get(
    "DJANGO_SECRET_KEY",
    "django-insecure-dev-only-change-in-production",
)

DEBUG = os.environ.get("DJANGO_DEBUG", "true").lower() in ("1", "true", "yes")

ALLOWED_HOSTS = os.environ.get(
    "DJANGO_ALLOWED_HOSTS",
    "localhost,127.0.0.1,user-service",
).split(",")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "drf_spectacular",
    "apps.core",
    "apps.users",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = database_config()

AUTH_USER_MODEL = "users.User"
AUTH_PASSWORD_VALIDATORS = []

LANGUAGE_CODE = "ko-kr"
TIME_ZONE = "Asia/Seoul"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = rest_framework_config()
REST_FRAMEWORK["DEFAULT_AUTHENTICATION_CLASSES"] = [
    "apps.users.authentication.KeycloakGatewayAuthentication",
    "apps.users.authentication.KeycloakJWTAuthentication",
]

INTERNAL_API_KEY = os.environ.get("INTERNAL_API_KEY", "")

SPECTACULAR_SETTINGS = {
    "TITLE": "User Service API",
    "DESCRIPTION": "User profile API (Keycloak + Kong)",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

globals().update(cors_config())

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
