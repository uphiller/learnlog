from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("books", "0002_book_total_pages"),
    ]

    operations = [
        migrations.AddField(
            model_name="book",
            name="completion_sentence",
            field=models.CharField(blank=True, max_length=500),
        ),
    ]
