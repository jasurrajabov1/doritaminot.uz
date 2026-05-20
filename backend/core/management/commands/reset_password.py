from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

User = get_user_model()


class Command(BaseCommand):
    help = "Мавжуд фойдаланувчи паролини янгилайди."

    def add_arguments(self, parser):
        parser.add_argument("username", type=str, help="Фойдаланувчи login'i")
        parser.add_argument("new_password", type=str, help="Янги пароль")

    def handle(self, *args, **options):
        username = options["username"]
        new_password = options["new_password"]

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            raise CommandError(f"Фойдаланувчи топилмади: {username}")

        user.set_password(new_password)
        user.save()

        self.stdout.write(
            self.style.SUCCESS(
                f"Пароль муваффақиятли янгиланди: {user.username}"
            )
        )