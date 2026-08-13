from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    def create_gateway_user(self, keycloak_sub: str, email: str = "", display_name: str = ""):
        user = self.model(
            keycloak_sub=keycloak_sub,
            email=email or "",
            display_name=display_name or email or keycloak_sub,
        )
        user.set_unusable_password()
        user.save(using=self._db)
        return user


class User(AbstractBaseUser):
    keycloak_sub = models.CharField(max_length=255, unique=True, db_index=True)
    email = models.EmailField(blank=True, default="")
    display_name = models.CharField(max_length=255, blank=True, default="")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD = "keycloak_sub"
    REQUIRED_FIELDS: list[str] = []

    def __str__(self) -> str:
        return self.display_name or self.email or self.keycloak_sub
