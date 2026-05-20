from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError

from core.models import Role, UserProfile

User = get_user_model()


class Command(BaseCommand):
    help = "Системани бошланғич инициализация қилади: роллар, admin user, admin role."

    def add_arguments(self, parser):
        parser.add_argument("username", type=str, help="Admin login")
        parser.add_argument("password", type=str, help="Admin password")
        parser.add_argument("--first-name", type=str, default="", help="Исм")
        parser.add_argument("--last-name", type=str, default="", help="Фамилия")
        parser.add_argument("--email", type=str, default="", help="Email")

    def handle(self, *args, **options):
        username = options["username"]
        password = options["password"]
        first_name = options["first_name"]
        last_name = options["last_name"]
        email = options["email"]

        self.stdout.write("1) Default роль ва permission'лар яратилмоқда...")
        call_command("seed_roles")

        try:
            admin_role = Role.objects.get(name="Админ")
        except Role.DoesNotExist:
            raise CommandError("Админ роли топилмади. seed_roles ишламаган.")

        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                "first_name": first_name,
                "last_name": last_name,
                "email": email,
                "is_staff": True,
                "is_superuser": True,
                "is_active": True,
            },
        )

        if created:
            user.set_password(password)
            user.save()
            self.stdout.write(self.style.SUCCESS(f"2) Admin user яратилди: {username}"))
        else:
            user.first_name = first_name
            user.last_name = last_name
            user.email = email
            user.is_staff = True
            user.is_superuser = True
            user.is_active = True
            user.set_password(password)
            user.save()
            self.stdout.write(self.style.WARNING(f"2) Admin user янгиланди: {username}"))

        UserProfile.objects.update_or_create(
            user=user,
            defaults={"role": admin_role},
        )

        self.stdout.write(
            self.style.SUCCESS(
                f"3) Role бириктирилди: {user.username} -> {admin_role.name}"
            )
        )
        self.stdout.write(self.style.SUCCESS("Bootstrap якунланди."))