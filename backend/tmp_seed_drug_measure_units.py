# coding: utf-8
import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django
django.setup()

from core.models import DrugOption

items = [
    ("measure_unit", "тыс. амп.", "тыс.амп; тыс амп; минг амп.; минг ампула; минг ампул; thousand amp"),
    ("measure_unit", "ампула", "амп; ампула; ампулы"),
]

for kind, name, aliases in items:
    obj, created = DrugOption.objects.update_or_create(
        kind=kind,
        name=name,
        defaults={
            "aliases": aliases,
            "is_active": True,
            "sort_order": 5,
        },
    )
    print(("CREATED" if created else "UPDATED"), kind, name)

print("OK: measure units seeded.")
