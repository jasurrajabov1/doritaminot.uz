from django.core.management.base import BaseCommand

from core.models import DrugOption


DEFAULTS = [
    ("dosage_unit", "мг", "mg, мгр, миллиграмм, миллиграм", 10),
    ("dosage_unit", "гр", "г, g, грамм, грам", 20),
    ("dosage_unit", "кг", "kg", 30),
    ("dosage_unit", "мл", "ml, миллилитр, миллилитир", 40),
    ("dosage_unit", "мкг", "mcg, ug", 50),
    ("dosage_unit", "%", "процент", 60),
    ("dosage_unit", "МЕ", "ме", 70),
    ("dosage_unit", "ЕД", "ед", 80),

    ("dosage_form", "амп", "ампула, ампулы", 10),
    ("dosage_form", "табл", "таб, таблетка, таблетки", 20),
    ("dosage_form", "порошок", "пор", 30),
    ("dosage_form", "шамча", "свеча", 40),
    ("dosage_form", "мазь", "маз", 50),
    ("dosage_form", "крем", "", 60),
    ("dosage_form", "гель", "гел", 70),
    ("dosage_form", "фл", "флакон", 80),
    ("dosage_form", "тюб", "тюбик", 90),
    ("dosage_form", "дурулекс", "дурулек", 100),
    ("dosage_form", "филм табл", "фильм табл", 110),
    ("dosage_form", "капс", "капсула, капсулы", 120),
    ("dosage_form", "сироп", "", 130),
    ("dosage_form", "суспензия", "", 140),
    ("dosage_form", "эритма", "раствор", 150),
    ("dosage_form", "томчи", "капли", 160),
    ("dosage_form", "спрей", "", 170),

    ("measure_unit", "шт", "штук", 10),
    ("measure_unit", "уп", "упак, упаковка", 20),
    ("measure_unit", "блистер", "бл", 30),
    ("measure_unit", "пастилки", "", 40),
    ("measure_unit", "коробка", "кор", 50),
    ("measure_unit", "дона", "", 60),
    ("measure_unit", "флакон", "фл", 70),
    ("measure_unit", "тюб", "тюбик", 80),
]


class Command(BaseCommand):
    help = "Дори доза/тур/ўлчов бирликлари справочнигини яратади."

    def handle(self, *args, **options):
        created = 0
        updated = 0

        for kind, name, aliases, sort_order in DEFAULTS:
            obj, was_created = DrugOption.objects.update_or_create(
                kind=kind,
                name=name,
                defaults={
                    "aliases": aliases,
                    "sort_order": sort_order,
                    "is_active": True,
                },
            )

            if was_created:
                created += 1
            else:
                updated += 1

        self.stdout.write(self.style.SUCCESS("Drug options seed якунланди."))
        self.stdout.write(f"Яратилган: {created}")
        self.stdout.write(f"Янгиланган: {updated}")
        self.stdout.write(f"Жами: {DrugOption.objects.count()}")
