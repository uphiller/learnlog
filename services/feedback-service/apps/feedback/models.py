from django.db import models


class FeatureRequest(models.Model):
    class Status(models.TextChoices):
        OPEN = "open", "접수"
        PLANNED = "planned", "검토/예정"
        IN_PROGRESS = "in_progress", "진행 중"
        DONE = "done", "반영됨"
        DECLINED = "declined", "보류"

    author_keycloak_sub = models.CharField(max_length=255, db_index=True)
    title = models.CharField(max_length=200)
    body = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.OPEN,
        db_index=True,
    )
    vote_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-vote_count", "-created_at"]

    def __str__(self) -> str:
        return self.title


class FeatureRequestComment(models.Model):
    request = models.ForeignKey(
        FeatureRequest,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    author_keycloak_sub = models.CharField(max_length=255, db_index=True)
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self) -> str:
        return self.body[:50]


class FeatureRequestVote(models.Model):
    request = models.ForeignKey(
        FeatureRequest,
        on_delete=models.CASCADE,
        related_name="votes",
    )
    voter_keycloak_sub = models.CharField(max_length=255, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["request", "voter_keycloak_sub"],
                name="feedback_vote_request_voter_uniq",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.voter_keycloak_sub}@{self.request_id}"
