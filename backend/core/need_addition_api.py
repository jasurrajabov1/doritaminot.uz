from rest_framework import permissions, status, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from .models import NeedAddition, PagePermission, UserPagePermissionOverride
from .serializers import NeedAdditionSerializer


PAGE_CODE = "need_rows"


def _permission_field(action):
    return {
        "view": "can_view",
        "add": "can_add",
        "edit": "can_edit",
        "delete": "can_delete",
        "export": "can_export",
        "print": "can_print",
        "manage_access": "can_manage_access",
    }[action]


def user_can_need_rows_action(user, action):
    if not user or not user.is_authenticated:
        return False

    if user.is_superuser:
        return True

    field = _permission_field(action)

    try:
        role = user.profile.role
    except Exception:
        role = None

    allowed = False

    if role:
        permission = PagePermission.objects.filter(
            role=role,
            page_code=PAGE_CODE,
        ).first()
        if permission:
            allowed = bool(getattr(permission, field, False))

    override = UserPagePermissionOverride.objects.filter(
        user=user,
        page_code=PAGE_CODE,
    ).first()

    if override is not None:
        value = getattr(override, field, None)
        if value is not None:
            allowed = bool(value)

    return allowed


class NeedAdditionViewSet(viewsets.ModelViewSet):
    serializer_class = NeedAdditionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = (
            NeedAddition.objects.select_related(
                "need_row",
                "need_row__institution",
                "need_row__drug",
                "institution",
                "drug",
                "created_by",
            )
            .all()
            .order_by("-year", "-addition_date", "-id")
        )

        need_row = self.request.query_params.get("need_row")
        if need_row:
            qs = qs.filter(need_row_id=need_row)

        institution = self.request.query_params.get("institution")
        if institution:
            qs = qs.filter(institution_id=institution)

        drug = self.request.query_params.get("drug")
        if drug:
            qs = qs.filter(drug_id=drug)

        year = self.request.query_params.get("year")
        if year:
            qs = qs.filter(year=year)

        is_active = self.request.query_params.get("is_active")
        if is_active in ["1", "true", "True", "yes", "ha", "ҳа"]:
            qs = qs.filter(is_active=True)
        elif is_active in ["0", "false", "False", "no", "yoq", "йўқ"]:
            qs = qs.filter(is_active=False)

        q = (self.request.query_params.get("q") or "").strip()
        if q:
            qs = qs.filter(comment__icontains=q) | qs.filter(doc_number__icontains=q)

        return qs

    def _require(self, action):
        if not user_can_need_rows_action(self.request.user, action):
            raise PermissionDenied("Бу амал учун need_rows рухсати етарли эмас.")

    def list(self, request, *args, **kwargs):
        self._require("view")
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        self._require("view")
        return super().retrieve(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        self._require("add")
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        self._require("edit")
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        self._require("edit")
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        self._require("delete")

        instance = self.get_object()

        if not instance.is_active:
            return Response(
                {"detail": "Қўшимча эҳтиёж аллақачон бекор қилинган."},
                status=status.HTTP_200_OK,
            )

        cancel_reason = (
            request.data.get("cancel_reason")
            if hasattr(request, "data")
            else ""
        ) or "API орқали бекор қилинди"

        serializer = self.get_serializer(
            instance,
            data={
                "is_active": False,
                "cancel_reason": cancel_reason,
            },
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {"detail": "Қўшимча эҳтиёж бекор қилинди."},
            status=status.HTTP_200_OK,
        )
