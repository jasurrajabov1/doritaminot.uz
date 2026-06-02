from decimal import Decimal

from django.contrib.auth import authenticate, get_user_model
from django.db.models import DecimalField, Sum, Value
from django.db.models.functions import Coalesce
from rest_framework import serializers
from .price_utils import get_price_amount

from .constants import ACTION_DEFINITIONS, PERMISSION_FIELD_NAMES, get_page_label
from .models import (
    Drug,
    Institution,
    MonthlyIssue,
    NeedAddition,
    NeedRow,
    PagePermission,
    Price,
    Role,
    UserPagePermissionOverride,
    UserProfile,
)
from .permissions import resolve_user_page_permissions, resolve_user_role
from .drug_normalizer import normalize_drug_for_save

User = get_user_model()

def dec_zero_3():
    return Value(0, output_field=DecimalField(max_digits=14, decimal_places=3))


def get_need_addition_qs(
    institution=None,
    drug=None,
    year=None,
    institution_id=None,
    drug_id=None,
    need_row=None,
    need_row_id=None,
    active_only=True,
):
    qs = NeedAddition.objects.all()

    if active_only:
        qs = qs.filter(is_active=True)

    if need_row is not None:
        qs = qs.filter(need_row=need_row)

    if need_row_id is not None:
        qs = qs.filter(need_row_id=need_row_id)

    if institution is not None:
        qs = qs.filter(institution=institution)

    if institution_id is not None:
        qs = qs.filter(institution_id=institution_id)

    if drug is not None:
        qs = qs.filter(drug=drug)

    if drug_id is not None:
        qs = qs.filter(drug_id=drug_id)

    if year is not None:
        qs = qs.filter(year=year)

    return qs


def get_need_addition_parts(
    institution=None,
    drug=None,
    year=None,
    institution_id=None,
    drug_id=None,
    need_row=None,
    need_row_id=None,
    active_only=True,
):
    qs = get_need_addition_qs(
        institution=institution,
        drug=drug,
        year=year,
        institution_id=institution_id,
        drug_id=drug_id,
        need_row=need_row,
        need_row_id=need_row_id,
        active_only=active_only,
    )

    data = qs.aggregate(
        dpm=Coalesce(Sum("dpm_need_add"), dec_zero_3()),
        amb=Coalesce(Sum("amb_rec_need_add"), dec_zero_3()),
        total=Coalesce(Sum("total_additional_need"), dec_zero_3()),
    )

    dpm = data["dpm"] or Decimal("0")
    amb = data["amb"] or Decimal("0")
    total = data["total"] or (dpm + amb)

    return dpm, amb, total


def get_need_addition_total(
    institution=None,
    drug=None,
    year=None,
    institution_id=None,
    drug_id=None,
    need_row=None,
    need_row_id=None,
    active_only=True,
):
    _, _, total = get_need_addition_parts(
        institution=institution,
        drug=drug,
        year=year,
        institution_id=institution_id,
        drug_id=drug_id,
        need_row=need_row,
        need_row_id=need_row_id,
        active_only=active_only,
    )
    return total or Decimal("0")


def get_need_total_with_additions(need_row):
    base_need = need_row.yearly_need or Decimal("0")
    added_need = get_need_addition_total(need_row=need_row)
    return base_need + added_need


def get_additional_risk_status(base_need, additional_need):
    base_need = base_need or Decimal("0")
    additional_need = additional_need or Decimal("0")

    if additional_need <= 0:
        return "Қўшимча йўқ"

    if base_need <= 0:
        return "Йил ўртасида қўшилган"

    percent = (additional_need / base_need) * Decimal("100")

    if percent < 10:
        return "Норма"
    if percent < 15:
        return "Тушунарли"
    if percent < 30:
        return "Огоҳлантириш"
    if percent < 50:
        return "Юқори хавф"
    return "Критик"


def validate_password_by_policy(password, policy):
    policy = policy or "medium"

    if policy == "simple":
        if len(password) < 4:
            raise serializers.ValidationError(
                "Simple пароль камида 4 белгидан иборат бўлиши керак."
            )
        return password

    if policy == "medium":
        if len(password) < 6:
            raise serializers.ValidationError(
                "Medium пароль камида 6 белгидан иборат бўлиши керак."
            )
        if not any(ch.isalpha() for ch in password) or not any(ch.isdigit() for ch in password):
            raise serializers.ValidationError(
                "Medium парольда камида 1 та ҳарф ва 1 та рақам бўлиши керак."
            )
        return password

    if policy == "strong":
        if len(password) < 8:
            raise serializers.ValidationError(
                "Strong пароль камида 8 белгидан иборат бўлиши керак."
            )
        if not any(ch.islower() for ch in password):
            raise serializers.ValidationError(
                "Strong парольда камида 1 та кичик ҳарф бўлиши керак."
            )
        if not any(ch.isupper() for ch in password):
            raise serializers.ValidationError(
                "Strong парольда камида 1 та катта ҳарф бўлиши керак."
            )
        if not any(ch.isdigit() for ch in password):
            raise serializers.ValidationError(
                "Strong парольда камида 1 та рақам бўлиши керак."
            )
        return password

    raise serializers.ValidationError("Номаълум пароль сиёсати.")

class InstitutionSerializer(serializers.ModelSerializer):
    inn = serializers.CharField(
        required=False,
        allow_blank=True,
        validators=[],
    )

    class Meta:
        model = Institution
        fields = "__all__"
        validators = []

    def validate_inn(self, value):
        value = (value or "").strip()

        if not value:
            return ""

        if not value.isdigit() or len(value) != 9:
            raise serializers.ValidationError(
                "ИНН 9 та рақамдан иборат бўлиши керак."
            )

        qs = Institution.objects.filter(inn=value)

        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)

        if qs.exists():
            raise serializers.ValidationError(
                "Бу ИНН билан муассаса аллақачон мавжуд."
            )

        return value
        value = (value or "").strip()

        if not value:
            return ""

        if not value.isdigit() or len(value) != 9:
            raise serializers.ValidationError(
                "ИНН 9 та рақамдан иборат бўлиши керак."
            )

        qs = Institution.objects.filter(inn=value)

        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)

        if qs.exists():
            raise serializers.ValidationError(
                "Бу ИНН билан муассаса аллақачон мавжуд."
            )

        return value

class DrugSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(read_only=True)

    class Meta:
        model = Drug
        fields = "__all__"



    def validate(self, attrs):
        instance = getattr(self, "instance", None)

        data = {}
        if instance is not None:
            for field in [
                "name",
                "mnn_name",
                "dosage_value",
                "dosage_unit",
                "package_quantity",
                "dosage_form",
                "unit",
                "manufacturer",
                "is_active",
            ]:
                data[field] = getattr(instance, field, "")

        data.update(attrs)

        probe = Drug(**data)
        normalize_drug_for_save(probe)
        full_name = probe.build_full_name()

        qs = Drug.objects.filter(full_name__iexact=full_name)
        if instance is not None and instance.pk:
            qs = qs.exclude(pk=instance.pk)

        if qs.exists():
            raise serializers.ValidationError({
                "name": f"Бу дори паспорти аллақачон мавжуд: {full_name}"
            })

        return attrs

class PriceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Price
        fields = "__all__"

    def validate(self, attrs):
        drug = attrs.get("drug")
        if drug is None and self.instance is not None:
            drug = self.instance.drug

        start_date = attrs.get("start_date")
        if start_date is None and self.instance is not None:
            start_date = self.instance.start_date

        if "price" in attrs:
            price = attrs["price"]
        elif self.instance is not None:
            price = self.instance.price
        else:
            price = None

        if price is not None and price <= 0:
            raise serializers.ValidationError({
                "price": "Нарх 0 дан катта бўлиши керак."
            })

        if drug and start_date:
            qs = Price.objects.filter(
                drug=drug,
                start_date=start_date,
            )

            if self.instance:
                qs = qs.exclude(id=self.instance.id)

            if qs.exists():
                raise serializers.ValidationError(
                    "Бу дори учун шу санада нарх аллақачон киритилган."
                )

        return attrs


class MonthlyIssueSerializer(serializers.ModelSerializer):
    institution_name = serializers.CharField(source="institution.name", read_only=True)
    institution_inn = serializers.CharField(source="institution.inn", read_only=True)
    drug_name = serializers.CharField(source="drug.display_name", read_only=True)

    class Meta:
        model = MonthlyIssue
        fields = [
            "id",
            "institution",
            "institution_name",
            "institution_inn",
            "drug",
            "drug_name",
            "year",
            "issued_qty",
        ]
        read_only_fields = [
            "institution_name",
            "institution_inn",
            "drug_name",
        ]
        validators = []

    def validate(self, attrs):
        institution = attrs.get("institution") or (self.instance.institution if self.instance else None)
        drug = attrs.get("drug") or (self.instance.drug if self.instance else None)
        year = attrs.get("year") or (self.instance.year if self.instance else None)
        issued_qty = attrs.get("issued_qty")

        if issued_qty is None and self.instance:
            issued_qty = self.instance.issued_qty

        if not institution or not drug or not year or issued_qty is None:
            return attrs

        if issued_qty < 0:
            raise serializers.ValidationError({
                "issued_qty": "Берилган миқдор манфий бўлиши мумкин эмас."
            })

        need_row = NeedRow.objects.filter(
            institution=institution,
            drug=drug,
            year=year,
        ).first()

        if not need_row:
            raise serializers.ValidationError({
                "non_field_errors": [
                    "Аввал ушбу муассаса, дори ва йил учун эҳтиёж қатори киритилиши керак."
                ]
            })

        added_need = get_need_addition_total(
            institution=institution,
            drug=drug,
            year=year,
        )
        total_need = (need_row.yearly_need or Decimal("0")) + added_need

        same_key_qs = MonthlyIssue.objects.filter(
            institution=institution,
            drug=drug,
            year=year,
        )

        if self.instance:
            same_key_qs = same_key_qs.exclude(pk=self.instance.pk)

        if self.instance:
            if issued_qty > total_need:
                raise serializers.ValidationError({
                    "issued_qty": (
                        f"Берилган жами миқдор умумий эҳтиёждан ошиб кетди. "
                        f"Йил бошидаги эҳтиёж: {need_row.yearly_need}, "
                        f"қўшимча эҳтиёж: {added_need}, "
                        f"умумий эҳтиёж: {total_need}, "
                        f"киритилаётган жами: {issued_qty}"
                    )
                })
        else:
            existing = same_key_qs.first()
            if existing:
                new_total = (existing.issued_qty or Decimal("0")) + issued_qty
                if new_total > total_need:
                    raise serializers.ValidationError({
                        "issued_qty": (
                            f"Умумий эҳтиёждан ошиб кетди. "
                            f"Йил бошидаги эҳтиёж: {need_row.yearly_need}, "
                            f"қўшимча эҳтиёж: {added_need}, "
                            f"умумий эҳтиёж: {total_need}, "
                            f"ҳозирги жами берилган: {existing.issued_qty}, "
                            f"қўшилаётгани: {issued_qty}, "
                            f"янги жами: {new_total}"
                        )
                    })
            else:
                if issued_qty > total_need:
                    raise serializers.ValidationError({
                        "issued_qty": (
                            f"Берилган жами миқдор умумий эҳтиёждан ошиб кетди. "
                            f"Йил бошидаги эҳтиёж: {need_row.yearly_need}, "
                            f"қўшимча эҳтиёж: {added_need}, "
                            f"умумий эҳтиёж: {total_need}, "
                            f"киритилаётган жами: {issued_qty}"
                        )
                    })

        return attrs


    def create(self, validated_data):
        institution = validated_data["institution"]
        drug = validated_data["drug"]
        year = validated_data["year"]
        issued_qty = validated_data["issued_qty"]

        existing = MonthlyIssue.objects.filter(
            institution=institution,
            drug=drug,
            year=year,
        ).first()

        if existing:
            existing.issued_qty = (existing.issued_qty or Decimal("0")) + issued_qty
            existing.save(update_fields=["issued_qty"])
            return existing

        return MonthlyIssue.objects.create(**validated_data)

    def update(self, instance, validated_data):
        instance.institution = validated_data.get("institution", instance.institution)
        instance.drug = validated_data.get("drug", instance.drug)
        instance.year = validated_data.get("year", instance.year)
        instance.issued_qty = validated_data.get("issued_qty", instance.issued_qty)
        instance.save()
        return instance


class NeedRowSerializer(serializers.ModelSerializer):
    institution_name = serializers.CharField(source="institution.name", read_only=True)
    institution_inn = serializers.CharField(source="institution.inn", read_only=True)
    drug_name = serializers.CharField(source="drug.display_name", read_only=True)

    given_dpm = serializers.SerializerMethodField()

    # Янги ТЗ майдонлари
    additional_dpm_need = serializers.SerializerMethodField()
    additional_amb_rec_need = serializers.SerializerMethodField()
    additional_yearly_need = serializers.SerializerMethodField()
    total_yearly_need = serializers.SerializerMethodField()
    total_quarterly_need = serializers.SerializerMethodField()
    additional_percent = serializers.SerializerMethodField()
    additional_count = serializers.SerializerMethodField()
    last_additional_date = serializers.SerializerMethodField()
    additional_risk_status = serializers.SerializerMethodField()

    # Эски frontend compatibility aliases
    additional_need = serializers.SerializerMethodField()
    total_need = serializers.SerializerMethodField()
    additional_need_percent = serializers.SerializerMethodField()
    addition_count = serializers.SerializerMethodField()

    remaining = serializers.SerializerMethodField()
    remaining_percent = serializers.SerializerMethodField()

    price = serializers.SerializerMethodField()
    yearly_sum = serializers.SerializerMethodField()
    additional_sum = serializers.SerializerMethodField()
    total_need_sum = serializers.SerializerMethodField()
    given_sum = serializers.SerializerMethodField()
    remaining_sum = serializers.SerializerMethodField()

    class Meta:
        model = NeedRow
        fields = [
            "id",
            "institution",
            "institution_name",
            "institution_inn",
            "drug",
            "drug_name",
            "year",
            "dpm_need",
            "amb_rec_need",
            "yearly_need",
            "quarterly_need",
            "given_dpm",

            "additional_dpm_need",
            "additional_amb_rec_need",
            "additional_yearly_need",
            "total_yearly_need",
            "total_quarterly_need",
            "additional_percent",
            "additional_count",
            "last_additional_date",
            "additional_risk_status",

            "additional_need",
            "total_need",
            "additional_need_percent",
            "addition_count",

            "remaining",
            "remaining_percent",
            "price",
            "yearly_sum",
            "additional_sum",
            "total_need_sum",
            "given_sum",
            "remaining_sum",
        ]
        read_only_fields = [
            "institution_name",
            "institution_inn",
            "drug_name",
            "yearly_need",
            "quarterly_need",
            "given_dpm",

            "additional_dpm_need",
            "additional_amb_rec_need",
            "additional_yearly_need",
            "total_yearly_need",
            "total_quarterly_need",
            "additional_percent",
            "additional_count",
            "last_additional_date",
            "additional_risk_status",

            "additional_need",
            "total_need",
            "additional_need_percent",
            "addition_count",

            "remaining",
            "remaining_percent",
            "price",
            "yearly_sum",
            "additional_sum",
            "total_need_sum",
            "given_sum",
            "remaining_sum",
        ]
        validators = []

    def validate(self, attrs):
        instance = getattr(self, "instance", None)

        institution = attrs.get("institution") or (instance.institution if instance else None)
        drug = attrs.get("drug") or (instance.drug if instance else None)
        year = attrs.get("year") or (instance.year if instance else None)

        dpm_need = attrs.get("dpm_need")
        if dpm_need is None:
            dpm_need = instance.dpm_need if instance else Decimal("0")

        amb_rec_need = attrs.get("amb_rec_need")
        if amb_rec_need is None:
            amb_rec_need = instance.amb_rec_need if instance else Decimal("0")

        dpm_need = dpm_need or Decimal("0")
        amb_rec_need = amb_rec_need or Decimal("0")

        if dpm_need < 0:
            raise serializers.ValidationError({
                "dpm_need": "ДПМ эҳтиёж манфий бўлиши мумкин эмас."
            })

        if amb_rec_need < 0:
            raise serializers.ValidationError({
                "amb_rec_need": "Амб. рец. эҳтиёж манфий бўлиши мумкин эмас."
            })

        if dpm_need <= 0 and amb_rec_need <= 0:
            raise serializers.ValidationError({
                "non_field_errors": [
                    "Камида битта эҳтиёж киритилиши керак."
                ]
            })

        yearly_need = (dpm_need + amb_rec_need).quantize(Decimal("0.001"))
        quarterly_need = (yearly_need / Decimal("4")).quantize(Decimal("0.001"))

        attrs["yearly_need"] = yearly_need
        attrs["quarterly_need"] = quarterly_need

        if institution and drug and year:
            qs = NeedRow.objects.filter(
                institution=institution,
                drug=drug,
                year=year,
            )

            if instance:
                qs = qs.exclude(pk=instance.pk)

            if qs.exists():
                raise serializers.ValidationError({
                    "non_field_errors": [
                        "Бу муассаса, дори ва йил учун эҳтиёж қатори аллақачон мавжуд."
                    ]
                })

        return attrs

    def get_given_dpm_value(self, obj):
        total = MonthlyIssue.objects.filter(
            institution=obj.institution,
            drug=obj.drug,
            year=obj.year,
        ).aggregate(
            total=Coalesce(
                Sum("issued_qty"),
                Value(0, output_field=DecimalField(max_digits=14, decimal_places=3)),
            )
        )["total"]

        return total or Decimal("0")

    def get_additional_parts_value(self, obj):
        return get_need_addition_parts(need_row=obj)

    def get_additional_dpm_need_value(self, obj):
        dpm, _, _ = self.get_additional_parts_value(obj)
        return dpm

    def get_additional_amb_rec_need_value(self, obj):
        _, amb, _ = self.get_additional_parts_value(obj)
        return amb

    def get_additional_yearly_need_value(self, obj):
        _, _, total = self.get_additional_parts_value(obj)
        return total

    def get_total_yearly_need_value(self, obj):
        return (obj.yearly_need or Decimal("0")) + self.get_additional_yearly_need_value(obj)

    def get_remaining_value(self, obj):
        return self.get_total_yearly_need_value(obj) - self.get_given_dpm_value(obj)

    def get_additional_dpm_need(self, obj):
        return round(float(self.get_additional_dpm_need_value(obj)), 3)

    def get_additional_amb_rec_need(self, obj):
        return round(float(self.get_additional_amb_rec_need_value(obj)), 3)

    def get_additional_yearly_need(self, obj):
        return round(float(self.get_additional_yearly_need_value(obj)), 3)

    def get_total_yearly_need(self, obj):
        return round(float(self.get_total_yearly_need_value(obj)), 3)

    def get_total_quarterly_need(self, obj):
        return round(float(self.get_total_yearly_need_value(obj) / Decimal("4")), 3)

    def get_additional_percent(self, obj):
        base_need = obj.yearly_need or Decimal("0")

        if base_need <= 0:
            return None

        percent = (self.get_additional_yearly_need_value(obj) / base_need) * Decimal("100")
        return round(float(percent), 2)

    def get_additional_count(self, obj):
        return get_need_addition_qs(need_row=obj).count()

    def get_last_additional_date(self, obj):
        item = get_need_addition_qs(need_row=obj).order_by("-addition_date", "-id").first()
        return item.addition_date if item else None

    def get_additional_risk_status(self, obj):
        return get_additional_risk_status(
            obj.yearly_need or Decimal("0"),
            self.get_additional_yearly_need_value(obj),
        )

    # Эски frontend aliases
    def get_additional_need(self, obj):
        return self.get_additional_yearly_need(obj)

    def get_total_need(self, obj):
        return self.get_total_yearly_need(obj)

    def get_additional_need_percent(self, obj):
        value = self.get_additional_percent(obj)
        return 0 if value is None else value

    def get_addition_count(self, obj):
        return self.get_additional_count(obj)

    def get_given_dpm(self, obj):
        return round(float(self.get_given_dpm_value(obj)), 3)

    def get_remaining(self, obj):
        return round(float(self.get_remaining_value(obj)), 3)

    def get_remaining_percent(self, obj):
        total_need = self.get_total_yearly_need_value(obj)

        if total_need <= 0:
            return 0

        percent = (self.get_remaining_value(obj) / total_need) * Decimal("100")
        return round(float(percent), 2)

    def get_price_value(self, obj):
        return get_price_amount(obj.drug_id, year=obj.year)

    def get_price(self, obj):
        price_value = self.get_price_value(obj)
        return float(price_value) if price_value is not None else None

    def get_yearly_sum(self, obj):
        price_value = self.get_price_value(obj)
        if price_value is None:
            return None
        return round(float((obj.yearly_need or Decimal("0")) * price_value), 2)

    def get_additional_sum(self, obj):
        price_value = self.get_price_value(obj)
        if price_value is None:
            return None
        return round(float(self.get_additional_yearly_need_value(obj) * price_value), 2)

    def get_total_need_sum(self, obj):
        price_value = self.get_price_value(obj)
        if price_value is None:
            return None
        return round(float(self.get_total_yearly_need_value(obj) * price_value), 2)

    def get_given_sum(self, obj):
        price_value = self.get_price_value(obj)
        if price_value is None:
            return None
        return round(float(self.get_given_dpm_value(obj) * price_value), 2)

    def get_remaining_sum(self, obj):
        price_value = self.get_price_value(obj)
        if price_value is None:
            return None
        return round(float(self.get_remaining_value(obj) * price_value), 2)


class NeedAdditionSerializer(serializers.ModelSerializer):
    institution_name = serializers.CharField(source="institution.name", read_only=True)
    institution_inn = serializers.CharField(source="institution.inn", read_only=True)
    drug_name = serializers.CharField(source="drug.display_name", read_only=True)
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)

    reason = serializers.CharField(required=True, allow_blank=False)
    reason_label = serializers.SerializerMethodField()
    document_number = serializers.SerializerMethodField()
    document_date = serializers.SerializerMethodField()

    class Meta:
        model = NeedAddition
        fields = [
            "id",
            "need_row",

            "institution",
            "institution_name",
            "institution_inn",
            "drug",
            "drug_name",
            "year",

            "added_qty",
            "dpm_need_add",
            "amb_rec_need_add",
            "total_additional_need",

            "addition_date",
            "reason",
            "reason_label",

            "doc_number",
            "doc_date",
            "document_number",
            "document_date",

            "comment",
            "is_active",
            "cancel_reason",

            "created_by",
            "created_by_username",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "institution_name",
            "institution_inn",
            "drug_name",
            "total_additional_need",
            "reason_label",
            "document_number",
            "document_date",
            "created_by",
            "created_by_username",
            "created_at",
            "updated_at",
        ]
        validators = []

    def get_reason_label(self, obj):
        return dict(NeedAddition.REASON_CHOICES).get(obj.reason, obj.reason)

    def get_document_number(self, obj):
        return obj.doc_number

    def get_document_date(self, obj):
        return obj.doc_date

    def normalize_reason(self, raw_reason, comment):
        valid_codes = {code for code, _ in NeedAddition.REASON_CHOICES}

        raw_reason = (raw_reason or "").strip()
        comment = (comment or "").strip()

        if raw_reason in valid_codes:
            return raw_reason, comment

        # Эски frontend text input'ларини тахминий choices'га ўтказиш
        lower = raw_reason.lower()

        if "кам" in lower or "ҳисоб" in lower or "хисоб" in lower:
            return NeedAddition.REASON_BASE_UNDERESTIMATED, comment

        if "бўлим" in lower or "булим" in lower:
            return NeedAddition.REASON_NEW_DEPARTMENT, comment

        if "бемор" in lower:
            return NeedAddition.REASON_PATIENT_INCREASE, comment

        if "клиника" in lower:
            return NeedAddition.REASON_NEW_CLINIC, comment

        if "ссв" in lower or "топшир" in lower or "буйру" in lower:
            return NeedAddition.REASON_SSV_ORDER, comment

        if "тузат" in lower or "корр" in lower:
            return NeedAddition.REASON_CORRECTION, comment

        if raw_reason and not comment:
            comment = raw_reason

        return NeedAddition.REASON_OTHER, comment

    def validate(self, attrs):
        instance = getattr(self, "instance", None)

        need_row = attrs.get("need_row") or (instance.need_row if instance else None)

        institution = attrs.get("institution") or (instance.institution if instance else None)
        drug = attrs.get("drug") or (instance.drug if instance else None)
        year = attrs.get("year") or (instance.year if instance else None)

        if need_row:
            attrs["institution"] = need_row.institution
            attrs["drug"] = need_row.drug
            attrs["year"] = need_row.year
            institution = need_row.institution
            drug = need_row.drug
            year = need_row.year
        elif institution and drug and year:
            need_row = NeedRow.objects.filter(
                institution=institution,
                drug=drug,
                year=year,
            ).first()

            if need_row:
                attrs["need_row"] = need_row

        if not need_row:
            raise serializers.ValidationError({
                "non_field_errors": [
                    "Аввал ушбу муассаса, дори ва йил учун асосий эҳтиёж қатори киритилиши керак."
                ]
            })

        added_qty = attrs.get("added_qty")
        if added_qty is None and instance:
            added_qty = instance.added_qty
        added_qty = added_qty or Decimal("0")

        dpm = attrs.get("dpm_need_add")
        if dpm is None:
            dpm = instance.dpm_need_add if instance else Decimal("0")
        dpm = dpm or Decimal("0")

        amb = attrs.get("amb_rec_need_add")
        if amb is None:
            amb = instance.amb_rec_need_add if instance else Decimal("0")
        amb = amb or Decimal("0")

        # Эски frontend ҳали added_qty юборса, уни ДПМ қўшимчага ўтказамиз.
        if dpm <= 0 and amb <= 0 and added_qty > 0:
            dpm = added_qty
            attrs["dpm_need_add"] = dpm
            attrs["amb_rec_need_add"] = Decimal("0")

        if dpm < 0:
            raise serializers.ValidationError({
                "dpm_need_add": "ДПМ бўйича қўшимча эҳтиёж манфий бўлиши мумкин эмас."
            })

        if amb < 0:
            raise serializers.ValidationError({
                "amb_rec_need_add": "Амбулатор рецепт бўйича қўшимча эҳтиёж манфий бўлиши мумкин эмас."
            })

        if dpm <= 0 and amb <= 0:
            raise serializers.ValidationError({
                "non_field_errors": [
                    "Камида битта қўшимча эҳтиёж миқдори 0 дан катта бўлиши керак."
                ]
            })

        addition_date = attrs.get("addition_date")
        if addition_date is None and instance:
            addition_date = instance.addition_date

        if addition_date and year and addition_date.year != int(year):
            raise serializers.ValidationError({
                "addition_date": "Қўшимча эҳтиёж санаси танланган йилга мос бўлиши керак."
            })

        reason_raw = attrs.get("reason")
        if reason_raw is None and instance:
            reason_raw = instance.reason

        comment = attrs.get("comment")
        if comment is None and instance:
            comment = instance.comment

        normalized_reason, normalized_comment = self.normalize_reason(reason_raw, comment)

        if normalized_reason == NeedAddition.REASON_OTHER and not (normalized_comment or "").strip():
            raise serializers.ValidationError({
                "comment": "Сабаб 'Бошқа' бўлса, изоҳ киритиш мажбурий."
            })

        attrs["reason"] = normalized_reason
        attrs["comment"] = normalized_comment or ""

        # Бекор қилиш validation: ҳисобдан чиқса ҳам берилган миқдор жами эҳтиёждан ошиб кетмасин.
        new_is_active = attrs.get("is_active")
        if new_is_active is None:
            new_is_active = instance.is_active if instance else True

        if instance and instance.is_active and new_is_active is False:
            cancel_reason = attrs.get("cancel_reason", instance.cancel_reason or "")
            if not (cancel_reason or "").strip():
                raise serializers.ValidationError({
                    "cancel_reason": "Қўшимча эҳтиёжни бекор қилиш сабабини киритинг."
                })

            active_additions_without_this = get_need_addition_total(
                need_row=need_row,
                active_only=True,
            ) - (instance.total_additional_need or Decimal("0"))

            total_need_after_cancel = (need_row.yearly_need or Decimal("0")) + active_additions_without_this

            issued_total = MonthlyIssue.objects.filter(
                institution=need_row.institution,
                drug=need_row.drug,
                year=need_row.year,
            ).aggregate(
                total=Coalesce(Sum("issued_qty"), dec_zero_3())
            )["total"] or Decimal("0")

            if issued_total > total_need_after_cancel:
                raise serializers.ValidationError({
                    "non_field_errors": [
                        f"Бекор қилиб бўлмайди: берилган миқдор {issued_total}, "
                        f"бекор қилингандан кейин жами эҳтиёж {total_need_after_cancel} бўлиб қолади."
                    ]
                })

        return attrs


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = [
            "id",
            "name",
            "description",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class RoleMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ["id", "name", "is_active"]


class PagePermissionSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source="role.name", read_only=True)
    page_label = serializers.SerializerMethodField()

    class Meta:
        model = PagePermission
        fields = [
            "id",
            "role",
            "role_name",
            "page_code",
            "page_label",
            *PERMISSION_FIELD_NAMES,
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at", "role_name", "page_label"]

    def get_page_label(self, obj):
        return get_page_label(obj.page_code)

    def validate(self, attrs):
        role = attrs.get("role") or (self.instance.role if self.instance else None)
        page_code = attrs.get("page_code") or (self.instance.page_code if self.instance else None)

        if role and not role.is_active:
            raise serializers.ValidationError({"role": "Фаол бўлмаган рольга доступ бириктириб бўлмайди."})

        if role and page_code:
            qs = PagePermission.objects.filter(role=role, page_code=page_code)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError({
                    "non_field_errors": [
                        "Ушбу роль учун мазкур саҳифа доступи аллақачон мавжуд."
                    ]
                })

        return attrs


class UserPagePermissionOverrideSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    page_label = serializers.SerializerMethodField()

    class Meta:
        model = UserPagePermissionOverride
        fields = [
            "id",
            "user",
            "username",
            "page_code",
            "page_label",
            *PERMISSION_FIELD_NAMES,
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at", "username", "page_label"]
        extra_kwargs = {
            field_name: {"allow_null": True, "required": False}
            for field_name in PERMISSION_FIELD_NAMES
        }

    def get_page_label(self, obj):
        return get_page_label(obj.page_code)

    def validate(self, attrs):
        user = attrs.get("user") or (self.instance.user if self.instance else None)
        page_code = attrs.get("page_code") or (self.instance.page_code if self.instance else None)

        if user and not user.is_active:
            raise serializers.ValidationError({"user": "Фаол бўлмаган фойдаланувчига override бериш мумкин эмас."})

        if user and page_code:
            qs = UserPagePermissionOverride.objects.filter(user=user, page_code=page_code)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError({
                    "non_field_errors": [
                        "Ушбу фойдаланувчи учун мазкур саҳифа override аллақачон мавжуд."
                    ]
                })

        if all(
            attrs.get(field_name, getattr(self.instance, field_name, None) if self.instance else None) is None
            for field_name in PERMISSION_FIELD_NAMES
        ):
            raise serializers.ValidationError({
                "non_field_errors": [
                    "Камида битта override ҳуқуқи белгиланиши керак."
                ]
            })

        return attrs


class UserRoleMixin:
    def get_role(self, obj):
        role = resolve_user_role(obj)
        if not role:
            return None
        return RoleMiniSerializer(role).data

    def get_full_name(self, obj):
        full_name = f"{obj.first_name} {obj.last_name}".strip()
        return full_name or obj.username


class ManagedUserSerializer(UserRoleMixin, serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    password_policy = serializers.SerializerMethodField()
    must_change_password = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "full_name",
            "email",
            "is_active",
            "is_staff",
            "is_superuser",
            "role",
            "password_policy",
            "must_change_password",
        ]
    def get_password_policy(self, obj):
        profile, _created = UserProfile.objects.get_or_create(user=obj)
        return profile.password_policy

    def get_must_change_password(self, obj):
        profile, _created = UserProfile.objects.get_or_create(user=obj)
        return profile.must_change_password


class ManagedUserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    role_id = serializers.IntegerField(required=False, allow_null=True, write_only=True)
    password_policy = serializers.ChoiceField(
        choices=UserProfile.PASSWORD_POLICY_CHOICES,
        required=False,
        default="medium",
        write_only=True,
    )
    must_change_password = serializers.BooleanField(
        required=False,
        default=False,
        write_only=True,
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "password",
            "first_name",
            "last_name",
            "email",
            "is_active",
            "is_staff",
            "role_id",
            "password_policy",
            "must_change_password",
        ]
        read_only_fields = ["id"]

    def validate_role_id(self, value):
        if value is None:
            return value
        if not Role.objects.filter(id=value, is_active=True).exists():
            raise serializers.ValidationError("Танланган роль топилмади ёки фаол эмас.")
        return value

    def validate_password(self, value):
        policy = self.initial_data.get("password_policy", "medium")
        return validate_password_by_policy(value, policy)

    def create(self, validated_data):
        role_id = validated_data.pop("role_id", None)
        password = validated_data.pop("password")
        password_policy = validated_data.pop("password_policy", "medium")
        must_change_password = validated_data.pop("must_change_password", False)

        user = User.objects.create_user(password=password, **validated_data)

        profile, _created = UserProfile.objects.get_or_create(user=user)
        profile.role = Role.objects.filter(id=role_id).first() if role_id else None
        profile.password_policy = password_policy
        profile.must_change_password = must_change_password
        profile.save()

        return user

class ManagedUserUpdateSerializer(serializers.ModelSerializer):
    role_id = serializers.IntegerField(required=False, allow_null=True, write_only=True)
    password_policy = serializers.ChoiceField(
        choices=UserProfile.PASSWORD_POLICY_CHOICES,
        required=False,
        write_only=True,
    )
    must_change_password = serializers.BooleanField(
        required=False,
        write_only=True,
    )

    class Meta:
        model = User
        fields = [
            "first_name",
            "last_name",
            "email",
            "is_active",
            "is_staff",
            "role_id",
            "password_policy",
            "must_change_password",
        ]

    def validate_role_id(self, value):
        if value is None:
            return value
        if not Role.objects.filter(id=value, is_active=True).exists():
            raise serializers.ValidationError("Танланган роль топилмади ёки фаол эмас.")
        return value

    def update(self, instance, validated_data):
        role_id = validated_data.pop("role_id", serializers.empty)
        password_policy = validated_data.pop("password_policy", serializers.empty)
        must_change_password = validated_data.pop("must_change_password", serializers.empty)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        profile, _created = UserProfile.objects.get_or_create(user=instance)

        if role_id is not serializers.empty:
            profile.role = Role.objects.filter(id=role_id).first() if role_id else None

        if password_policy is not serializers.empty:
            profile.password_policy = password_policy

        if must_change_password is not serializers.empty:
            profile.must_change_password = must_change_password

        profile.save()
        return instance


class AdminSetPasswordSerializer(serializers.Serializer):
    new_password = serializers.CharField(write_only=True, trim_whitespace=False)
    password_policy = serializers.ChoiceField(
        choices=UserProfile.PASSWORD_POLICY_CHOICES,
        required=False,
        default="medium",
        write_only=True,
    )
    must_change_password = serializers.BooleanField(
        required=False,
        default=False,
        write_only=True,
    )

    def validate_new_password(self, value):
        policy = self.initial_data.get("password_policy", "medium")
        return validate_password_by_policy(value, policy)
    
class SelfChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True, trim_whitespace=False)
    new_password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Жорий пароль нотўғри.")
        return value

    def validate_new_password(self, value):
        user = self.context["request"].user
        profile, _created = UserProfile.objects.get_or_create(user=user)
        return validate_password_by_policy(value, profile.password_policy)

class CurrentUserSerializer(UserRoleMixin, serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()
    allowed_pages = serializers.SerializerMethodField()

    password_policy = serializers.SerializerMethodField()
    must_change_password = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "full_name",
            "email",
            "is_active",
            "is_staff",
            "is_superuser",
            "role",
            "permissions",
            "allowed_pages",
            "password_policy",
            "must_change_password",
        ]

    def get_permissions(self, obj):
        return resolve_user_page_permissions(obj)

    def get_allowed_pages(self, obj):
        permissions = resolve_user_page_permissions(obj)
        allowed_pages = []
        for page_code, values in permissions.items():
            if page_code == "access_management":
                if values.get("manage_access"):
                    allowed_pages.append(page_code)
            elif values.get("view"):
                allowed_pages.append(page_code)
        return allowed_pages
    
    def get_password_policy(self, obj):
        profile, _created = UserProfile.objects.get_or_create(user=obj)
        return profile.password_policy

    def get_must_change_password(self, obj):
        profile, _created = UserProfile.objects.get_or_create(user=obj)
        return profile.must_change_password


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        request = self.context.get("request")
        user = authenticate(
            request=request,
            username=attrs.get("username"),
            password=attrs.get("password"),
        )

        if not user:
            raise serializers.ValidationError({
                "non_field_errors": ["Логин ёки пароль нотўғри."]
            })

        if not user.is_active:
            raise serializers.ValidationError({
                "non_field_errors": ["Ушбу фойдаланувчи фаол эмас."]
            })

        attrs["user"] = user
        return attrs


class AccessMetaSerializer(serializers.Serializer):
    pages = serializers.SerializerMethodField()
    actions = serializers.SerializerMethodField()

    def get_pages(self, _obj):
        from .constants import PAGE_DEFINITIONS

        return [
            {"code": page_code, "label": page_label}
            for page_code, page_label in PAGE_DEFINITIONS
        ]

    def get_actions(self, _obj):
        return [
            {"code": code, "label": label}
            for code, label in ACTION_DEFINITIONS
        ]


# --- Drug dictionary strict validation patch ---
# Дори паспортида доза бирлиги, дори тури ва ўлчов бирлиги
# фақат DrugOption справочниги ёки унинг алиаслари орқали қабул қилинади.
from rest_framework import serializers as _drug_dict_serializers
from .models import Drug as _DrugForDictionaryGuard
from .drug_normalizer import (
    KIND_DOSAGE_UNIT as _KIND_DOSAGE_UNIT,
    KIND_DOSAGE_FORM as _KIND_DOSAGE_FORM,
    KIND_MEASURE_UNIT as _KIND_MEASURE_UNIT,
    normalize_drug_for_save as _normalize_drug_for_save,
    normalize_option_strict as _normalize_option_strict,
)

_DrugSerializer_original_validate = getattr(DrugSerializer, "validate", None)

def _DrugSerializer_validate_with_dictionary_guard(self, attrs):
    attrs = dict(attrs)

    instance = getattr(self, "instance", None)
    data = {}

    if instance is not None:
        for field in [
            "name",
            "mnn_name",
            "dosage_value",
            "dosage_unit",
            "package_quantity",
            "dosage_form",
            "unit",
            "manufacturer",
            "is_active",
        ]:
            data[field] = getattr(instance, field, "")

    data.update(attrs)

    checks = [
        ("dosage_unit", _KIND_DOSAGE_UNIT, "Доза бирлиги"),
        ("dosage_form", _KIND_DOSAGE_FORM, "Дори тури"),
        ("unit", _KIND_MEASURE_UNIT, "Ўлчов бирлиги"),
    ]

    errors = {}

    for field, kind, label in checks:
        raw = data.get(field, "")
        try:
            normalized = _normalize_option_strict(raw, kind)
        except ValueError as exc:
            errors[field] = f"{label}: {exc}"
        else:
            attrs[field] = normalized
            data[field] = normalized

    if errors:
        raise _drug_dict_serializers.ValidationError(errors)

    probe = _DrugForDictionaryGuard(
        name=data.get("name", ""),
        mnn_name=data.get("mnn_name", ""),
        dosage_value=data.get("dosage_value", ""),
        dosage_unit=data.get("dosage_unit", ""),
        package_quantity=data.get("package_quantity", ""),
        dosage_form=data.get("dosage_form", ""),
        unit=data.get("unit", ""),
        manufacturer=data.get("manufacturer", None),
        is_active=data.get("is_active", True),
    )

    _normalize_drug_for_save(probe)

    attrs["name"] = probe.name
    attrs["mnn_name"] = probe.mnn_name
    attrs["dosage_value"] = probe.dosage_value
    attrs["dosage_unit"] = probe.dosage_unit
    attrs["package_quantity"] = probe.package_quantity
    attrs["dosage_form"] = probe.dosage_form
    attrs["unit"] = probe.unit
    attrs["manufacturer"] = probe.manufacturer

    if _DrugSerializer_original_validate:
        attrs = _DrugSerializer_original_validate(self, attrs)

    return attrs

DrugSerializer.validate = _DrugSerializer_validate_with_dictionary_guard
# --- /Drug dictionary strict validation patch ---

# --- NEED ADDITIONS EXTENSION V1 ---
# Йил давомидаги қўшимча эҳтиёжлар журнали учун serializer ва ҳисобланган майдонлар.

from decimal import Decimal as _NeedAddDecimal

from django.db.models import Sum as _NeedAddSum
from rest_framework import serializers as _need_add_serializers

from .models import (
    NeedAddition as _NeedAddition,
    NeedRow as _NeedRow,
    MonthlyIssue as _MonthlyIssue,
)
from .need_addition_utils import (
    need_row_addition_summary as _need_row_addition_summary,
    active_additions_for_need_row as _need_active_additions_for_need_row,
)


def _need_add_decimal(value):
    if value is None or value == "":
        return _NeedAddDecimal("0")
    if isinstance(value, _NeedAddDecimal):
        return value
    return _NeedAddDecimal(str(value))


class NeedAdditionSerializer(_need_add_serializers.ModelSerializer):
    reason_display = _need_add_serializers.CharField(source="get_reason_display", read_only=True)
    document_number = _need_add_serializers.SerializerMethodField()
    document_date = _need_add_serializers.SerializerMethodField()
    institution_name = _need_add_serializers.SerializerMethodField()
    institution_inn = _need_add_serializers.SerializerMethodField()
    drug_name = _need_add_serializers.SerializerMethodField()
    need_row_display = _need_add_serializers.SerializerMethodField()
    created_by_username = _need_add_serializers.SerializerMethodField()

    class Meta:
        model = _NeedAddition
        fields = [
            "id",
            "need_row",
            "need_row_display",
            "institution",
            "institution_name",
            "institution_inn",
            "drug",
            "drug_name",
            "year",
            "addition_date",
            "dpm_need_add",
            "amb_rec_need_add",
            "total_additional_need",
            "added_qty",
            "reason",
            "reason_display",
            "doc_number",
            "doc_date",
            "document_number",
            "document_date",
            "comment",
            "is_active",
            "cancel_reason",
            "created_by",
            "created_by_username",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "institution",
            "drug",
            "year",
            "total_additional_need",
            "added_qty",
            "created_by",
            "created_at",
            "updated_at",
        ]

    def to_internal_value(self, data):
        data = data.copy()

        if data.get("need_row_id") and not data.get("need_row"):
            data["need_row"] = data.get("need_row_id")

        if data.get("document_number") and not data.get("doc_number"):
            data["doc_number"] = data.get("document_number")

        if data.get("document_date") and not data.get("doc_date"):
            data["doc_date"] = data.get("document_date")

        return super().to_internal_value(data)

    def get_document_number(self, obj):
        return obj.doc_number or ""

    def get_document_date(self, obj):
        return obj.doc_date

    def get_institution_name(self, obj):
        if obj.need_row_id:
            return obj.need_row.institution.name
        return obj.institution.name if obj.institution_id else ""

    def get_institution_inn(self, obj):
        if obj.need_row_id:
            return obj.need_row.institution.inn or ""
        return obj.institution.inn if obj.institution_id else ""

    def get_drug_name(self, obj):
        if obj.need_row_id:
            return obj.need_row.drug.display_name
        return obj.drug.display_name if obj.drug_id else ""

    def get_need_row_display(self, obj):
        return str(obj.need_row) if obj.need_row_id else ""

    def get_created_by_username(self, obj):
        return obj.created_by.username if obj.created_by_id else ""

    def validate(self, attrs):
        instance = getattr(self, "instance", None)

        need_row = attrs.get("need_row")
        if need_row is None and instance is not None:
            need_row = instance.need_row

        if need_row is None:
            raise _need_add_serializers.ValidationError({
                "need_row": "Аввал асосий эҳтиёж қатори танланиши керак."
            })

        dpm = _need_add_decimal(
            attrs.get(
                "dpm_need_add",
                getattr(instance, "dpm_need_add", 0) if instance is not None else 0,
            )
        )
        amb = _need_add_decimal(
            attrs.get(
                "amb_rec_need_add",
                getattr(instance, "amb_rec_need_add", 0) if instance is not None else 0,
            )
        )

        errors = {}

        if dpm < 0:
            errors["dpm_need_add"] = "ДПМ қўшимча эҳтиёж манфий бўлмаслиги керак."

        if amb < 0:
            errors["amb_rec_need_add"] = "Амбулатор рецепт қўшимча эҳтиёж манфий бўлмаслиги керак."

        if dpm + amb <= 0:
            errors["total_additional_need"] = "Камида битта қўшимча эҳтиёж миқдори 0 дан катта бўлиши керак."

        reason = attrs.get(
            "reason",
            getattr(instance, "reason", "") if instance is not None else "",
        )

        if not reason:
            errors["reason"] = "Қўшимча эҳтиёж сабаби танланиши керак."

        comment = str(
            attrs.get(
                "comment",
                getattr(instance, "comment", "") if instance is not None else "",
            )
            or ""
        ).strip()

        if reason == _NeedAddition.REASON_OTHER and not comment:
            errors["comment"] = "Сабаб 'Бошқа' бўлса, изоҳ киритилиши керак."

        new_active = attrs.get(
            "is_active",
            getattr(instance, "is_active", True) if instance is not None else True,
        )
        cancel_reason = str(
            attrs.get(
                "cancel_reason",
                getattr(instance, "cancel_reason", "") if instance is not None else "",
            )
            or ""
        ).strip()

        if new_active is False and not cancel_reason:
            errors["cancel_reason"] = "Қўшимча эҳтиёжни бекор қилиш сабаби киритилиши керак."

        # Таҳрирлаш ёки бекор қилиш берилган миқдордан паст total_yearly_need қолдирмасин.
        if instance is not None:
            other_total = _need_active_additions_for_need_row(need_row).exclude(pk=instance.pk).aggregate(
                s=_NeedAddSum("total_additional_need")
            ).get("s")
            other_total = _need_add_decimal(other_total)

            this_total = dpm + amb if bool(new_active) else _NeedAddDecimal("0")
            projected_total = _need_add_decimal(need_row.yearly_need) + other_total + this_total

            issue = _MonthlyIssue.objects.filter(
                institution_id=need_row.institution_id,
                drug_id=need_row.drug_id,
                year=need_row.year,
            ).first()
            issued = _need_add_decimal(issue.issued_qty) if issue else _NeedAddDecimal("0")

            if issued > projected_total:
                errors["is_active"] = (
                    "Бу ўзгаришдан кейин жами эҳтиёж берилган миқдордан кам бўлиб қолади. "
                    f"Берилган: {issued}, янги жами эҳтиёж: {projected_total}"
                )

        if errors:
            raise _need_add_serializers.ValidationError(errors)

        attrs["need_row"] = need_row
        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            validated_data["created_by"] = request.user

        return super().create(validated_data)


try:
    _BaseNeedRowSerializerForAdditions = NeedRowSerializer
except NameError:
    _BaseNeedRowSerializerForAdditions = None


def _extend_needrow_fields(base_fields):
    extra_fields = [
        "base_yearly_need",
        "additional_dpm_need",
        "additional_amb_rec_need",
        "additional_yearly_need",
        "total_yearly_need",
        "total_quarterly_need",
        "additional_percent",
        "additional_count",
        "last_additional_date",
        "additional_risk_status",
        "additional_reason_summary",
    ]

    if base_fields == "__all__":
        return "__all__"

    fields = list(base_fields or [])
    for field in extra_fields:
        if field not in fields:
            fields.append(field)

    return fields


if _BaseNeedRowSerializerForAdditions is not None:
    class NeedRowSerializer(_BaseNeedRowSerializerForAdditions):
        base_yearly_need = _need_add_serializers.SerializerMethodField()
        additional_dpm_need = _need_add_serializers.SerializerMethodField()
        additional_amb_rec_need = _need_add_serializers.SerializerMethodField()
        additional_yearly_need = _need_add_serializers.SerializerMethodField()
        total_yearly_need = _need_add_serializers.SerializerMethodField()
        total_quarterly_need = _need_add_serializers.SerializerMethodField()
        additional_percent = _need_add_serializers.SerializerMethodField()
        additional_count = _need_add_serializers.SerializerMethodField()
        last_additional_date = _need_add_serializers.SerializerMethodField()
        additional_risk_status = _need_add_serializers.SerializerMethodField()
        additional_reason_summary = _need_add_serializers.SerializerMethodField()

        class Meta(_BaseNeedRowSerializerForAdditions.Meta):
            fields = _extend_needrow_fields(
                getattr(_BaseNeedRowSerializerForAdditions.Meta, "fields", "__all__")
            )
            read_only_fields = list(
                getattr(_BaseNeedRowSerializerForAdditions.Meta, "read_only_fields", [])
            ) + [
                "base_yearly_need",
                "additional_dpm_need",
                "additional_amb_rec_need",
                "additional_yearly_need",
                "total_yearly_need",
                "total_quarterly_need",
                "additional_percent",
                "additional_count",
                "last_additional_date",
                "additional_risk_status",
                "additional_reason_summary",
            ]

        def _summary(self, obj):
            return _need_row_addition_summary(obj)

        def get_base_yearly_need(self, obj):
            return self._summary(obj)["base_yearly_need"]

        def get_additional_dpm_need(self, obj):
            return self._summary(obj)["additional_dpm_need"]

        def get_additional_amb_rec_need(self, obj):
            return self._summary(obj)["additional_amb_rec_need"]

        def get_additional_yearly_need(self, obj):
            return self._summary(obj)["additional_yearly_need"]

        def get_total_yearly_need(self, obj):
            return self._summary(obj)["total_yearly_need"]

        def get_total_quarterly_need(self, obj):
            return self._summary(obj)["total_quarterly_need"]

        def get_additional_percent(self, obj):
            return self._summary(obj)["additional_percent"]

        def get_additional_count(self, obj):
            return self._summary(obj)["additional_count"]

        def get_last_additional_date(self, obj):
            return self._summary(obj)["last_additional_date"]

        def get_additional_risk_status(self, obj):
            return self._summary(obj)["additional_risk_status"]

        def get_additional_reason_summary(self, obj):
            return self._summary(obj)["additional_reason_summary"]


try:
    _BaseMonthlyIssueSerializerForAdditions = MonthlyIssueSerializer
except NameError:
    _BaseMonthlyIssueSerializerForAdditions = None


if _BaseMonthlyIssueSerializerForAdditions is not None:
    class MonthlyIssueSerializer(_BaseMonthlyIssueSerializerForAdditions):
        def validate(self, attrs):
            instance = getattr(self, "instance", None)

            institution = attrs.get("institution", getattr(instance, "institution", None) if instance else None)
            drug = attrs.get("drug", getattr(instance, "drug", None) if instance else None)
            year = attrs.get("year", getattr(instance, "year", None) if instance else None)
            issued_qty = _need_add_decimal(
                attrs.get("issued_qty", getattr(instance, "issued_qty", 0) if instance else 0)
            )

            errors = {}

            if issued_qty < 0:
                errors["issued_qty"] = "Берилган миқдор манфий бўлмаслиги керак."

            if institution and drug and year:
                need_row = _NeedRow.objects.filter(
                    institution=institution,
                    drug=drug,
                    year=year,
                ).first()

                if not need_row:
                    errors["need_row"] = "Аввал ушбу муассаса, дори ва йил учун асосий эҳтиёж киритилиши керак."
                else:
                    total_need = _need_row_addition_summary(need_row)["total_yearly_need"]
                    if issued_qty > total_need:
                        errors["issued_qty"] = (
                            "Берилган миқдор жами эҳтиёждан ошиб кетмаслиги керак. "
                            f"Жами эҳтиёж: {total_need}, киритилган: {issued_qty}"
                        )

            if errors:
                raise _need_add_serializers.ValidationError(errors)

            return attrs


# --- TZ_STABLE_SERIALIZER_FIX_V2 ---
# Т бўйича стабилизация:
# 1) ўшимча эҳтиёжлар эски frontend/test compatibility билан ишласин:
#    need_row ёки institution+drug+year орқали қабул қилинади.
#    added_qty эски формат сифатида  қўшимчага туширилади.
# 2) ерилган миқдор create пайтида мавжуд MonthlyIssue устига қўшиладиган
#    жами миқдор total_yearly_need дан ошиб кетмасин.

try:
    _TZ_Decimal = _NeedAddDecimal
except NameError:
    _TZ_Decimal = Decimal

try:
    _TZ_Serializers = _need_add_serializers
except NameError:
    _TZ_Serializers = serializers

try:
    _TZ_Sum = _NeedAddSum
except NameError:
    from django.db.models import Sum as _TZ_Sum

try:
    _TZ_NeedAddition = _NeedAddition
except NameError:
    _TZ_NeedAddition = NeedAddition

try:
    _TZ_NeedRow = _NeedRow
except NameError:
    _TZ_NeedRow = NeedRow

try:
    _TZ_MonthlyIssue = _MonthlyIssue
except NameError:
    _TZ_MonthlyIssue = MonthlyIssue


def _tz_decimal(value):
    if value is None or value == "":
        return _TZ_Decimal("0")
    if isinstance(value, _TZ_Decimal):
        return value
    return _TZ_Decimal(str(value))


def _tz_need_total_for_row(need_row):
    try:
        return _tz_decimal(_need_row_addition_summary(need_row)["total_yearly_need"])
    except Exception:
        try:
            return _tz_decimal(need_row.yearly_need) + _tz_decimal(
                get_need_addition_total(need_row=need_row)
            )
        except Exception:
            return _tz_decimal(need_row.yearly_need)


def _tz_normalize_need_add_reason(raw_reason, comment):
    valid_codes = {code for code, _label in _TZ_NeedAddition.REASON_CHOICES}

    raw_reason = str(raw_reason or "").strip()
    comment = str(comment or "").strip()

    if raw_reason in valid_codes:
        return raw_reason, comment

    lower = raw_reason.lower()

    if "кам" in lower or "ҳисоб" in lower or "хисоб" in lower:
        return _TZ_NeedAddition.REASON_BASE_UNDERESTIMATED, comment

    if "бўлим" in lower or "булим" in lower:
        return _TZ_NeedAddition.REASON_NEW_DEPARTMENT, comment

    if "бемор" in lower:
        return _TZ_NeedAddition.REASON_PATIENT_INCREASE, comment

    if "клиника" in lower:
        return _TZ_NeedAddition.REASON_NEW_CLINIC, comment

    if "ссв" in lower or "топшир" in lower or "буйру" in lower:
        return _TZ_NeedAddition.REASON_SSV_ORDER, comment

    if "тузат" in lower or "корр" in lower:
        return _TZ_NeedAddition.REASON_CORRECTION, comment

    if raw_reason and not comment:
        comment = raw_reason

    return _TZ_NeedAddition.REASON_OTHER, comment


# NeedAdditionSerializer field compatibility
try:
    _TZ_ORIG_NEED_ADDITION_GET_FIELDS = NeedAdditionSerializer.get_fields

    def _tz_need_addition_get_fields(self):
        fields = _TZ_ORIG_NEED_ADDITION_GET_FIELDS(self)

        # reason choices эмас, text қабул қилиб validate ичида нормализация қиламиз.
        fields["reason"] = _TZ_Serializers.CharField(required=True, allow_blank=False)

        # ски frontend/test compatibility: need_row ўрнига institution+drug+year келиши мумкин.
        fields["institution"] = _TZ_Serializers.PrimaryKeyRelatedField(
            queryset=Institution.objects.all(),
            required=False,
            allow_null=True,
        )
        fields["drug"] = _TZ_Serializers.PrimaryKeyRelatedField(
            queryset=Drug.objects.all(),
            required=False,
            allow_null=True,
        )
        fields["year"] = _TZ_Serializers.IntegerField(required=False)
        fields["added_qty"] = _TZ_Serializers.DecimalField(
            max_digits=14,
            decimal_places=3,
            required=False,
        )

        return fields

    NeedAdditionSerializer.get_fields = _tz_need_addition_get_fields
except Exception:
    pass


def _tz_need_addition_validate(self, attrs):
    instance = getattr(self, "instance", None)
    errors = {}

    need_row = attrs.get("need_row") or (instance.need_row if instance is not None else None)

    institution = attrs.get("institution") or (instance.institution if instance is not None else None)
    drug = attrs.get("drug") or (instance.drug if instance is not None else None)
    year = attrs.get("year") or (instance.year if instance is not None else None)

    if need_row is None and institution is not None and drug is not None and year is not None:
        need_row = _TZ_NeedRow.objects.filter(
            institution=institution,
            drug=drug,
            year=year,
        ).first()

    if need_row is None:
        errors["need_row"] = "ввал ушбу муассаса, дори ва йил учун асосий эҳтиёж қатори танланиши керак."
    else:
        attrs["need_row"] = need_row
        attrs["institution"] = need_row.institution
        attrs["drug"] = need_row.drug
        attrs["year"] = need_row.year
        institution = need_row.institution
        drug = need_row.drug
        year = need_row.year

    added_qty = _tz_decimal(
        attrs.get(
            "added_qty",
            getattr(instance, "added_qty", 0) if instance is not None else 0,
        )
    )

    dpm = _tz_decimal(
        attrs.get(
            "dpm_need_add",
            getattr(instance, "dpm_need_add", 0) if instance is not None else 0,
        )
    )

    amb = _tz_decimal(
        attrs.get(
            "amb_rec_need_add",
            getattr(instance, "amb_rec_need_add", 0) if instance is not None else 0,
        )
    )

    # ски формат: added_qty келса, уни  қўшимча деб қабул қиламиз.
    if dpm <= 0 and amb <= 0 and added_qty > 0:
        dpm = added_qty
        amb = _TZ_Decimal("0")
        attrs["dpm_need_add"] = dpm
        attrs["amb_rec_need_add"] = amb

    if dpm < 0:
        errors["dpm_need_add"] = " қўшимча эҳтиёж манфий бўлмаслиги керак."

    if amb < 0:
        errors["amb_rec_need_add"] = "мбулатор рецепт қўшимча эҳтиёж манфий бўлмаслиги керак."

    if dpm + amb <= 0:
        errors["total_additional_need"] = "амида битта қўшимча эҳтиёж миқдори 0 дан катта бўлиши керак."

    attrs["dpm_need_add"] = dpm
    attrs["amb_rec_need_add"] = amb
    attrs["total_additional_need"] = (dpm + amb).quantize(_TZ_Decimal("0.001"))
    attrs["added_qty"] = attrs["total_additional_need"]

    addition_date = attrs.get("addition_date") or (
        instance.addition_date if instance is not None else None
    )

    if addition_date and year and addition_date.year != int(year):
        errors["addition_date"] = "ўшимча эҳтиёж санаси танланган йилга мос бўлиши керак."

    reason_raw = attrs.get("reason")
    if reason_raw is None and instance is not None:
        reason_raw = instance.reason

    if not str(reason_raw or "").strip():
        errors["reason"] = "ўшимча эҳтиёж сабаби танланиши керак."
    else:
        comment = attrs.get("comment")
        if comment is None and instance is not None:
            comment = instance.comment

        normalized_reason, normalized_comment = _tz_normalize_need_add_reason(
            reason_raw,
            comment,
        )

        if normalized_reason == _TZ_NeedAddition.REASON_OTHER and not normalized_comment:
            errors["comment"] = "Сабаб 'ошқа' бўлса, изоҳ киритилиши керак."

        attrs["reason"] = normalized_reason
        attrs["comment"] = normalized_comment or ""

    new_active = attrs.get(
        "is_active",
        instance.is_active if instance is not None else True,
    )

    if instance is not None and instance.is_active and new_active is False:
        cancel_reason = str(
            attrs.get("cancel_reason", instance.cancel_reason or "") or ""
        ).strip()

        if not cancel_reason:
            errors["cancel_reason"] = "ўшимча эҳтиёжни бекор қилиш сабаби киритилиши керак."

        if need_row is not None:
            try:
                other_total = _need_active_additions_for_need_row(need_row).exclude(
                    pk=instance.pk
                ).aggregate(s=_TZ_Sum("total_additional_need")).get("s")
            except Exception:
                other_total = _TZ_NeedAddition.objects.filter(
                    need_row=need_row,
                    is_active=True,
                ).exclude(pk=instance.pk).aggregate(
                    s=_TZ_Sum("total_additional_need")
                ).get("s")

            other_total = _tz_decimal(other_total)
            projected_total = _tz_decimal(need_row.yearly_need) + other_total

            issue = _TZ_MonthlyIssue.objects.filter(
                institution=need_row.institution,
                drug=need_row.drug,
                year=need_row.year,
            ).first()

            issued = _tz_decimal(issue.issued_qty) if issue else _TZ_Decimal("0")

            if issued > projected_total:
                errors["is_active"] = (
                    "у қўшимча эҳтиёжни бекор қилиб бўлмайди: "
                    f"берилган миқдор {issued}, бекор қилинганда жами эҳтиёж {projected_total} бўлиб қолади."
                )

    if errors:
        raise _TZ_Serializers.ValidationError(errors)

    return attrs


try:
    NeedAdditionSerializer.validate = _tz_need_addition_validate
except Exception:
    pass


def _tz_monthly_issue_validate(self, attrs):
    instance = getattr(self, "instance", None)
    errors = {}

    institution = attrs.get("institution") or (
        instance.institution if instance is not None else None
    )
    drug = attrs.get("drug") or (
        instance.drug if instance is not None else None
    )
    year = attrs.get("year") or (
        instance.year if instance is not None else None
    )

    if "issued_qty" in attrs:
        issued_qty = attrs["issued_qty"]
    elif instance is not None:
        issued_qty = instance.issued_qty
    else:
        issued_qty = None

    if not institution or not drug or not year or issued_qty is None:
        return attrs

    issued_qty = _tz_decimal(issued_qty)

    if issued_qty < 0:
        errors["issued_qty"] = "ерилган миқдор манфий бўлмаслиги керак."

    need_row = _TZ_NeedRow.objects.filter(
        institution=institution,
        drug=drug,
        year=year,
    ).first()

    if need_row is None:
        errors["need_row"] = "ввал ушбу муассаса, дори ва йил учун асосий эҳтиёж киритилиши керак."
    else:
        total_need = _tz_need_total_for_row(need_row)

        same_qs = _TZ_MonthlyIssue.objects.filter(
            institution=institution,
            drug=drug,
            year=year,
        )

        if instance is not None:
            same_qs = same_qs.exclude(pk=instance.pk)

        existing = same_qs.first()

        if instance is None and existing is not None:
            checked_total = _tz_decimal(existing.issued_qty) + issued_qty
        else:
            checked_total = issued_qty

        if checked_total > total_need:
            errors["issued_qty"] = (
                "ерилган миқдор жами эҳтиёждан ошиб кетмаслиги керак. "
                f"ами эҳтиёж: {total_need}, киритилган/янги жами: {checked_total}"
            )

    if errors:
        raise _TZ_Serializers.ValidationError(errors)

    return attrs


try:
    MonthlyIssueSerializer.validate = _tz_monthly_issue_validate
except Exception:
    pass
# --- /TZ_STABLE_SERIALIZER_FIX_V2 ---



# --- PROFESSIONAL TRADE / REFERENCE PRICE SERIALIZERS 2026-05-26 ---
from .models import Supplier, TradeBranch, ReferencePrice, StockBatch


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = "__all__"

    def validate_name(self, value):
        value = str(value or "").strip()
        if not value:
            raise serializers.ValidationError("Таъминотчи номи мажбурий.")
        return value


class TradeBranchSerializer(serializers.ModelSerializer):
    branch_type_label = serializers.CharField(source="get_branch_type_display", read_only=True)

    class Meta:
        model = TradeBranch
        fields = "__all__"
        read_only_fields = ["branch_type_label"]


class ReferencePriceSerializer(serializers.ModelSerializer):
    drug_name = serializers.CharField(source="drug.display_name", read_only=True)
    price_type_label = serializers.CharField(source="get_price_type_display", read_only=True)

    class Meta:
        model = ReferencePrice
        fields = "__all__"
        read_only_fields = ["drug_name", "price_type_label"]

    def validate(self, attrs):
        is_limited = attrs.get("is_limited")
        price = attrs.get("price")

        if is_limited is None and self.instance is not None:
            is_limited = self.instance.is_limited
        if price is None and self.instance is not None:
            price = self.instance.price

        if is_limited is False:
            attrs["price"] = None
        elif price is None or price <= 0:
            raise serializers.ValidationError({"price": "Референт чеклов бор бўлса нарх 0 дан катта бўлиши керак."})

        return attrs


class StockBatchSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(source="branch.name", read_only=True)
    branch_type = serializers.CharField(source="branch.branch_type", read_only=True)
    drug_name = serializers.CharField(source="drug.display_name", read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    sale_blocked = serializers.BooleanField(read_only=True)

    class Meta:
        model = StockBatch
        fields = "__all__"
        read_only_fields = ["branch_name", "branch_type", "drug_name", "supplier_name", "sale_blocked"]

    def validate(self, attrs):
        qty = attrs.get("quantity")
        if qty is None and self.instance is not None:
            qty = self.instance.quantity
        if qty is not None and qty < 0:
            raise serializers.ValidationError({"quantity": "Қолдиқ миқдори манфий бўлиши мумкин эмас."})

        for field in ["purchase_price", "wholesale_price", "retail_price"]:
            value = attrs.get(field)
            if value is not None and value < 0:
                raise serializers.ValidationError({field: "Нарх манфий бўлиши мумкин эмас."})

        return attrs
# --- /PROFESSIONAL TRADE / REFERENCE PRICE SERIALIZERS 2026-05-26 ---
