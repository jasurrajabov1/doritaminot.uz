from rest_framework.permissions import BasePermission

from .constants import ACTION_TO_FIELD, ACTION_DEFINITIONS, PAGE_DEFINITIONS, build_empty_permission_payload
from .models import PagePermission, UserPagePermissionOverride, UserProfile


SAFE_ACTIONS = {"GET", "HEAD", "OPTIONS"}


def resolve_user_role(user):
    if not getattr(user, "is_authenticated", False):
        return None

    try:
        profile = user.profile
    except UserProfile.DoesNotExist:
        return None

    role = profile.role
    if role and role.is_active:
        return role
    return None


def resolve_user_page_permissions(user):
    permissions_map = {
        page_code: build_empty_permission_payload(page_code, page_label)
        for page_code, page_label in PAGE_DEFINITIONS
    }

    if not getattr(user, "is_authenticated", False) or not user.is_active:
        return permissions_map

    if user.is_superuser:
        for page in permissions_map.values():
            for action, _label in ACTION_DEFINITIONS:
                page[action] = True
        return permissions_map

    role = resolve_user_role(user)
    if role:
        role_permissions = PagePermission.objects.filter(role=role)
        for item in role_permissions:
            page_payload = permissions_map.setdefault(
                item.page_code,
                build_empty_permission_payload(item.page_code),
            )
            for action, field_name in ACTION_TO_FIELD.items():
                page_payload[action] = bool(getattr(item, field_name, False))

    overrides = UserPagePermissionOverride.objects.filter(user=user)
    for item in overrides:
        page_payload = permissions_map.setdefault(
            item.page_code,
            build_empty_permission_payload(item.page_code),
        )
        for action, field_name in ACTION_TO_FIELD.items():
            override_value = getattr(item, field_name)
            if override_value is not None:
                page_payload[action] = override_value

    return permissions_map


def normalize_action(page_code, action):
    normalized = action or "view"
    if page_code == "access_management":
        return "manage_access"
    return normalized


def has_page_permission(user, page_code, action="view"):
    if not getattr(user, "is_authenticated", False) or not user.is_active:
        return False

    if user.is_superuser:
        return True

    normalized_action = normalize_action(page_code, action)
    permissions_map = resolve_user_page_permissions(user)
    page_permissions = permissions_map.get(page_code)
    if not page_permissions:
        return False

    return bool(page_permissions.get(normalized_action, False))


class HasPagePermission(BasePermission):
    message = "Сизда ушбу амал учун доступ йўқ."

    def has_permission(self, request, view):
        page_code = getattr(view, "page_code", None)
        if not page_code:
            return bool(getattr(request.user, "is_authenticated", False))

        required_permission = getattr(view, "required_permission", None)
        if not required_permission:
            if request.method in SAFE_ACTIONS:
                required_permission = "view"
            elif request.method == "POST":
                required_permission = "add"
            elif request.method in {"PUT", "PATCH"}:
                required_permission = "edit"
            elif request.method == "DELETE":
                required_permission = "delete"
            else:
                required_permission = "view"

        return has_page_permission(request.user, page_code, required_permission)
