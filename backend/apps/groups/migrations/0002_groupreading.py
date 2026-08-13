import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("groups", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="GroupReading",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("aladin_item_id", models.CharField(max_length=32)),
                ("title", models.CharField(max_length=500)),
                ("author", models.CharField(max_length=500, blank=True)),
                ("cover_url", models.URLField(blank=True, max_length=500)),
                ("isbn13", models.CharField(blank=True, max_length=13)),
                ("publisher", models.CharField(blank=True, max_length=200)),
                ("pub_date", models.CharField(blank=True, max_length=32)),
                ("total_pages", models.PositiveIntegerField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "group",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="readings",
                        to="groups.group",
                    ),
                ),
                (
                    "set_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="group_readings_set",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddConstraint(
            model_name="groupreading",
            constraint=models.UniqueConstraint(
                fields=("group", "aladin_item_id"),
                name="groups_reading_group_aladin_uniq",
            ),
        ),
    ]
