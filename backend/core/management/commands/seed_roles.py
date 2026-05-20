from django.core.management.base import BaseCommand

from core.models import PagePermission, Role

PAGE_CODES = [
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

PERMISSION_FIELDS = [
    "can_view",
    "can_add",
    "can_edit",
    "can_delete",
    "can_export",
    "can_print",
    "can_manage_access",
]

ROLE_MATRIX = {
    "Админ": {
        "description": "Тизим админи",
        "pages": {
            "dashboard": ["can_view", "can_add", "can_edit", "can_delete", "can_export", "can_print"],
            "institutions": ["can_view", "can_add", "can_edit", "can_delete", "can_export", "can_print"],
            "drugs": ["can_view", "can_add", "can_edit", "can_delete", "can_export", "can_print"],
            "prices": ["can_view", "can_add", "can_edit", "can_delete", "can_export", "can_print"],
            "need_rows": ["can_view", "can_add", "can_edit", "can_delete", "can_export", "can_print"],
            "monthly_issues": ["can_view", "can_add", "can_edit", "can_delete", "can_export", "can_print"],
            "stock_summary": ["can_view", "can_add", "can_edit", "can_delete", "can_export", "can_print"],
            "need_rows_summary": ["can_view", "can_add", "can_edit", "can_delete", "can_export", "can_print"],
            "access_management": [
                "can_view",
                "can_add",
                "can_edit",
                "can_delete",
                "can_export",
                "can_print",
                "can_manage_access",
            ],
        },
    },
    "Оператор": {
        "description": "Амалий ишчи ходим",
        "pages": {
            "dashboard": ["can_view", "can_export", "can_print"],
            "institutions": ["can_view", "can_add", "can_edit", "can_delete"],
            "drugs": ["can_view", "can_add", "can_edit", "can_delete"],
            "prices": ["can_view", "can_add", "can_edit", "can_delete"],
            "need_rows": ["can_view", "can_add", "can_edit", "can_delete"],
            "monthly_issues": ["can_view", "can_add", "can_edit", "can_delete"],
            "stock_summary": ["can_view", "can_export", "can_print"],
            "need_rows_summary": ["can_view", "can_export", "can_print"],
            "access_management": [],
        },
    },
    "Кузатувчи": {
        "description": "Фақат кузатиш ҳуқуқига эга ходим",
        "pages": {
            "dashboard": ["can_view"],
            "institutions": ["can_view"],
            "drugs": ["can_view"],
            "prices": ["can_view"],
            "need_rows": ["can_view"],
            "monthly_issues": ["can_view"],
            "stock_summary": ["can_view", "can_export", "can_print"],
            "need_rows_summary": ["can_view", "can_export", "can_print"],
            "access_management": [],
        },
    },
}


class Command(BaseCommand):
    help = "Стандарт роль ва permission'ларни яратади ёки янгилайди."

    def handle(self, *args, **options):
        created_roles = 0
        updated_roles = 0
        created_permissions = 0
        updated_permissions = 0

        for role_name, role_data in ROLE_MATRIX.items():
            role, created = Role.objects.update_or_create(
                name=role_name,
                defaults={
                    "description": role_data["description"],
                    "is_active": True,
                },
            )

            if created:
                created_roles += 1
            else:
                updated_roles += 1

            self.stdout.write(f"Роль янгиланди: {role.name}")

            for page_code in PAGE_CODES:
                defaults = {field: False for field in PERMISSION_FIELDS}

                for enabled_field in role_data["pages"].get(page_code, []):
                    defaults[enabled_field] = True

                permission, perm_created = PagePermission.objects.update_or_create(
                    role=role,
                    page_code=page_code,
                    defaults=defaults,
                )

                if perm_created:
                    created_permissions += 1
                    sign = "+"
                else:
                    updated_permissions += 1
                    sign = "~"

                enabled_flags = [field.replace("can_", "") for field, value in defaults.items() if value]
                enabled_text = ", ".join(enabled_flags) if enabled_flags else "-"

                self.stdout.write(
                    f"  {sign} permission: {role.name} / {page_code} -> {enabled_text}"
                )

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("Seed якунланди."))
        self.stdout.write(f"Яратилган роллар: {created_roles}")
        self.stdout.write(f"Янгиланган роллар: {updated_roles}")
        self.stdout.write(f"Яратилган permission'лар: {created_permissions}")
        self.stdout.write(f"Янгиланган permission'лар: {updated_permissions}")