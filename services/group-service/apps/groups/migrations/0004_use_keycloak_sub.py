from django.db import migrations, models


def copy_keycloak_subs(apps, schema_editor):
    User = apps.get_model("users", "User")

    Group = apps.get_model("groups", "Group")
    for group in Group.objects.all().iterator():
        if not group.created_by_id:
            continue
        user = User.objects.filter(pk=group.created_by_id).first()
        if user is None:
            continue
        group.created_by_keycloak_sub = user.keycloak_sub
        group.save(update_fields=["created_by_keycloak_sub"])

    GroupMembership = apps.get_model("groups", "GroupMembership")
    for membership in GroupMembership.objects.all().iterator():
        if not membership.user_id:
            continue
        user = User.objects.filter(pk=membership.user_id).first()
        if user is None:
            continue
        membership.member_keycloak_sub = user.keycloak_sub
        membership.save(update_fields=["member_keycloak_sub"])

    GroupReading = apps.get_model("groups", "GroupReading")
    for reading in GroupReading.objects.all().iterator():
        if not reading.set_by_id:
            continue
        user = User.objects.filter(pk=reading.set_by_id).first()
        if user is None:
            continue
        reading.set_by_keycloak_sub = user.keycloak_sub
        reading.save(update_fields=["set_by_keycloak_sub"])

    GroupPost = apps.get_model("groups", "GroupPost")
    for post in GroupPost.objects.all().iterator():
        if not post.author_id:
            continue
        user = User.objects.filter(pk=post.author_id).first()
        if user is None:
            continue
        post.author_keycloak_sub = user.keycloak_sub
        post.save(update_fields=["author_keycloak_sub"])

    GroupComment = apps.get_model("groups", "GroupComment")
    for comment in GroupComment.objects.all().iterator():
        if not comment.author_id:
            continue
        user = User.objects.filter(pk=comment.author_id).first()
        if user is None:
            continue
        comment.author_keycloak_sub = user.keycloak_sub
        comment.save(update_fields=["author_keycloak_sub"])


class Migration(migrations.Migration):

    dependencies = [
        ("groups", "0003_grouppost_groupcomment"),
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="group",
            name="created_by_keycloak_sub",
            field=models.CharField(db_index=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name="groupmembership",
            name="member_keycloak_sub",
            field=models.CharField(db_index=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name="groupreading",
            name="set_by_keycloak_sub",
            field=models.CharField(db_index=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name="grouppost",
            name="author_keycloak_sub",
            field=models.CharField(db_index=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name="groupcomment",
            name="author_keycloak_sub",
            field=models.CharField(db_index=True, max_length=255, null=True),
        ),
        migrations.RunPython(copy_keycloak_subs, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="group",
            name="created_by_keycloak_sub",
            field=models.CharField(db_index=True, max_length=255),
        ),
        migrations.AlterField(
            model_name="groupmembership",
            name="member_keycloak_sub",
            field=models.CharField(db_index=True, max_length=255),
        ),
        migrations.AlterField(
            model_name="groupreading",
            name="set_by_keycloak_sub",
            field=models.CharField(db_index=True, max_length=255),
        ),
        migrations.AlterField(
            model_name="grouppost",
            name="author_keycloak_sub",
            field=models.CharField(db_index=True, max_length=255),
        ),
        migrations.AlterField(
            model_name="groupcomment",
            name="author_keycloak_sub",
            field=models.CharField(db_index=True, max_length=255),
        ),
        migrations.RemoveConstraint(
            model_name="groupmembership",
            name="groups_membership_group_user_uniq",
        ),
        migrations.RemoveField(
            model_name="group",
            name="created_by",
        ),
        migrations.RemoveField(
            model_name="groupmembership",
            name="user",
        ),
        migrations.RemoveField(
            model_name="groupreading",
            name="set_by",
        ),
        migrations.RemoveField(
            model_name="grouppost",
            name="author",
        ),
        migrations.RemoveField(
            model_name="groupcomment",
            name="author",
        ),
        migrations.AddConstraint(
            model_name="groupmembership",
            constraint=models.UniqueConstraint(
                fields=("group", "member_keycloak_sub"),
                name="groups_membership_group_member_uniq",
            ),
        ),
        migrations.RunSQL(
            sql="DROP TABLE IF EXISTS users_user CASCADE;",
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
