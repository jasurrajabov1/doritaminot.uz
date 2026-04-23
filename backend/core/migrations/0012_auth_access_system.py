from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


PAGE_CHOICES = [
    ("dashboard", "Бош саҳифа"),
    ("institutions", "Муассасалар"),
    ("drugs", "Дорилар"),
    ("prices", "Нархлар"),
    ("need_rows", "Эҳтиёж"),
    ("monthly_issues", "Берилган миқдор"),
    ("stock_summary", "Омбор қолдиғи"),
    ("need_rows_summary", "Эҳтиёжлар сводкаси"),
    ("access_management", "Фойдаланувчилар ва доступ"),
]


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("core", "0011_remove_annuallimit_drug_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="Role",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=120, unique=True)),
                ("description", models.TextField(blank=True, null=True)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ["name"]},
        ),
        migrations.CreateModel(
            name="UserProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "role",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="user_profiles",
                        to="core.role",
                    ),
                ),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="profile",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"ordering": ["user__username"]},
        ),
        migrations.CreateModel(
            name="PagePermission",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("page_code", models.CharField(choices=PAGE_CHOICES, max_length=64)),
                ("can_view", models.BooleanField(default=False)),
                ("can_add", models.BooleanField(default=False)),
                ("can_edit", models.BooleanField(default=False)),
                ("can_delete", models.BooleanField(default=False)),
                ("can_export", models.BooleanField(default=False)),
                ("can_print", models.BooleanField(default=False)),
                ("can_manage_access", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "role",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="page_permissions",
                        to="core.role",
                    ),
                ),
            ],
            options={"ordering": ["role__name", "page_code"]},
        ),
        migrations.CreateModel(
            name="UserPagePermissionOverride",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("page_code", models.CharField(choices=PAGE_CHOICES, max_length=64)),
                ("can_view", models.BooleanField(blank=True, null=True)),
                ("can_add", models.BooleanField(blank=True, null=True)),
                ("can_edit", models.BooleanField(blank=True, null=True)),
                ("can_delete", models.BooleanField(blank=True, null=True)),
                ("can_export", models.BooleanField(blank=True, null=True)),
                ("can_print", models.BooleanField(blank=True, null=True)),
                ("can_manage_access", models.BooleanField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="page_permission_overrides",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"ordering": ["user__username", "page_code"]},
        ),
        migrations.AddConstraint(
            model_name="pagepermission",
            constraint=models.UniqueConstraint(fields=("role", "page_code"), name="uniq_role_page_permission"),
        ),
        migrations.AddConstraint(
            model_name="userpagepermissionoverride",
            constraint=models.UniqueConstraint(fields=("user", "page_code"), name="uniq_user_page_permission_override"),
        ),
    ]
