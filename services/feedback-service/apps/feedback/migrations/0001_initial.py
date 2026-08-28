# Generated manually for feedback-service

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="FeatureRequest",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("author_keycloak_sub", models.CharField(db_index=True, max_length=255)),
                ("title", models.CharField(max_length=200)),
                ("body", models.TextField()),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("open", "접수"),
                            ("planned", "검토/예정"),
                            ("in_progress", "진행 중"),
                            ("done", "반영됨"),
                            ("declined", "보류"),
                        ],
                        db_index=True,
                        default="open",
                        max_length=20,
                    ),
                ),
                ("vote_count", models.PositiveIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["-vote_count", "-created_at"],
            },
        ),
        migrations.CreateModel(
            name="FeatureRequestComment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("author_keycloak_sub", models.CharField(db_index=True, max_length=255)),
                ("body", models.TextField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "request",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="comments",
                        to="feedback.featurerequest",
                    ),
                ),
            ],
            options={
                "ordering": ["created_at"],
            },
        ),
        migrations.CreateModel(
            name="FeatureRequestVote",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("voter_keycloak_sub", models.CharField(db_index=True, max_length=255)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "request",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="votes",
                        to="feedback.featurerequest",
                    ),
                ),
            ],
        ),
        migrations.AddConstraint(
            model_name="featurerequestvote",
            constraint=models.UniqueConstraint(
                fields=("request", "voter_keycloak_sub"),
                name="feedback_vote_request_voter_uniq",
            ),
        ),
    ]
