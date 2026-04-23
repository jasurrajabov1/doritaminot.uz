from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from core.models import Role, UserProfile

User = get_user_model()


class Command(BaseCommand):
    help = "Янги фойдаланувчи яратади ва унга роль бириктиради."

    def add_arguments(self, parser):
        parser.add_argument("username", type=str, help="Login")
        parser.add_argument("password", type=str, help="Пароль")
        parser.add_argument("role_name", type=str, help="Роль номи")
        parser.add_argument("--first-name", type=str, default="", help="Исм")
        parser.add_argument("--last-name", type=str, default="", help="Фамилия")
        parser.add_argument("--email", type=str, default="", help="Email")
        parser.add_argument(
            "--is-active",
            type=str,
            default="true",
            help="true ёки false",
        )

    def handle(self, *args, **options):
        username = options["username"]
        password = options["password"]
        role_name = options["role_name"]
        first_name = options["first_name"]
        last_name = options["last_name"]
        email = options["email"]
        is_active = str(options["is_active"]).lower() == "true"

        if User.objects.filter(username=username).exists():
            raise CommandError(f"Бу login аллақачон мавжуд: {username}")

        try:
            role = Role.objects.get(name=role_name)
        except Role.DoesNotExist:
            raise CommandError(f"Роль топилмади: {role_name}")

        user = User.objects.create_user(
            username=username,
            password=password,
            first_name=first_name,
            last_name=last_name,
            email=email,
            is_active=is_active,
        )

        UserProfile.objects.update_or_create(
            user=user,
            defaults={"role": role},
        )

        self.stdout.write(
            self.style.SUCCESS(
                f"Фойдаланувчи яратилди ва роль бириктирилди: {user.username} -> {role.name}"
            )
        )