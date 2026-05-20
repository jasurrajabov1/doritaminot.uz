from decimal import Decimal

from django.db.models import Q, Sum, Count, Max

from .models import NeedAddition, MonthlyIssue


ZERO = Decimal("0")


def dec(value):
    if value is None or value == "":
        return ZERO
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


def active_additions_for_need_row(need_row):
    """
    NeedRow'га тегишли фаол қўшимча эҳтиёжлар.
    Эски compatibility учун need_row null бўлган, лекин institution/drug/year бир хил
    ёзувлар ҳам ҳисобга олинади.
    """
    return NeedAddition.objects.filter(
        Q(need_row=need_row)
        | Q(
            need_row__isnull=True,
            institution_id=need_row.institution_id,
            drug_id=need_row.drug_id,
            year=need_row.year,
        ),
        is_active=True,
    )


def additional_risk_status(base_yearly_need, additional_yearly_need):
    base = dec(base_yearly_need)
    add = dec(additional_yearly_need)

    if add <= ZERO:
        return "Қўшимча йўқ"

    if base <= ZERO:
        return "Йил ўртасида қўшилган"

    percent = (add / base) * Decimal("100")

    if percent < Decimal("10"):
        return "Норма"
    if percent < Decimal("15"):
        return "Тушунарли"
    if percent < Decimal("30"):
        return "Огоҳлантириш"
    if percent < Decimal("50"):
        return "Юқори хавф"

    return "Критик"


def need_row_addition_summary(need_row):
    qs = active_additions_for_need_row(need_row)

    agg = qs.aggregate(
        additional_dpm_need=Sum("dpm_need_add"),
        additional_amb_rec_need=Sum("amb_rec_need_add"),
        additional_yearly_need=Sum("total_additional_need"),
        additional_count=Count("id"),
        last_additional_date=Max("addition_date"),
    )

    base_yearly_need = dec(need_row.yearly_need)
    additional_dpm_need = dec(agg.get("additional_dpm_need"))
    additional_amb_rec_need = dec(agg.get("additional_amb_rec_need"))
    additional_yearly_need = dec(agg.get("additional_yearly_need"))

    # Агар total_additional_need эски ёзувларда тўлмаган бўлса, қисмлардан ҳисоблаймиз.
    if additional_yearly_need <= ZERO and (additional_dpm_need > ZERO or additional_amb_rec_need > ZERO):
        additional_yearly_need = additional_dpm_need + additional_amb_rec_need

    total_yearly_need = base_yearly_need + additional_yearly_need
    total_quarterly_need = total_yearly_need / Decimal("4")

    if base_yearly_need > ZERO:
        additional_percent = ((additional_yearly_need / base_yearly_need) * Decimal("100")).quantize(Decimal("0.01"))
    else:
        additional_percent = None

    reason_values = list(
        qs.exclude(reason="")
        .values_list("reason", flat=True)
        .distinct()
        .order_by("reason")
    )

    reason_labels = []
    reason_map = dict(NeedAddition.REASON_CHOICES)
    for reason in reason_values:
        reason_labels.append(reason_map.get(reason, reason))

    return {
        "base_yearly_need": base_yearly_need,
        "additional_dpm_need": additional_dpm_need,
        "additional_amb_rec_need": additional_amb_rec_need,
        "additional_yearly_need": additional_yearly_need,
        "total_yearly_need": total_yearly_need,
        "total_quarterly_need": total_quarterly_need.quantize(Decimal("0.001")),
        "additional_percent": additional_percent,
        "additional_count": agg.get("additional_count") or 0,
        "last_additional_date": agg.get("last_additional_date"),
        "additional_risk_status": additional_risk_status(base_yearly_need, additional_yearly_need),
        "additional_reason_summary": ", ".join(reason_labels),
    }


def total_yearly_need_for_need_row(need_row):
    return need_row_addition_summary(need_row)["total_yearly_need"]


def issued_qty_for_need_row(need_row):
    issue = MonthlyIssue.objects.filter(
        institution_id=need_row.institution_id,
        drug_id=need_row.drug_id,
        year=need_row.year,
    ).first()

    return dec(issue.issued_qty) if issue else ZERO
