from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("books", "0004_use_keycloak_sub"),
    ]

    operations = [
        migrations.AddField(
            model_name="book",
            name="is_shared",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="book",
            name="share_token",
            field=models.CharField(
                blank=True, db_index=True, max_length=32, null=True, unique=True
            ),
        ),
        migrations.AddField(
            model_name="book",
            name="shared_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
