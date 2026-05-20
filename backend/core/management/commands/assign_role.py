from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from core.models import Role, UserProfile

User = get_user_model()


class Command(BaseCommand):
    help = "Фойдаланувчига роль бириктиради ёки янгилайди."

    def add_arguments(self, parser):
        parser.add_argument("username", type=str, help="Фойдаланувчи login'i")
        parser.add_argument("role_name", type=str, help="Роль номи")

    def handle(self, *args, **options):
        username = options["username"]
        role_name = options["role_name"]

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            raise CommandError(f"Фойдаланувчи топилмади: {username}")

        try:
            role = Role.objects.get(name=role_name)
        except Role.DoesNotExist:
            raise CommandError(f"Роль топилмади: {role_name}")

        profile, created = UserProfile.objects.update_or_create(
            user=user,
            defaults={"role": role},
        )

        if created:
            self.stdout.write(
                self.style.SUCCESS(
                    f"UserProfile яратилди: {user.username} -> {role.name}"
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Роль янгиланди: {user.username} -> {role.name}"
                )
            )