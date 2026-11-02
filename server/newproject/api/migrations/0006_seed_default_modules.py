from django.db import migrations

DEFAULT_MODULES = [
    "Dashboard",
    "Books",
    "User Management",
    "Role Management",
    "Reviews & Ratings",
    "Reports",
]


def seed_modules(apps, schema_editor):
    Module = apps.get_model("api", "Module")
    for name in DEFAULT_MODULES:
        Module.objects.get_or_create(module_name=name)


def unseed_modules(apps, schema_editor):
    Module = apps.get_model("api", "Module")
    Module.objects.filter(module_name__in=DEFAULT_MODULES).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0005_userprofile_created_by"),
    ]

    operations = [
        migrations.RunPython(seed_modules, unseed_modules),
    ]
