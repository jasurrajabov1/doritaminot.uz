from decimal import Decimal

from django.conf import settings
from django.db import models

from .constants import PAGE_CHOICES


class Institution(models.Model):
    name = models.CharField(max_length=255)
    address = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Drug(models.Model):
    name = models.CharField(max_length=255)
    unit = models.CharField(max_length=50)
    manufacturer = models.CharField(max_length=255, blank=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


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
        dpm = self.dpm_need or Decimal("0")
        amb = self.amb_rec_need or Decimal("0")

        self.yearly_need = dpm + amb
        self.quarterly_need = self.yearly_need / Decimal("4")

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.institution.name} | {self.drug.name} | {self.year}"


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
