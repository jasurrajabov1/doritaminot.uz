from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

User = get_user_model()


class Command(BaseCommand):
    help = "Фойдаланувчини active ёки inactive қилади."

    def add_arguments(self, parser):
        parser.add_argument("username", type=str, help="Фойдаланувчи login'i")
        parser.add_argument(
            "status",
            type=str,
            choices=["active", "inactive"],
            help="active ёки inactive",
        )

    def handle(self, *args, **options):
        username = options["username"]
        status = options["status"]

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            raise CommandError(f"Фойдаланувчи топилмади: {username}")

        new_is_active = status == "active"

        if not new_is_active and user.is_superuser:
            active_superusers_count = User.objects.filter(
                is_superuser=True,
                is_active=True,
            ).count()

            if user.is_active and active_superusers_count <= 1:
                raise CommandError(
                    "Охирги active superuser'ни inactive қилиб бўлмайди."
                )

        if user.is_active == new_is_active:
            self.stdout.write(
                self.style.WARNING(
                    f"Ҳолат ўзгармади: {user.username} аллақачон {status}"
                )
            )
            return

        user.is_active = new_is_active
        user.save(update_fields=["is_active"])

        self.stdout.write(
            self.style.SUCCESS(
                f"Фойдаланувчи ҳолати янгиланди: {user.username} -> {status}"
            )
        )