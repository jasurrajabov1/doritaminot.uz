from decimal import Decimal

from django.conf import settings
from django.core.validators import RegexValidator
from django.db import models

from .constants import PAGE_CHOICES


def _decimal_value(value):
    if value is None or value == "":
        return Decimal("0")
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))

from .drug_normalizer import normalize_drug_for_save


class Institution(models.Model):
    name = models.CharField(max_length=255)
    inn = models.CharField(
        max_length=9,
        blank=True,
        default="",
        db_index=True,
        validators=[
            RegexValidator(
                regex=r"^\d{9}$",
                message="ИНН 9 та рақамдан иборат бўлиши керак.",
            )
        ],
    )
    address = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["inn"],
                condition=~models.Q(inn=""),
                name="unique_institution_inn_when_filled",
            )
        ]

    def __str__(self):
        return self.name

class DrugOption(models.Model):
    KIND_DOSAGE_UNIT = "dosage_unit"
    KIND_DOSAGE_FORM = "dosage_form"
    KIND_MEASURE_UNIT = "measure_unit"

    KIND_CHOICES = [
        (KIND_DOSAGE_UNIT, "Доза бирлиги"),
        (KIND_DOSAGE_FORM, "Дори тури"),
        (KIND_MEASURE_UNIT, "Ўлчов бирлиги"),
    ]

    kind = models.CharField(max_length=30, choices=KIND_CHOICES, db_index=True)
    name = models.CharField(max_length=80)
    aliases = models.TextField(
        blank=True,
        default="",
        help_text="Алиаслар: масалан гель, гел; таблетка, табл; упаковка, уп.",
    )
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["kind", "sort_order", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["kind", "name"],
                name="uniq_drug_option_kind_name",
            )
        ]

    def alias_list(self):
        raw = (self.aliases or "").replace(";", ",").replace("\\n", ",")
        return [x.strip() for x in raw.split(",") if x.strip()]

    def save(self, *args, **kwargs):
        self.name = str(self.name or "").strip()
        self.aliases = str(self.aliases or "").strip()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.get_kind_display()} | {self.name}"


DRUG_CONTROL_GROUP_GENERAL = "general"
DRUG_CONTROL_GROUP_NARCOTIC = "narcotic"
DRUG_CONTROL_GROUP_PSYCHOTROPIC = "psychotropic"
DRUG_CONTROL_GROUP_STRONG = "strong"
DRUG_CONTROL_GROUP_PRECURSOR = "precursor"

DRUG_CONTROL_GROUP_CHOICES = [
    (DRUG_CONTROL_GROUP_GENERAL, "Оддий препарат"),
    (DRUG_CONTROL_GROUP_NARCOTIC, "Гиёҳвандлик воситалари"),
    (DRUG_CONTROL_GROUP_PSYCHOTROPIC, "Психотроп моддалар"),
    (DRUG_CONTROL_GROUP_STRONG, "Кучли таъсир қилувчи препаратлар"),
    (DRUG_CONTROL_GROUP_PRECURSOR, "Прекурсорлар"),
]

class Drug(models.Model):
    # сосий дори номи: арацетамол, нальгин ва ҳ.к.
    name = models.CharField(max_length=255)

    #  / generic номи: paracetamol, metamizole sodium ва ҳ.к.
    mnn_name = models.CharField(max_length=255, blank=True, default="")

    # оза ва форма паспорти.
    dosage_value = models.CharField(max_length=50, blank=True, default="")
    dosage_unit = models.CharField(max_length=30, blank=True, default="")
    package_quantity = models.CharField(max_length=50, blank=True, default="")
    dosage_form = models.CharField(max_length=80, blank=True, default="")

    # исоб/омбор бирлиги: шт, уп, блистер, коробка ва ҳ.к.
    unit = models.CharField(max_length=50, blank=True, default="")

    control_group = models.CharField(
        max_length=30,
        choices=DRUG_CONTROL_GROUP_CHOICES,
        default=DRUG_CONTROL_GROUP_GENERAL,
        db_index=True,
    )
    manufacturer = models.CharField(max_length=255, blank=True, null=True)
    full_name = models.CharField(max_length=500, blank=True, default="", db_index=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name", "dosage_value", "dosage_unit", "package_quantity", "dosage_form"]

    @staticmethod
    def _clean(value):
        return str(value or "").strip()

    def build_full_name(self):
        parts = []

        name = self._clean(self.name)
        if name:
            parts.append(name)

        dosage_value = self._clean(self.dosage_value)
        dosage_unit = self._clean(self.dosage_unit)
        dosage = " ".join(part for part in [dosage_value, dosage_unit] if part).strip()
        if dosage:
            parts.append(dosage)

        package_quantity = self._clean(self.package_quantity)
        if package_quantity:
            if package_quantity.startswith(("№", "N", "n", "#")):
                parts.append(package_quantity)
            else:
                parts.append(f"№{package_quantity}")

        dosage_form = self._clean(self.dosage_form)
        if dosage_form:
            parts.append(dosage_form)

        return " ".join(parts).strip() or name

    @property
    def display_name(self):
        return self.full_name or self.build_full_name()

    def save(self, *args, **kwargs):
        normalize_drug_for_save(self)
        self.full_name = self.build_full_name()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.display_name


class Price(models.Model):
    drug = models.ForeignKey(
        Drug,
        on_delete=models.PROTECT,
        related_name="prices",
    )
    price = models.DecimalField(max_digits=12, decimal_places=2)
    start_date = models.DateField()
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-start_date", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["drug", "start_date"],
                name="unique_price_drug_start_date",
            )
        ]

    def __str__(self):
        return f"{self.drug.name} - {self.price}"


class NeedRow(models.Model):
    institution = models.ForeignKey(
        Institution,
        on_delete=models.PROTECT,
        related_name="need_rows",
    )
    drug = models.ForeignKey(
        Drug,
        on_delete=models.PROTECT,
        related_name="need_rows",
    )
    year = models.PositiveIntegerField()

    dpm_need = models.DecimalField(max_digits=14, decimal_places=3, default=0)
    amb_rec_need = models.DecimalField(max_digits=14, decimal_places=3, default=0)

    yearly_need = models.DecimalField(max_digits=14, decimal_places=3, default=0)
    quarterly_need = models.DecimalField(max_digits=14, decimal_places=3, default=0)

    class Meta:
        ordering = ["-year", "institution__name", "drug__name"]
        constraints = [
            models.UniqueConstraint(
                fields=["institution", "drug", "year"],
                name="uniq_needrow_institution_drug_year",
            )
        ]

    def save(self, *args, **kwargs):
        dpm = _decimal_value(self.dpm_need)
        amb = _decimal_value(self.amb_rec_need)

        self.dpm_need = dpm.quantize(Decimal("0.001"))
        self.amb_rec_need = amb.quantize(Decimal("0.001"))

        self.yearly_need = (self.dpm_need + self.amb_rec_need).quantize(Decimal("0.001"))
        self.quarterly_need = (self.yearly_need / Decimal("4")).quantize(Decimal("0.001"))

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.institution.name} | {self.drug.name} | {self.year}"
    
class NeedAddition(models.Model):
    REASON_BASE_UNDERESTIMATED = "base_underestimated"
    REASON_NEW_DEPARTMENT = "new_department"
    REASON_PATIENT_INCREASE = "patient_increase"
    REASON_NEW_CLINIC = "new_clinic"
    REASON_SSV_ORDER = "ssv_order"
    REASON_CORRECTION = "correction"
    REASON_OTHER = "other"

    REASON_CHOICES = [
        (REASON_BASE_UNDERESTIMATED, "Йил бошида кам ҳисобланган"),
        (REASON_NEW_DEPARTMENT, "Янги бўлим очилди"),
        (REASON_PATIENT_INCREASE, "Беморлар сони ошди"),
        (REASON_NEW_CLINIC, "Янги клиника иш бошлади"),
        (REASON_SSV_ORDER, "ССВ топшириғи / қайта тақсимот"),
        (REASON_CORRECTION, "Ҳисоб-китобни тузатиш"),
        (REASON_OTHER, "Бошқа"),
    ]

    # ТЗ бўйича асосий боғланиш:
    # Қўшимча эҳтиёж аниқ бир NeedRow'га тегишли бўлиши керак.
    # Ҳозирча null=True қолдиряпмиз, чунки эски маълумотларни миграциядан кейин боғлаб чиқамиз.
    need_row = models.ForeignKey(
        NeedRow,
        on_delete=models.PROTECT,
        related_name="additions",
        blank=True,
        null=True,
    )

    # Эски frontend/backend compatibility учун вақтинча сақланади.
    # Кейинги босқичда ҳисоблар асосан need_row орқали ишлайди.
    institution = models.ForeignKey(
        Institution,
        on_delete=models.PROTECT,
        related_name="need_additions",
    )
    drug = models.ForeignKey(
        Drug,
        on_delete=models.PROTECT,
        related_name="need_additions",
    )
    year = models.PositiveIntegerField()

    # Эски added_qty сақланади, лекин save() ичида total_additional_need билан синхрон бўлади.
    added_qty = models.DecimalField(
        max_digits=14,
        decimal_places=3,
        default=0,
    )

    # Янги ТЗ майдонлари
    dpm_need_add = models.DecimalField(
        max_digits=14,
        decimal_places=3,
        default=0,
    )
    amb_rec_need_add = models.DecimalField(
        max_digits=14,
        decimal_places=3,
        default=0,
    )
    total_additional_need = models.DecimalField(
        max_digits=14,
        decimal_places=3,
        default=0,
    )

    addition_date = models.DateField()

    reason = models.CharField(
        max_length=64,
        choices=REASON_CHOICES,
        default=REASON_OTHER,
    )

    # Эски номлар сақланади: doc_number/doc_date.
    # Frontend ва serializer'да кейин document_number/document_date alias қилиб чиқарамиз.
    doc_number = models.CharField(max_length=120, blank=True, default="")
    doc_date = models.DateField(blank=True, null=True)

    comment = models.TextField(blank=True, default="")

    is_active = models.BooleanField(default=True)
    cancel_reason = models.TextField(blank=True, default="")

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="created_need_additions",
        blank=True,
        null=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = [
            "-year",
            "institution__name",
            "drug__name",
            "-addition_date",
            "-id",
        ]
        indexes = [
            models.Index(
                fields=["institution", "drug", "year"],
                name="idx_needaddition_main_key",
            ),
            models.Index(
                fields=["year", "addition_date"],
                name="idx_needaddition_year_date",
            ),
            models.Index(
                fields=["need_row", "is_active"],
                name="idx_needaddition_row_active",
            ),
        ]
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(dpm_need_add__gte=0)
                    & models.Q(amb_rec_need_add__gte=0)
                ),
                name="needaddition_parts_non_negative",
            )
        ]

    def save(self, *args, **kwargs):
        zero = Decimal("0")

        if self.need_row_id:
            self.institution_id = self.need_row.institution_id
            self.drug_id = self.need_row.drug_id
            self.year = self.need_row.year
        elif self.institution_id and self.drug_id and self.year:
            self.need_row = NeedRow.objects.filter(
                institution_id=self.institution_id,
                drug_id=self.drug_id,
                year=self.year,
            ).first()

        old_qty = _decimal_value(self.added_qty)
        dpm = _decimal_value(self.dpm_need_add)
        amb = _decimal_value(self.amb_rec_need_add)

        # Eski yozuvlar uchun: agar yangi dpm/amb hali to'lmagan bo'lsa,
        # eski added_qty vaqtincha DPM qo'shimchaga tushiriladi.
        if dpm <= zero and amb <= zero and old_qty > zero:
            dpm = old_qty
            amb = zero

        self.dpm_need_add = dpm.quantize(Decimal("0.001"))
        self.amb_rec_need_add = amb.quantize(Decimal("0.001"))

        self.total_additional_need = (
            self.dpm_need_add + self.amb_rec_need_add
        ).quantize(Decimal("0.001"))
        self.added_qty = self.total_additional_need

        super().save(*args, **kwargs)

    def __str__(self):
        status = "фаол" if self.is_active else "бекор қилинган"
        return (
            f"{self.institution.name} | {self.drug.name} | "
            f"{self.year} | +{self.total_additional_need} | {status}"
        )

class MonthlyIssue(models.Model):
    institution = models.ForeignKey(
        Institution,
        on_delete=models.PROTECT,
        related_name="monthly_issues",
    )
    drug = models.ForeignKey(
        Drug,
        on_delete=models.PROTECT,
        related_name="monthly_issues",
    )
    year = models.PositiveIntegerField()
    issued_qty = models.DecimalField(max_digits=14, decimal_places=3, default=0)

    class Meta:
        ordering = ["-year", "institution__name", "drug__name"]
        constraints = [
            models.UniqueConstraint(
                fields=["institution", "drug", "year"],
                name="uniq_monthlyissue_institution_drug_year",
            )
        ]

    def __str__(self):
        return f"{self.institution.name} | {self.drug.name} | {self.year}"


class Role(models.Model):
    name = models.CharField(max_length=120, unique=True)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class UserProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    role = models.ForeignKey(
        Role,
        on_delete=models.SET_NULL,
        related_name="user_profiles",
        blank=True,
        null=True,
    )
    PASSWORD_POLICY_CHOICES = [
        ("simple", "Simple"),
        ("medium", "Medium"),
        ("strong", "Strong"),
    ]

    password_policy = models.CharField(
        max_length=20,
        choices=PASSWORD_POLICY_CHOICES,
        default="medium",
    )
    must_change_password = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["user__username"]

    def __str__(self):
        role_name = self.role.name if self.role else "Ролсиз"
        return f"{self.user.username} | {role_name}"


class PagePermission(models.Model):
    role = models.ForeignKey(
        Role,
        on_delete=models.CASCADE,
        related_name="page_permissions",
    )
    page_code = models.CharField(max_length=64, choices=PAGE_CHOICES)
    can_view = models.BooleanField(default=False)
    can_add = models.BooleanField(default=False)
    can_edit = models.BooleanField(default=False)
    can_delete = models.BooleanField(default=False)
    can_export = models.BooleanField(default=False)
    can_print = models.BooleanField(default=False)
    can_manage_access = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["role__name", "page_code"]
        constraints = [
            models.UniqueConstraint(
                fields=["role", "page_code"],
                name="uniq_role_page_permission",
            )
        ]

    def __str__(self):
        return f"{self.role.name} | {self.page_code}"


class UserPagePermissionOverride(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="page_permission_overrides",
    )
    page_code = models.CharField(max_length=64, choices=PAGE_CHOICES)
    can_view = models.BooleanField(blank=True, null=True)
    can_add = models.BooleanField(blank=True, null=True)
    can_edit = models.BooleanField(blank=True, null=True)
    can_delete = models.BooleanField(blank=True, null=True)
    can_export = models.BooleanField(blank=True, null=True)
    can_print = models.BooleanField(blank=True, null=True)
    can_manage_access = models.BooleanField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["user__username", "page_code"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "page_code"],
                name="uniq_user_page_permission_override",
            )
        ]

    def __str__(self):
        return f"{self.user.username} | {self.page_code}"

class AuditLog(models.Model):
    ACTION_CHOICES = [
        ("create", "Create"),
        ("update", "Update"),
        ("delete", "Delete"),
        ("login", "Login"),
        ("logout", "Logout"),
    ]

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    target_type = models.CharField(max_length=100)
    target_id = models.CharField(max_length=100, blank=True, null=True)
    target_repr = models.CharField(max_length=255, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    extra_data = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        actor_name = self.actor.username if self.actor else "System"
        return f"{self.created_at:%Y-%m-%d %H:%M} | {actor_name} | {self.action} | {self.target_type}"
