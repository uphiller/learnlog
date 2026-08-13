from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("books", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="book",
            name="total_pages",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
    ]
