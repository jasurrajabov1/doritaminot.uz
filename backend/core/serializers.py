from decimal import Decimal

from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import DecimalField, Sum, Value
from django.db.models.functions import Coalesce
from rest_framework import serializers
from .price_utils import get_price_amount

from .constants import ACTION_DEFINITIONS, PERMISSION_FIELD_NAMES, get_page_label
from .models import (
    Drug,
    Institution,
    MonthlyIssue,
    NeedRow,
    PagePermission,
    Price,
    Role,
    UserPagePermissionOverride,
    UserProfile,
)
from .permissions import resolve_user_page_permissions, resolve_user_role

User = get_user_model()


class InstitutionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Institution
        fields = "__all__"


class DrugSerializer(serializers.ModelSerializer):
    class Meta:
        model = Drug
        fields = "__all__"


class PriceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Price
        fields = "__all__"

    def validate(self, attrs):
        drug = attrs.get("drug") or (self.instance.drug if self.instance else None)
        start_date = attrs.get("start_date") or (self.instance.start_date if self.instance else None)

        if drug and start_date:
            qs = Price.objects.filter(drug=drug, start_date=start_date)

            if self.instance:
                qs = qs.exclude(id=self.instance.id)

            if qs.exists():
                raise serializers.ValidationError(
                    "Бу дори учун шу санада нарх аллақачон киритилган."
                )

        return attrs


class MonthlyIssueSerializer(serializers.ModelSerializer):
    class Meta:
        model = MonthlyIssue
        fields = ["id", "institution", "drug", "year", "issued_qty"]
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
                    "Аввал ушбу муассаса, дори ва йил учун потребность қатори киритилиши керак."
                ]
            })

        same_key_qs = MonthlyIssue.objects.filter(
            institution=institution,
            drug=drug,
            year=year,
        )

        if self.instance:
            same_key_qs = same_key_qs.exclude(pk=self.instance.pk)

        if self.instance:
            if issued_qty > need_row.yearly_need:
                raise serializers.ValidationError({
                    "issued_qty": (
                        f"Берилган жами миқдор потребностдан ошиб кетди. "
                        f"Потребност: {need_row.yearly_need}, киритилаётган жами: {issued_qty}"
                    )
                })
        else:
            existing = same_key_qs.first()
            if existing:
                new_total = (existing.issued_qty or Decimal("0")) + issued_qty
                if new_total > need_row.yearly_need:
                    raise serializers.ValidationError({
                        "issued_qty": (
                            f"Потребностдан ошиб кетди. "
                            f"Потребност: {need_row.yearly_need}, "
                            f"ҳозирги жами: {existing.issued_qty}, "
                            f"қўшилаётгани: {issued_qty}, "
                            f"янги жами: {new_total}"
                        )
                    })
            else:
                if issued_qty > need_row.yearly_need:
                    raise serializers.ValidationError({
                        "issued_qty": (
                            f"Берилган жами миқдор потребностдан ошиб кетди. "
                            f"Потребност: {need_row.yearly_need}, киритилаётган жами: {issued_qty}"
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
    given_dpm = serializers.SerializerMethodField()
    remaining = serializers.SerializerMethodField()
    remaining_percent = serializers.SerializerMethodField()

    price = serializers.SerializerMethodField()
    yearly_sum = serializers.SerializerMethodField()
    given_sum = serializers.SerializerMethodField()
    remaining_sum = serializers.SerializerMethodField()

    class Meta:
        model = NeedRow
        fields = [
            "id",
            "institution",
            "drug",
            "year",
            "dpm_need",
            "amb_rec_need",
            "yearly_need",
            "quarterly_need",
            "given_dpm",
            "remaining",
            "remaining_percent",
            "price",
            "yearly_sum",
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

    def get_given_dpm(self, obj):
        return round(float(self.get_given_dpm_value(obj)), 3)

    def get_remaining_value(self, obj):
        return (obj.yearly_need or Decimal("0")) - self.get_given_dpm_value(obj)

    def get_remaining(self, obj):
        return round(float(self.get_remaining_value(obj)), 3)

    def get_remaining_percent(self, obj):
        yearly_need = obj.yearly_need or Decimal("0")
        if yearly_need <= 0:
            return 0

        percent = (self.get_remaining_value(obj) / yearly_need) * Decimal("100")
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
        ]


class ManagedUserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    role_id = serializers.IntegerField(required=False, allow_null=True, write_only=True)

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
        ]
        read_only_fields = ["id"]

    def validate_role_id(self, value):
        if value is None:
            return value
        if not Role.objects.filter(id=value, is_active=True).exists():
            raise serializers.ValidationError("Танланган роль топилмади ёки фаол эмас.")
        return value

    def validate_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages)) from exc
        return value

    def create(self, validated_data):
        role_id = validated_data.pop("role_id", None)
        password = validated_data.pop("password")
        user = User.objects.create_user(password=password, **validated_data)

        profile, _created = UserProfile.objects.get_or_create(user=user)
        profile.role = Role.objects.filter(id=role_id).first() if role_id else None
        profile.save()
        return user


class ManagedUserUpdateSerializer(serializers.ModelSerializer):
    role_id = serializers.IntegerField(required=False, allow_null=True, write_only=True)

    class Meta:
        model = User
        fields = [
            "first_name",
            "last_name",
            "email",
            "is_active",
            "is_staff",
            "role_id",
        ]

    def validate_role_id(self, value):
        if value is None:
            return value
        if not Role.objects.filter(id=value, is_active=True).exists():
            raise serializers.ValidationError("Танланган роль топилмади ёки фаол эмас.")
        return value

    def update(self, instance, validated_data):
        role_id = validated_data.pop("role_id", serializers.empty)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if role_id is not serializers.empty:
            profile, _created = UserProfile.objects.get_or_create(user=instance)
            profile.role = Role.objects.filter(id=role_id).first() if role_id else None
            profile.save()

        return instance


class AdminSetPasswordSerializer(serializers.Serializer):
    new_password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_new_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages)) from exc
        return value


class CurrentUserSerializer(UserRoleMixin, serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()
    allowed_pages = serializers.SerializerMethodField()

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
