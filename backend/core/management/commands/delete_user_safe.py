from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

User = get_user_model()


class Command(BaseCommand):
    help = "Фойдаланувчини хавфсиз ўчиради."

    def add_arguments(self, parser):
        parser.add_argument("username", type=str, help="Ўчириладиган фойдаланувчи логини")

    def handle(self, *args, **options):
        username = options["username"]

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            raise CommandError(f"Фойдаланувчи топилмади: {username}")

        if user.is_superuser and user.is_active:
            active_superusers_count = User.objects.filter(
                is_superuser=True,
                is_active=True,
            ).count()

            if active_superusers_count <= 1:
                raise CommandError("Охирги фаол superuser'ни ўчириб бўлмайди.")

        user_repr = user.username
        user.delete()

        self.stdout.write(
            self.style.SUCCESS(f"Фойдаланувчи ўчирилди: {user_repr}")
        )