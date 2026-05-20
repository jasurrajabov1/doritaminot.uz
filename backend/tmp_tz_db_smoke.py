from core.models import Role, PagePermission, UserPagePermissionOverride, NeedAddition, NeedRow, MonthlyIssue, DrugOption
from core.constants import PAGE_DEFINITIONS

print("DB / RBAC SMOKE")
print("pages:", len(PAGE_DEFINITIONS), [code for code, _label in PAGE_DEFINITIONS])
print("roles:", Role.objects.count())
print("page_permissions:", PagePermission.objects.count())
print("user_overrides:", UserPagePermissionOverride.objects.count())

for role in Role.objects.order_by("name"):
    count = PagePermission.objects.filter(role=role).count()
    manage = PagePermission.objects.filter(role=role, page_code="access_management", can_manage_access=True).exists()
    print(f"role={role.name} permissions={count} manage_access={manage}")

print("need_rows:", NeedRow.objects.count())
print("monthly_issues:", MonthlyIssue.objects.count())
print("need_additions:", NeedAddition.objects.count())
print("need_additions_without_need_row:", NeedAddition.objects.filter(need_row__isnull=True).count())
print("drug_options:", DrugOption.objects.count())

print("DB SMOKE DONE")
