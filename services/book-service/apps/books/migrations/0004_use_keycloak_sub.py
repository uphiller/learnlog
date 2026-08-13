from django.db import migrations, models


def copy_owner_keycloak_sub(apps, schema_editor):
    Book = apps.get_model("books", "Book")
    User = apps.get_model("users", "User")
    for book in Book.objects.all().iterator():
        if not book.owner_id:
            continue
        user = User.objects.filter(pk=book.owner_id).first()
        if user is None:
            continue
        book.owner_keycloak_sub = user.keycloak_sub
        book.save(update_fields=["owner_keycloak_sub"])


class Migration(migrations.Migration):

    dependencies = [
        ("books", "0003_book_completion_sentence"),
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="book",
            name="owner_keycloak_sub",
            field=models.CharField(db_index=True, max_length=255, null=True),
        ),
        migrations.RunPython(copy_owner_keycloak_sub, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="book",
            name="owner_keycloak_sub",
            field=models.CharField(db_index=True, max_length=255),
        ),
        migrations.RemoveConstraint(
            model_name="book",
            name="books_book_owner_aladin_item_uniq",
        ),
        migrations.RemoveField(
            model_name="book",
            name="owner",
        ),
        migrations.AddConstraint(
            model_name="book",
            constraint=models.UniqueConstraint(
                fields=("owner_keycloak_sub", "aladin_item_id"),
                name="books_book_owner_aladin_item_uniq",
            ),
        ),
        migrations.RunSQL(
            sql="DROP TABLE IF EXISTS users_user CASCADE;",
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
