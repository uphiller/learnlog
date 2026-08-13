from django.conf import settings
from django.db import models


class Group(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=120, unique=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="created_groups",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.name


class GroupMembership(models.Model):
    class Role(models.TextChoices):
        OWNER = "owner", "Owner"
        ADMIN = "admin", "Admin"
        MEMBER = "member", "Member"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        PENDING = "pending", "Pending"
        BANNED = "banned", "Banned"

    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="group_memberships",
    )
    role = models.CharField(max_length=16, choices=Role.choices, default=Role.MEMBER)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ACTIVE)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["group", "user"], name="groups_membership_group_user_uniq"),
        ]
        ordering = ["joined_at"]

    def __str__(self) -> str:
        return f"{self.user_id}@{self.group_id} ({self.role})"


class GroupContext(models.Model):
    class Domain(models.TextChoices):
        BOOK = "book", "Book"
        RUN = "run", "Run"

    group = models.OneToOneField(Group, on_delete=models.CASCADE, related_name="context")
    domain = models.CharField(max_length=16, choices=Domain.choices)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["group", "domain"], name="groups_context_group_domain_uniq"),
        ]

    def __str__(self) -> str:
        return f"{self.group_id}:{self.domain}"
