from datetime import date

from django.utils import timezone

from .models import Price


def resolve_price_date(on_date=None, year=None):
    if year is not None:
        try:
            return date(int(year), 12, 31)
        except (TypeError, ValueError):
            pass

    return on_date or timezone.localdate()


def get_latest_price(drug_id, on_date=None, year=None):
    effective_date = resolve_price_date(on_date=on_date, year=year)

    return (
        Price.objects.filter(
            drug_id=drug_id,
            is_active=True,
            start_date__lte=effective_date,
        )
        .order_by("-start_date", "-id")
        .first()
    )


def get_price_amount(drug_id, on_date=None, year=None):
    matched_price = get_latest_price(
        drug_id=drug_id,
        on_date=on_date,
        year=year,
    )
    return matched_price.price if matched_price else None