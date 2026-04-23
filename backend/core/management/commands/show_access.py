from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from core.models import PagePermission, UserPagePermissionOverride

User = get_user_model()

PERMISSION_FIELDS = [
    ("can_view", "view"),
    ("can_add", "add"),
    ("can_edit", "edit"),
    ("can_delete", "delete"),
    ("can_export", "export"),
    ("can_print", "print"),
    ("can_manage_access", "manage_access"),
]


def get_enabled_flags(obj):
    return [label for field, label in PERMISSION_FIELDS if getattr(obj, field, False)]


class Command(BaseCommand):
    help = "User -> role -> access маълумотларини кўрсатади."

    def add_arguments(self, parser):
        parser.add_argument(
            "--username",
            type=str,
            default="",
            help="Фақат битта user бўйича кўрсатиш",
        )

    def handle(self, *args, **options):
        username = options["username"].strip()

        users = User.objects.all().order_by("username")
        if username:
            users = users.filter(username=username)

        if not users.exists():
            raise CommandError("Фойдаланувчи топилмади.")

        for user in users:
            profile = getattr(user, "profile", None)
            role = profile.role if profile and profile.role else None

            self.stdout.write(f"user: {user.username}")
            self.stdout.write(
                f"  active={user.is_active}, staff={user.is_staff}, superuser={user.is_superuser}"
            )
            self.stdout.write(f"  role: {role.name if role else '-'}")

            if role:
                role_permissions = PagePermission.objects.filter(role=role).order_by("page_code")
                allowed_pages = [p.page_code for p in role_permissions if p.can_view]

                self.stdout.write(
                    "  role pages: " + (", ".join(allowed_pages) if allowed_pages else "-")
                )

                self.stdout.write("  role permissions:")
                for permission in role_permissions:
                    flags = get_enabled_flags(permission)
                    self.stdout.write(
                        f"    - {permission.page_code}: {', '.join(flags) if flags else '-'}"
                    )

            overrides = UserPagePermissionOverride.objects.filter(user=user).order_by("page_code")
            if overrides.exists():
                self.stdout.write("  overrides:")
                for override in overrides:
                    flags = get_enabled_flags(override)
                    self.stdout.write(
                        f"    - {override.page_code}: {', '.join(flags) if flags else '-'}"
                    )
            else:
                self.stdout.write("  overrides: -")

            self.stdout.write("")