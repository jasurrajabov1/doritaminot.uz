from django.contrib import admin

from .models import (
    AuditLog,
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


@admin.register(Institution)
class InstitutionAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "address", "is_active")
    search_fields = ("name", "address")
    list_filter = ("is_active",)


@admin.register(Drug)
class DrugAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "unit", "manufacturer", "is_active")
    search_fields = ("name", "manufacturer", "unit")
    list_filter = ("is_active",)


@admin.register(Price)
class PriceAdmin(admin.ModelAdmin):
    list_display = ("id", "drug", "price", "start_date", "is_active")
    search_fields = ("drug__name",)
    list_filter = ("is_active", "start_date")


@admin.register(NeedRow)
class NeedRowAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "institution",
        "drug",
        "year",
        "dpm_need",
        "amb_rec_need",
        "yearly_need",
        "quarterly_need",
    )
    search_fields = ("institution__name", "drug__name")
    list_filter = ("year",)


@admin.register(MonthlyIssue)
class MonthlyIssueAdmin(admin.ModelAdmin):
    list_display = ("id", "institution", "drug", "year", "issued_qty")
    search_fields = ("institution__name", "drug__name")
    list_filter = ("year",)


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "is_active", "created_at")
    search_fields = ("name", "description")
    list_filter = ("is_active",)


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "role", "updated_at", "password_policy", "must_change_password")
    search_fields = ("user__username", "user__first_name", "user__last_name", "role__name", "password_policy")
    list_filter = ("role", "password_policy", "must_change_password")


@admin.register(PagePermission)
class PagePermissionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "role",
        "page_code",
        "can_view",
        "can_add",
        "can_edit",
        "can_delete",
        "can_export",
        "can_print",
        "can_manage_access",
    )
    search_fields = ("role__name", "page_code")
    list_filter = ("page_code", "role")


@admin.register(UserPagePermissionOverride)
class UserPagePermissionOverrideAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "page_code",
        "can_view",
        "can_add",
        "can_edit",
        "can_delete",
        "can_export",
        "can_print",
        "can_manage_access",
    )
    search_fields = ("user__username", "page_code")
    list_filter = ("page_code",)

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "created_at",
        "actor",
        "action",
        "target_type",
        "target_id",
        "target_repr",
    )
    search_fields = (
        "actor__username",
        "action",
        "target_type",
        "target_id",
        "target_repr",
        "description",
    )
    list_filter = ("action", "target_type", "created_at")
    readonly_fields = (
        "actor",
        "action",
        "target_type",
        "target_id",
        "target_repr",
        "description",
        "extra_data",
        "created_at",
    )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False