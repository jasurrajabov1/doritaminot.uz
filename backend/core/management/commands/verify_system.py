from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from core.models import PagePermission, Role, UserProfile

User = get_user_model()

REQUIRED_ROLES = ["Админ", "Оператор", "Кузатувчи"]
REQUIRED_PAGE_CODES = [
    "dashboard",
    "institutions",
    "drugs",
    "prices",
    "need_rows",
    "monthly_issues",
    "stock_summary",
    "need_rows_summary",
    "access_management",
]


class Command(BaseCommand):
    help = "Тизимнинг асосий конфигурациясини тез текширади."

    def handle(self, *args, **options):
        errors = []

        self.stdout.write("1) Стандарт роллар текшируви")
        for role_name in REQUIRED_ROLES:
            if Role.objects.filter(name=role_name).exists():
                self.stdout.write(self.style.SUCCESS(f"   OK: роль бор -> {role_name}"))
            else:
                msg = f"роль топилмади: {role_name}"
                self.stdout.write(self.style.ERROR(f"   XATO: {msg}"))
                errors.append(msg)

        self.stdout.write("")
        self.stdout.write("2) Permission сони текшируви")
        for role_name in REQUIRED_ROLES:
            count = PagePermission.objects.filter(role__name=role_name).count()
            if count == len(REQUIRED_PAGE_CODES):
                self.stdout.write(
                    self.style.SUCCESS(
                        f"   OK: {role_name} -> {count} та permission"
                    )
                )
            else:
                msg = (
                    f"{role_name} учун permission сони нотўғри: "
                    f"{count} та, кераги {len(REQUIRED_PAGE_CODES)} та"
                )
                self.stdout.write(self.style.ERROR(f"   XATO: {msg}"))
                errors.append(msg)

        self.stdout.write("")
        self.stdout.write("3) access_management ҳуқуқи текшируви")

        admin_perm = PagePermission.objects.filter(
            role__name="Админ",
            page_code="access_management",
        ).first()

        if admin_perm and admin_perm.can_view and admin_perm.can_manage_access:
            self.stdout.write(
                self.style.SUCCESS(
                    "   OK: Админ -> access_management view/manage_access бор"
                )
            )
        else:
            msg = "Админ учун access_management ҳуқуқлари нотўғри"
            self.stdout.write(self.style.ERROR(f"   XATO: {msg}"))
            errors.append(msg)

        for role_name in ["Оператор", "Кузатувчи"]:
            perm = PagePermission.objects.filter(
                role__name=role_name,
                page_code="access_management",
            ).first()

            if perm and (not perm.can_view) and (not perm.can_manage_access):
                self.stdout.write(
                    self.style.SUCCESS(
                        f"   OK: {role_name} -> access_management ўчирилган"
                    )
                )
            else:
                msg = f"{role_name} учун access_management ҳуқуқи нотўғри"
                self.stdout.write(self.style.ERROR(f"   XATO: {msg}"))
                errors.append(msg)

        self.stdout.write("")
        self.stdout.write("4) Admin user текшируви")
        admin_users = User.objects.filter(
            is_superuser=True,
            is_staff=True,
            is_active=True,
        )

        if admin_users.exists():
            usernames = ", ".join(admin_users.values_list("username", flat=True))
            self.stdout.write(
                self.style.SUCCESS(f"   OK: admin user бор -> {usernames}")
            )
        else:
            msg = "active superuser/staff admin user топилмади"
            self.stdout.write(self.style.ERROR(f"   XATO: {msg}"))
            errors.append(msg)

        self.stdout.write("")
        self.stdout.write("5) UserProfile боғланиши текшируви")
        active_users = User.objects.filter(is_active=True)
        users_without_profile = []

        for user in active_users:
            if not hasattr(user, "profile"):
                users_without_profile.append(user.username)

        if users_without_profile:
            msg = "profile йўқ user'лар: " + ", ".join(users_without_profile)
            self.stdout.write(self.style.ERROR(f"   XATO: {msg}"))
            errors.append(msg)
        else:
            self.stdout.write(
                self.style.SUCCESS("   OK: active user'ларнинг profile'и бор")
            )

        self.stdout.write("")
        self.stdout.write("6) Қисқа статистика")
        self.stdout.write(f"   Роллар сони: {Role.objects.count()}")
        self.stdout.write(f"   Permission сони: {PagePermission.objects.count()}")
        self.stdout.write(f"   UserProfile сони: {UserProfile.objects.count()}")
        self.stdout.write(f"   User сони: {User.objects.count()}")

        self.stdout.write("")
        if errors:
            self.stdout.write(self.style.ERROR("Топилган хатолар:"))
            for err in errors:
                self.stdout.write(self.style.ERROR(f" - {err}"))
            raise CommandError("Текширув хатолар билан якунланди.")

        self.stdout.write(self.style.SUCCESS("Текширув якунланди: OK"))