from django.db import models


class Group(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=120, unique=True)
    created_by_keycloak_sub = models.CharField(max_length=255, db_index=True)
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
    member_keycloak_sub = models.CharField(max_length=255, db_index=True)
    role = models.CharField(max_length=16, choices=Role.choices, default=Role.MEMBER)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ACTIVE)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["group", "member_keycloak_sub"],
                name="groups_membership_group_member_uniq",
            ),
        ]
        ordering = ["joined_at"]

    def __str__(self) -> str:
        return f"{self.member_keycloak_sub}@{self.group_id} ({self.role})"


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


class GroupReading(models.Model):
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name="readings")
    aladin_item_id = models.CharField(max_length=32)
    title = models.CharField(max_length=500)
    author = models.CharField(max_length=500, blank=True)
    cover_url = models.URLField(max_length=500, blank=True)
    isbn13 = models.CharField(max_length=13, blank=True)
    publisher = models.CharField(max_length=200, blank=True)
    pub_date = models.CharField(max_length=32, blank=True)
    total_pages = models.PositiveIntegerField(null=True, blank=True)
    set_by_keycloak_sub = models.CharField(max_length=255, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["group", "aladin_item_id"],
                name="groups_reading_group_aladin_uniq",
            ),
        ]

    def __str__(self) -> str:
        return self.title


class GroupPost(models.Model):
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name="posts")
    author_keycloak_sub = models.CharField(max_length=255, db_index=True)
    title = models.CharField(max_length=200)
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.title


class GroupComment(models.Model):
    post = models.ForeignKey(GroupPost, on_delete=models.CASCADE, related_name="comments")
    author_keycloak_sub = models.CharField(max_length=255, db_index=True)
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self) -> str:
        return self.body[:50]
