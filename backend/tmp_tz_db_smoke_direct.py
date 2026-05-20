import os
from decimal import Decimal

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django
django.setup()

from django.contrib.auth import get_user_model
from django.db import connection
from core.constants import PAGE_DEFINITIONS
from core.models import (
    Role,
    PagePermission,
    UserPagePermissionOverride,
    NeedRow,
    MonthlyIssue,
    NeedAddition,
    DrugOption,
)

User = get_user_model()

def page_code(item):
    if isinstance(item, (list, tuple)) and item:
        return item[0]
    if isinstance(item, dict):
        return item.get("code") or item.get("page_code")
    return str(item)

pages = [page_code(x) for x in PAGE_DEFINITIONS if page_code(x)]

print("=== DB / RBAC SMOKE DIRECT ===")
print("database:", connection.settings_dict.get("NAME"))
print("pages:", len(pages), ", ".join(pages))
print("roles:", Role.objects.count())
print("users:", User.objects.count())
print("page_permissions:", PagePermission.objects.count())
print("expected role*page:", Role.objects.count() * len(pages))
print("user_overrides:", UserPagePermissionOverride.objects.count())
print("need_rows:", NeedRow.objects.count())
print("monthly_issues:", MonthlyIssue.objects.count())
print("need_additions:", NeedAddition.objects.count())
print("drug_options:", DrugOption.objects.count())

for role in Role.objects.order_by("name"):
    qs = PagePermission.objects.filter(role=role)
    manage = qs.filter(page_code="access_management", can_manage_access=True).exists()
    visible = qs.filter(can_view=True).count()
    print(f"role={role.name} permissions={qs.count()} visible_pages={visible} manage_access={manage}")

missing = []
for role in Role.objects.all():
    existing = set(PagePermission.objects.filter(role=role).values_list("page_code", flat=True))
    for code in pages:
        if code not in existing:
            missing.append(f"{role.name}:{code}")

if missing:
    print("WARN missing permissions:", ", ".join(missing))
else:
    print("permission_matrix: OK")

print("DB / RBAC SMOKE DONE")
