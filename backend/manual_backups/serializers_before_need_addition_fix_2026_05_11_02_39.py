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

User = get_user_model()

def dec_zero_3():
    return Value(0, output_field=DecimalField(max_digits=14, decimal_places=3))


def get_need_addition_total(
    institution=None,
    drug=None,
    year=None,
    institution_id=None,
    drug_id=None,
):
    qs = NeedAddition.objects.all()

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

    return qs.aggregate(
        total=Coalesce(Sum("added_qty"), dec_zero_3())
    )["total"] or Decimal("0")


def get_need_total_with_additions(need_row):
    base_need = need_row.yearly_need or Decimal("0")
    added_need = get_need_addition_total(
        institution=need_row.institution,
        drug=need_row.drug,
        year=need_row.year,
    )
    return base_need + added_need

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
    class Meta:
        model = Drug
        fields = "__all__"


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
    drug_name = serializers.CharField(source="drug.name", read_only=True)

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
    drug_name = serializers.CharField(source="drug.name", read_only=True)

    given_dpm = serializers.SerializerMethodField()
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
            "given_dpm",
            "remaining",
            "remaining_percent",
            "price",
            "yearly_sum",
            "given_sum",
            "remaining_sum",
            "institution_name",
            "institution_inn",
            "drug_name",
            "given_dpm",
            "additional_need",
            "total_need",
            "additional_need_percent",
            "addition_count",
            "additional_sum",
            "total_need_sum",
            "remaining",
            "remaining_percent",
            "price",
            "yearly_sum",
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
                        "Бу муассаса, дори ва йил учун потребность қатори аллақачон мавжуд."
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

    def get_additional_need_value(self, obj):
        return get_need_addition_total(
            institution=obj.institution,
            drug=obj.drug,
            year=obj.year,
        )

    def get_additional_need(self, obj):
        return round(float(self.get_additional_need_value(obj)), 3)

    def get_total_need_value(self, obj):
        return (obj.yearly_need or Decimal("0")) + self.get_additional_need_value(obj)

    def get_total_need(self, obj):
        return round(float(self.get_total_need_value(obj)), 3)

    def get_additional_need_percent(self, obj):
        base_need = obj.yearly_need or Decimal("0")

        if base_need <= 0:
            return 0

        percent = (self.get_additional_need_value(obj) / base_need) * Decimal("100")
        return round(float(percent), 2)

    def get_addition_count(self, obj):
        return NeedAddition.objects.filter(
            institution=obj.institution,
            drug=obj.drug,
            year=obj.year,
        ).count()

    def get_given_dpm(self, obj):
        return round(float(self.get_given_dpm_value(obj)), 3)

    def get_remaining_value(self, obj):
        return self.get_total_need_value(obj) - self.get_given_dpm_value(obj)

    def get_remaining(self, obj):
        return round(float(self.get_remaining_value(obj)), 3)

    def get_remaining_percent(self, obj):
        total_need = self.get_total_need_value(obj)

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
        return round(float(self.get_additional_need_value(obj) * price_value), 2)

    def get_total_need_sum(self, obj):
        price_value = self.get_price_value(obj)
        if price_value is None:
            return None
        return round(float(self.get_total_need_value(obj) * price_value), 2)

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
    drug_name = serializers.CharField(source="drug.name", read_only=True)
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)

    class Meta:
        model = NeedAddition
        fields = [
            "id",
            "institution",
            "institution_name",
            "institution_inn",
            "drug",
            "drug_name",
            "year",
            "added_qty",
            "addition_date",
            "reason",
            "doc_number",
            "doc_date",
            "created_by",
            "created_by_username",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "institution_name",
            "institution_inn",
            "drug_name",
            "created_by",
            "created_by_username",
            "created_at",
            "updated_at",
        ]
        validators = []

    def validate(self, attrs):
        instance = getattr(self, "instance", None)

        institution = attrs.get("institution") or (instance.institution if instance else None)
        drug = attrs.get("drug") or (instance.drug if instance else None)
        year = attrs.get("year") or (instance.year if instance else None)
        added_qty = attrs.get("added_qty")

        if added_qty is None and instance:
            added_qty = instance.added_qty

        addition_date = attrs.get("addition_date")
        if addition_date is None and instance:
            addition_date = instance.addition_date

        if added_qty is not None and added_qty <= 0:
            raise serializers.ValidationError({
                "added_qty": "Қўшимча эҳтиёж миқдори 0 дан катта бўлиши керак."
            })

        if institution and drug and year:
            need_row_exists = NeedRow.objects.filter(
                institution=institution,
                drug=drug,
                year=year,
            ).exists()

            if not need_row_exists:
                raise serializers.ValidationError({
                    "non_field_errors": [
                        "Аввал ушбу муассаса, дори ва йил учун асосий эҳтиёж қатори киритилиши керак."
                    ]
                })

        if addition_date and year and addition_date.year != int(year):
            raise serializers.ValidationError({
                "addition_date": "Қўшимча эҳтиёж санаси танланган йилга мос бўлиши керак."
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
