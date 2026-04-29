from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import DecimalField, F, Sum, Value
from django.db.models.functions import Coalesce
from django.http import JsonResponse
from rest_framework import generics, serializers, status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .price_utils import get_latest_price

from .constants import PAGE_DEFINITIONS

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

from .permissions import HasPagePermission
from .serializers import (
    AccessMetaSerializer,
    AdminSetPasswordSerializer,
    CurrentUserSerializer,
    DrugSerializer,
    InstitutionSerializer,
    LoginSerializer,
    ManagedUserCreateSerializer,
    ManagedUserSerializer,
    ManagedUserUpdateSerializer,
    MonthlyIssueSerializer,
    NeedRowSerializer,
    PagePermissionSerializer,
    PriceSerializer,
    RoleSerializer,
    UserPagePermissionOverrideSerializer,
    SelfChangePasswordSerializer,
)

User = get_user_model()


def dec_zero_3():
    return Value(0, output_field=DecimalField(max_digits=14, decimal_places=3))


def get_issued_total(
    institution=None,
    drug=None,
    year=None,
    institution_id=None,
    drug_id=None,
    exclude_pk=None,
):
    qs = MonthlyIssue.objects.all()

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

    if exclude_pk is not None:
        qs = qs.exclude(pk=exclude_pk)

    return qs.aggregate(
        total=Coalesce(Sum("issued_qty"), dec_zero_3())
    )["total"]

def get_status(total_need, issued_total, remaining_percent):
    if issued_total > total_need:
        return "Эҳтиёждан ошган"
    if remaining_percent < 20:
        return "Критик"
    if remaining_percent < 30:
        return "Паст"
    if remaining_percent < 50:
        return "Огоҳлантириш"
    return "Норма"



def protected_delete_response(message):
    return Response({"detail": message}, status=status.HTTP_400_BAD_REQUEST)

ACCESS_MANAGEMENT_PAGE_CODE = "access_management"


def user_has_manage_access(user):
    if not user or not user.is_active:
        return False

    if user.is_superuser:
        return True

    try:
        profile = user.profile
    except UserProfile.DoesNotExist:
        profile = None

    role = profile.role if profile else None

    role_allowed = False
    if role and role.is_active:
        role_allowed = PagePermission.objects.filter(
            role=role,
            page_code=ACCESS_MANAGEMENT_PAGE_CODE,
            can_manage_access=True,
        ).exists()

    override = UserPagePermissionOverride.objects.filter(
        user=user,
        page_code=ACCESS_MANAGEMENT_PAGE_CODE,
    ).first()

    if override and override.can_manage_access is not None:
        return bool(override.can_manage_access)

    return bool(role_allowed)


def active_manage_access_users_count():
    return sum(
        1
        for user in User.objects.filter(is_active=True).select_related("profile__role")
        if user_has_manage_access(user)
    )


def ensure_manage_access_remains():
    if active_manage_access_users_count() <= 0:
        raise serializers.ValidationError({
            "detail": "Тизимда камида битта фаол manage_access ҳуқуқига эга фойдаланувчи қолиши керак."
        })

def write_audit_log(actor, action, target=None, target_type=None, description=None, extra_data=None):
    resolved_target_type = target_type or (target.__class__.__name__ if target else "Unknown")
    resolved_target_id = str(target.pk) if target and getattr(target, "pk", None) is not None else None
    resolved_target_repr = str(target) if target else None

    AuditLog.objects.create(
        actor=actor,
        action=action,
        target_type=resolved_target_type,
        target_id=resolved_target_id,
        target_repr=resolved_target_repr,
        description=description,
        extra_data=extra_data,
    )

def health_check(request):
    return JsonResponse({"status": "ok"})


@api_view(["GET"])
@permission_classes([AllowAny])
def api_root(request):
    return Response({
        "health": "/api/health/",
        "auth_login": "/api/auth/login/",
        "auth_logout": "/api/auth/logout/",
        "auth_me": "/api/auth/me/",
        "auth_meta": "/api/auth/meta/",
        "institutions": "/api/institutions/",
        "drugs": "/api/drugs/",
        "prices": "/api/prices/",
        "monthly_issues": "/api/monthly-issues/",
        "need_rows": "/api/need-rows/",
        "need_rows_summary": "/api/need-rows-summary/",
        "stock_summary": "/api/stock-summary/",
        "dashboard_summary": "/api/dashboard-summary/",
        "access_roles": "/api/access/roles/",
        "access_users": "/api/access/users/",
        "access_page_permissions": "/api/access/page-permissions/",
        "access_user_overrides": "/api/access/user-permission-overrides/",
    })


class LoginAPIView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]

        Token.objects.filter(user=user).delete()
        token = Token.objects.create(user=user)
        UserProfile.objects.get_or_create(user=user)

        write_audit_log(
            actor=user,
            action="login",
            target=user,
            target_type="Фойдаланувчи",
            description="Фойдаланувчи тизимга кирди.",
        )

        return Response({
            "token": token.key,
            "user": CurrentUserSerializer(user).data,
        })
    

class LogoutAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        write_audit_log(
            actor=request.user,
            action="logout",
            target=request.user,
            target_type="Фойдаланувчи",
            description="Фойдаланувчи тизимдан чиқди.",
        )

        if request.auth:
            request.auth.delete()
        return Response({"detail": "Сеанс якунланди."})
    

class CurrentUserAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        UserProfile.objects.get_or_create(user=request.user)
        return Response(CurrentUserSerializer(request.user).data)


class AccessMetaAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(AccessMetaSerializer({}).data)


class InstitutionListCreateAPIView(generics.ListCreateAPIView):
    queryset = Institution.objects.all()
    serializer_class = InstitutionSerializer
    permission_classes = [HasPagePermission]
    page_code = "institutions"

    def perform_create(self, serializer):
        item = serializer.save()

        write_audit_log(
            actor=self.request.user,
            action="create",
            target=item,
            target_type="Муассаса",
            description="Муассаса қўшилди.",
            extra_data={
                "name": item.name,
                "address": item.address,
                "is_active": item.is_active,
            },
        )

class InstitutionDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Institution.objects.all()
    serializer_class = InstitutionSerializer
    permission_classes = [HasPagePermission]
    page_code = "institutions"

    def perform_update(self, serializer):
        item = serializer.save()

        write_audit_log(
            actor=self.request.user,
            action="update",
            target=item,
            target_type="Муассаса",
            description="Муассаса янгиланди.",
            extra_data={
                "name": item.name,
                "address": item.address,
                "is_active": item.is_active,
            },
        )

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()

        if NeedRow.objects.filter(institution=obj).exists():
            return protected_delete_response(
                "Бу муассаса «Эҳтиёж» саҳифасида ишлатилган. Аввал боғлиқ эҳтиёж қаторларини ўчиринг."
            )

        if MonthlyIssue.objects.filter(institution=obj).exists():
            return protected_delete_response(
                "Бу муассаса «Берилган миқдор» саҳифасида ишлатилган. Аввал боғлиқ берилган миқдор қаторларини ўчиринг."
            )

        obj_id = obj.id
        obj_repr = str(obj)
        obj_name = obj.name

        response = super().destroy(request, *args, **kwargs)

        write_audit_log(
            actor=request.user,
            action="delete",
            target_type="Муассаса",
            description="Муассаса ўчирилди.",
            extra_data={
                "id": obj_id,
                "repr": obj_repr,
                "name": obj_name,
            },
        )

        return response


class DrugListCreateAPIView(generics.ListCreateAPIView):
    queryset = Drug.objects.all()
    serializer_class = DrugSerializer
    permission_classes = [HasPagePermission]
    page_code = "drugs"

    def perform_create(self, serializer):
        item = serializer.save()

        write_audit_log(
            actor=self.request.user,
            action="create",
            target=item,
            target_type="Дори",
            description="Дори қўшилди.",
            extra_data={
                "name": item.name,
                "unit": item.unit,
                "manufacturer": item.manufacturer,
                "is_active": item.is_active,
            },
        )


class DrugDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Drug.objects.all()
    serializer_class = DrugSerializer
    permission_classes = [HasPagePermission]
    page_code = "drugs"

    def perform_update(self, serializer):
        item = serializer.save()

        write_audit_log(
            actor=self.request.user,
            action="update",
            target=item,
            target_type="Дори",
            description="Дори янгиланди.",
            extra_data={
                "name": item.name,
                "unit": item.unit,
                "manufacturer": item.manufacturer,
                "is_active": item.is_active,
            },
        )

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()

        if NeedRow.objects.filter(drug=obj).exists():
            return protected_delete_response(
                "Бу дори «Эҳтиёж» саҳифасида ишлатилган. Аввал боғлиқ эҳтиёж қаторларини ўчиринг."
            )

        if MonthlyIssue.objects.filter(drug=obj).exists():
            return protected_delete_response(
                "Бу дори «Берилган миқдор» саҳифасида ишлатилган. Аввал боғлиқ берилган миқдор қаторларини ўчиринг."
            )

        obj_id = obj.id
        obj_repr = str(obj)
        obj_name = obj.name

        Price.objects.filter(drug=obj).delete()

        response = super().destroy(request, *args, **kwargs)

        write_audit_log(
            actor=request.user,
            action="delete",
            target_type="Дори",
            description="Дори ўчирилди.",
            extra_data={
                "id": obj_id,
                "repr": obj_repr,
                "name": obj_name,
            },
        )

        return response


class PriceListCreateAPIView(generics.ListCreateAPIView):
    queryset = Price.objects.select_related("drug").all().order_by("drug__name", "-start_date", "-id")
    serializer_class = PriceSerializer
    permission_classes = [HasPagePermission]
    page_code = "prices"

    def perform_create(self, serializer):
        item = serializer.save()

        write_audit_log(
            actor=self.request.user,
            action="create",
            target=item,
            target_type="Нарх",
            description="Нарх қўшилди.",
            extra_data={
                "drug": item.drug.name if item.drug else None,
                "price": str(item.price),
                "is_active": item.is_active,
            },
        )

class PriceDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Price.objects.select_related("drug").all()
    serializer_class = PriceSerializer
    permission_classes = [HasPagePermission]
    page_code = "prices"

    def perform_update(self, serializer):
        item = serializer.save()

        write_audit_log(
            actor=self.request.user,
            action="update",
            target=item,
            target_type="Нарх",
            description="Нарх янгиланди.",
            extra_data={
                "drug": item.drug.name if item.drug else None,
                "price": str(item.price),
                "is_active": item.is_active,
            },
        )

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()

        obj_id = obj.id
        obj_repr = str(obj)
        drug_name = obj.drug.name if obj.drug else None
        price_value = str(obj.price)

        response = super().destroy(request, *args, **kwargs)

        write_audit_log(
            actor=request.user,
            action="delete",
            target_type="Нарх",
            description="Нарх ўчирилди.",
            extra_data={
                "id": obj_id,
                "repr": obj_repr,
                "drug": drug_name,
                "price": price_value,
            },
        )

        return response

class MonthlyIssueListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = MonthlyIssueSerializer
    permission_classes = [HasPagePermission]
    page_code = "monthly_issues"

    def get_queryset(self):
        qs = MonthlyIssue.objects.select_related("institution", "drug").all().order_by(
            "-year", "institution__name", "drug__name", "-id"
        )

        year = self.request.query_params.get("year")
        institution = self.request.query_params.get("institution")
        drug = self.request.query_params.get("drug")

        if year:
            qs = qs.filter(year=year)
        if institution:
            qs = qs.filter(institution_id=institution)
        if drug:
            qs = qs.filter(drug_id=drug)

        return qs

    def perform_create(self, serializer):
        item = serializer.save()

        write_audit_log(
            actor=self.request.user,
            action="create",
            target=item,
            target_type="Берилган миқдор",
            description="Берилган миқдор қўшилди.",
            extra_data={
                "institution": item.institution.name if item.institution else None,
                "drug": item.drug.name if item.drug else None,
                "year": item.year,
                "issued_qty": str(item.issued_qty),
            },
        )

class MonthlyIssueDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = MonthlyIssue.objects.select_related("institution", "drug").all()
    serializer_class = MonthlyIssueSerializer
    permission_classes = [HasPagePermission]
    page_code = "monthly_issues"

    def perform_update(self, serializer):
        institution = serializer.validated_data.get("institution", self.get_object().institution)
        drug = serializer.validated_data.get("drug", self.get_object().drug)
        year = serializer.validated_data.get("year", self.get_object().year)

        duplicate_exists = MonthlyIssue.objects.filter(
            institution=institution,
            drug=drug,
            year=year,
        ).exclude(pk=self.get_object().pk).exists()

        if duplicate_exists:
            raise serializers.ValidationError({
                "non_field_errors": [
                    "Бу муассаса, дори ва йил бўйича жами берилган ёзув аллақачон мавжуд."
                ]
            })

        item = serializer.save()

        write_audit_log(
            actor=self.request.user,
            action="update",
            target=item,
            target_type="Берилган миқдор",
            description="Берилган миқдор янгиланди.",
            extra_data={
                "institution": item.institution.name if item.institution else None,
                "drug": item.drug.name if item.drug else None,
                "year": item.year,
                "issued_qty": str(item.issued_qty),
            },
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        issue_id = instance.id
        issue_repr = str(instance)
        institution_name = instance.institution.name if instance.institution else None
        drug_name = instance.drug.name if instance.drug else None
        year = instance.year
        issued_qty = str(instance.issued_qty)

        response = super().destroy(request, *args, **kwargs)

        write_audit_log(
            actor=request.user,
            action="delete",
            target_type="Берилган миқдор",
            description="Берилган миқдор ўчирилди.",
            extra_data={
                "id": issue_id,
                "repr": issue_repr,
                "institution": institution_name,
                "drug": drug_name,
                "year": year,
                "issued_qty": issued_qty,
            },
        )

        return response

class NeedRowListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = NeedRowSerializer
    permission_classes = [HasPagePermission]
    page_code = "need_rows"

    def get_queryset(self):
        qs = NeedRow.objects.select_related("institution", "drug").all().order_by(
            "-year", "institution__name", "drug__name", "-id"
        )

        year = self.request.query_params.get("year")
        institution = self.request.query_params.get("institution")
        drug = self.request.query_params.get("drug")

        if year:
            qs = qs.filter(year=year)
        if institution:
            qs = qs.filter(institution_id=institution)
        if drug:
            qs = qs.filter(drug_id=drug)

        return qs

    def perform_create(self, serializer):
        institution = serializer.validated_data["institution"]
        drug = serializer.validated_data["drug"]
        year = serializer.validated_data["year"]

        exists = NeedRow.objects.filter(
            institution=institution,
            drug=drug,
            year=year,
        ).exists()

        if exists:
            raise serializers.ValidationError({
                "non_field_errors": [
                    "Бу муассаса, дори ва йил учун потребность қатори аллақачон мавжуд."
                ]
            })

        item = serializer.save()

        write_audit_log(
            actor=self.request.user,
            action="create",
            target=item,
            target_type="Эҳтиёж",
            description="Эҳтиёж қўшилди.",
            extra_data={
                "institution": item.institution.name if item.institution else None,
                "drug": item.drug.name if item.drug else None,
                "year": item.year,
                "dpm_need": str(item.dpm_need),
                "amb_rec_need": str(item.amb_rec_need),
                "yearly_need": str(item.yearly_need),
                "quarterly_need": str(item.quarterly_need),
            },
        )

class NeedRowDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = NeedRow.objects.select_related("institution", "drug").all()
    serializer_class = NeedRowSerializer
    permission_classes = [HasPagePermission]
    page_code = "need_rows"

    def perform_update(self, serializer):
        institution = serializer.validated_data.get("institution", self.get_object().institution)
        drug = serializer.validated_data.get("drug", self.get_object().drug)
        year = serializer.validated_data.get("year", self.get_object().year)

        exists = NeedRow.objects.filter(
            institution=institution,
            drug=drug,
            year=year,
        ).exclude(pk=self.get_object().pk).exists()

        if exists:
            raise serializers.ValidationError({
                "non_field_errors": [
                    "Бу муассаса, дори ва йил учун потребность қатори аллақачон мавжуд."
                ]
            })

        item = serializer.save()

        write_audit_log(
            actor=self.request.user,
            action="update",
            target=item,
            target_type="Эҳтиёж",
            description="Эҳтиёж янгиланди.",
            extra_data={
                "institution": item.institution.name if item.institution else None,
                "drug": item.drug.name if item.drug else None,
                "year": item.year,
                "dpm_need": str(item.dpm_need),
                "amb_rec_need": str(item.amb_rec_need),
                "yearly_need": str(item.yearly_need),
                "quarterly_need": str(item.quarterly_need),
            },
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        related_issue_exists = MonthlyIssue.objects.filter(
            institution=instance.institution,
            drug=instance.drug,
            year=instance.year,
        ).exists()

        if related_issue_exists:
            return Response(
                {
                    "detail": "Бу препаратдан муассасага берилган ёзув мавжуд. Аввал 'Берилган миқдор' саҳифасидан ушбу қаторни ўчиринг."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        row_id = instance.id
        row_repr = str(instance)
        institution_name = instance.institution.name if instance.institution else None
        drug_name = instance.drug.name if instance.drug else None
        year = instance.year
        dpm_need = str(instance.dpm_need)
        amb_rec_need = str(instance.amb_rec_need)
        yearly_need = str(instance.yearly_need)
        quarterly_need = str(instance.quarterly_need)

        response = super().destroy(request, *args, **kwargs)

        write_audit_log(
            actor=request.user,
            action="delete",
            target_type="Эҳтиёж",
            description="Эҳтиёж ўчирилди.",
            extra_data={
                "id": row_id,
                "repr": row_repr,
                "institution": institution_name,
                "drug": drug_name,
                "year": year,
                "dpm_need": dpm_need,
                "amb_rec_need": amb_rec_need,
                "yearly_need": yearly_need,
                "quarterly_need": quarterly_need,
            },
        )

        return response
    
class StockSummaryAPIView(APIView):
    permission_classes = [HasPagePermission]
    page_code = "stock_summary"

    def get(self, request):
        year = request.GET.get("year")
        institution = request.GET.get("institution")
        drug = request.GET.get("drug")

        qs = NeedRow.objects.select_related("institution", "drug").all().order_by(
            "institution__name", "drug__name", "year"
        )

        if year:
            qs = qs.filter(year=year)
        if institution:
            qs = qs.filter(institution_id=institution)
        if drug:
            qs = qs.filter(drug_id=drug)

        rows = []

        for need in qs:
            issued_total = get_issued_total(
                institution=need.institution,
                drug=need.drug,
                year=need.year,
            ) or 0

            yearly_need = need.yearly_need or 0
            remaining = yearly_need - issued_total

            remaining_percent = 0
            if yearly_need > 0:
                remaining_percent = round(float((remaining / yearly_need) * 100), 2)

            row_status = get_status(yearly_need, issued_total, remaining_percent)

            rows.append({
                "institution_id": need.institution.id,
                "institution_name": need.institution.name,
                "drug_id": need.drug.id,
                "drug_name": need.drug.name,
                "year": need.year,
                "yearly_need": float(yearly_need),
                "issued_qty": float(issued_total),
                "remaining_qty": float(remaining),
                "remaining_percent": remaining_percent,
                "status": row_status,
            })

        return Response(rows)


class DashboardSummaryAPIView(APIView):
    permission_classes = [HasPagePermission]
    page_code = "dashboard"

    def get(self, request):
        selected_year = request.GET.get("year")
        selected_institution = request.GET.get("institution")

        need_rows_qs = NeedRow.objects.select_related("institution", "drug").all()
        monthly_issues_qs = MonthlyIssue.objects.select_related("institution", "drug").all()

        if selected_year:
            need_rows_qs = need_rows_qs.filter(year=selected_year)
            monthly_issues_qs = monthly_issues_qs.filter(year=selected_year)

        if selected_institution:
            need_rows_qs = need_rows_qs.filter(institution_id=selected_institution)
            monthly_issues_qs = monthly_issues_qs.filter(institution_id=selected_institution)

        total_institutions = need_rows_qs.values("institution_id").distinct().count()
        total_drugs = need_rows_qs.values("drug_id").distinct().count()
        total_need_rows = need_rows_qs.count()
        total_issue_rows = monthly_issues_qs.count()

        total_need_sum = need_rows_qs.aggregate(
            total=Coalesce(Sum("yearly_need"), dec_zero_3())
        )["total"] or 0

        total_issued_sum = monthly_issues_qs.aggregate(
            total=Coalesce(Sum("issued_qty"), dec_zero_3())
        )["total"] or 0

        total_remaining_sum = total_need_sum - total_issued_sum

        total_need_qty = total_need_sum
        total_issued_qty = total_issued_sum
        total_remaining_qty = total_remaining_sum

        total_yearly_amount = 0
        total_issued_amount = 0
        total_remaining_amount = 0

        institution_data = []
        institutions_qs = Institution.objects.all()

        if selected_institution:
            institutions_qs = institutions_qs.filter(id=selected_institution)

        for inst in institutions_qs:
            inst_need = need_rows_qs.filter(institution=inst).aggregate(
                total=Coalesce(Sum("yearly_need"), dec_zero_3())
            )["total"] or 0

            inst_issued = monthly_issues_qs.filter(institution=inst).aggregate(
                total=Coalesce(Sum("issued_qty"), dec_zero_3())
            )["total"] or 0

            institution_data.append({
                "name": inst.name,
                "yearly_need": float(inst_need),
                "issued": float(inst_issued),
                "remaining": float(inst_need - inst_issued),
            })

        warning_under_50 = 0
        low_under_30 = 0
        critical_under_20 = 0
        over_need = 0

        top_critical_drugs = []

        for need in need_rows_qs:
            total_need = need.yearly_need or 0
            issued_total = get_issued_total(
                institution=need.institution,
                drug=need.drug,
                year=need.year,
            ) or 0

            remaining = total_need - issued_total

            matched_price = get_latest_price(need.drug_id, year=need.year)
            price_value = matched_price.price if matched_price else None

            if price_value is not None:
                total_yearly_amount += total_need * price_value
                total_issued_amount += issued_total * price_value
                total_remaining_amount += remaining * price_value

            remaining_percent = 0
            if total_need > 0:
                remaining_percent = float((remaining / total_need) * 100)

            row_status = get_status(total_need, issued_total, remaining_percent)

            if row_status == "Эҳтиёждан ошган":
                over_need += 1
            elif row_status == "Критик":
                critical_under_20 += 1
            elif row_status == "Паст":
                low_under_30 += 1
            elif row_status == "Огоҳлантириш":
                warning_under_50 += 1

            top_critical_drugs.append({
                "institution": need.institution.name,
                "drug": need.drug.name,
                "year": need.year,
                "yearly_need": float(total_need),
                "issued_qty": float(issued_total),
                "remaining_qty": float(remaining),
                "remaining_percent": round(float(remaining_percent), 2),
                "status": row_status,
            })

        top_critical_drugs = sorted(
            top_critical_drugs,
            key=lambda x: x["remaining_percent"]
        )[:10]

        critical_positions = warning_under_50 + low_under_30 + critical_under_20 + over_need

        critical_data = [
            {"name": "<50%", "value": warning_under_50},
            {"name": "<30%", "value": low_under_30},
            {"name": "<20%", "value": critical_under_20},
            {"name": "Эҳтиёждан ошган", "value": over_need},
        ]

        yearly_chart = []
        years_qs = monthly_issues_qs.values("year").annotate(
            total=Coalesce(Sum("issued_qty"), dec_zero_3())
        ).order_by("year")

        for row in years_qs:
            yearly_chart.append({
                "month": str(row["year"]),
                "issued": float(row["total"] or 0),
            })

        return Response({
            "cards": {
                "institutions": total_institutions,
                "drugs": total_drugs,
                "need_rows": total_need_rows,
                "issued_rows": total_issue_rows,
                "total_need_qty": float(total_need_qty),
                "total_issued_qty": float(total_issued_qty),
                "total_remaining_qty": float(total_remaining_qty),

                "total_need_sum": float(total_yearly_amount),
                "total_issued_sum": float(total_issued_amount),
                "total_remaining_sum": float(total_remaining_amount),
                "critical_positions": critical_positions,
                "over_need": over_need,
            },
            "institution_chart": institution_data,
            "critical_chart": critical_data,
            "monthly_chart": yearly_chart,
            "top_critical_drugs": top_critical_drugs,
            "filters": {
                "years": sorted(
                    list(NeedRow.objects.values_list("year", flat=True).distinct())
                ),
                "institutions": [
                    {"id": inst.id, "name": inst.name}
                    for inst in Institution.objects.all()
                ],
                "selected_year": selected_year,
                "selected_institution": selected_institution,
            },
        })


class NeedRowSummaryAPIView(APIView):
    permission_classes = [HasPagePermission]
    page_code = "need_rows_summary"

    def get(self, request):
        year = request.GET.get("year")
        institution = request.GET.get("institution")
        drug = request.GET.get("drug")

        qs = NeedRow.objects.select_related("institution", "drug").all()

        if year:
            qs = qs.filter(year=year)
        if institution:
            qs = qs.filter(institution_id=institution)
        if drug:
            qs = qs.filter(drug_id=drug)

        grouped_rows = qs.values(
            "year",
            "institution_id",
            "drug_id",
            institution_name=F("institution__name"),
            drug_name=F("drug__name"),
        ).annotate(
            total_yearly_need=Coalesce(Sum("yearly_need"), dec_zero_3()),
            total_amb_rec_need=Coalesce(Sum("amb_rec_need"), dec_zero_3()),
            total_dpm_need=Coalesce(Sum("dpm_need"), dec_zero_3()),
            total_quarterly_need=Coalesce(Sum("quarterly_need"), dec_zero_3()),
        ).order_by("year", "institution_name", "drug_name")

        result = []

        for row in grouped_rows:
            issued_total = get_issued_total(
                institution_id=row["institution_id"],
                drug_id=row["drug_id"],
                year=row["year"],
            ) or 0

            remaining_total = row["total_yearly_need"] - issued_total

            matched_price = get_latest_price(row["drug_id"], year=row["year"])
            price_value = matched_price.price if matched_price else None

            yearly_sum = row["total_yearly_need"] * price_value if price_value is not None else None
            given_sum = issued_total * price_value if price_value is not None else None
            remaining_sum = remaining_total * price_value if price_value is not None else None

            result.append({
                "year": row["year"],
                "institution_id": row["institution_id"],
                "drug_id": row["drug_id"],
                "institution_name": row["institution_name"],
                "drug_name": row["drug_name"],
                "total_yearly_need": float(row["total_yearly_need"]),
                "total_given_dpm": float(issued_total),
                "total_remaining": float(remaining_total),
                "total_amb_rec_need": float(row["total_amb_rec_need"]),
                "total_dpm_need": float(row["total_dpm_need"]),
                "total_quarterly_need": float(row["total_quarterly_need"]),
                "price": float(price_value) if price_value is not None else None,
                "yearly_sum": float(yearly_sum) if yearly_sum is not None else None,
                "given_sum": float(given_sum) if given_sum is not None else None,
                "remaining_sum": float(remaining_sum) if remaining_sum is not None else None,
            })

        return Response(result)


class AccessProtectedMixin:
    permission_classes = [HasPagePermission]
    page_code = "access_management"
    required_permission = "manage_access"


class RoleListCreateAPIView(AccessProtectedMixin, generics.ListCreateAPIView):
    serializer_class = RoleSerializer

    def get_queryset(self):
        qs = Role.objects.all().order_by("name")
        is_active = self.request.query_params.get("is_active")
        search = self.request.query_params.get("search")

        if is_active in {"true", "false"}:
            qs = qs.filter(is_active=(is_active == "true"))
        if search:
            qs = qs.filter(name__icontains=search)
        return qs
    
    def perform_create(self, serializer):
        role = serializer.save()

        write_audit_log(
            actor=self.request.user,
            action="create",
            target=role,
            target_type="Роль",
            description="Роль қўшилди.",
            extra_data={
                "name": role.name,
                "is_active": role.is_active,
            },
        )

class RoleDetailAPIView(AccessProtectedMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer

    def perform_update(self, serializer):
        role = serializer.save()

        write_audit_log(
            actor=self.request.user,
            action="update",
            target=role,
            target_type="Роль",
            description="Роль янгиланди.",
            extra_data={
                "name": role.name,
                "is_active": role.is_active,
            },
        )

    def destroy(self, request, *args, **kwargs):
        role = self.get_object()

        if UserProfile.objects.filter(role=role).exists():
            return protected_delete_response(
                "Бу роль фойдаланувчиларга бириктирилган. Аввал ушбу фойдаланувчилардан ролни олиб ташланг ёки уларга бошқа роль беринг."
            )

        role_id = role.id
        role_repr = str(role)

        response = super().destroy(request, *args, **kwargs)

        write_audit_log(
            actor=request.user,
            action="delete",
            target_type="Роль",
            description="Роль ўчирилди.",
            extra_data={
                "id": role_id,
                "repr": role_repr,
            },
        )

        return response

class PagePermissionListCreateAPIView(AccessProtectedMixin, generics.ListCreateAPIView):
    serializer_class = PagePermissionSerializer

    def get_queryset(self):
        qs = PagePermission.objects.select_related("role").all().order_by("role__name", "page_code")
        role = self.request.query_params.get("role")
        page_code = self.request.query_params.get("page_code")

        if role:
            qs = qs.filter(role_id=role)
        if page_code:
            qs = qs.filter(page_code=page_code)
        return qs

    def perform_create(self, serializer):
        item = serializer.save()

        write_audit_log(
            actor=self.request.user,
            action="create",
            target=item,
            target_type="Саҳифа рухсати",
            description="Саҳифа рухсати қўшилди.",
            extra_data={
                "role": item.role.name,
                "page_code": item.page_code,
                "can_view": item.can_view,
                "can_add": item.can_add,
                "can_edit": item.can_edit,
                "can_delete": item.can_delete,
                "can_export": item.can_export,
                "can_print": item.can_print,
                "can_manage_access": item.can_manage_access,
            },
        )

class PagePermissionDetailAPIView(AccessProtectedMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset = PagePermission.objects.select_related("role").all()
    serializer_class = PagePermissionSerializer

    def perform_update(self, serializer):
        with transaction.atomic():
            item = serializer.save()
            ensure_manage_access_remains()

            write_audit_log(
                actor=self.request.user,
                action="update",
                target=item,
                target_type="Саҳифа рухсати",
                description="Саҳифа рухсати янгиланди.",
                extra_data={
                    "role": item.role.name,
                    "page_code": item.page_code,
                    "can_view": item.can_view,
                    "can_add": item.can_add,
                    "can_edit": item.can_edit,
                    "can_delete": item.can_delete,
                    "can_export": item.can_export,
                    "can_print": item.can_print,
                    "can_manage_access": item.can_manage_access,
                },
            )

    def destroy(self, request, *args, **kwargs):
        item = self.get_object()

        item_id = item.id
        item_repr = str(item)
        role_name = item.role.name
        page_code = item.page_code

        with transaction.atomic():
            response = super().destroy(request, *args, **kwargs)
            ensure_manage_access_remains()

            write_audit_log(
                actor=request.user,
                action="delete",
                target_type="Саҳифа рухсати",
                description="Саҳифа рухсати ўчирилди.",
                extra_data={
                    "id": item_id,
                    "repr": item_repr,
                    "role": role_name,
                    "page_code": page_code,
                },
            )

        return response

class UserPermissionOverrideListCreateAPIView(AccessProtectedMixin, generics.ListCreateAPIView):
    serializer_class = UserPagePermissionOverrideSerializer

    def get_queryset(self):
        qs = UserPagePermissionOverride.objects.select_related("user").all().order_by("user__username", "page_code")
        user_id = self.request.query_params.get("user")
        page_code = self.request.query_params.get("page_code")

        if user_id:
            qs = qs.filter(user_id=user_id)
        if page_code:
            qs = qs.filter(page_code=page_code)
        return qs

    def perform_create(self, serializer):
        with transaction.atomic():
            item = serializer.save()
            ensure_manage_access_remains()

            write_audit_log(
                actor=self.request.user,
                action="create",
                target=item,
                target_type="Индивидуал override",
                description="Индивидуал override қўшилди.",
                extra_data={
                    "user": item.user.username,
                    "page_code": item.page_code,
                    "can_view": item.can_view,
                    "can_add": item.can_add,
                    "can_edit": item.can_edit,
                    "can_delete": item.can_delete,
                    "can_export": item.can_export,
                    "can_print": item.can_print,
                    "can_manage_access": item.can_manage_access,
                },
            )


class UserPermissionOverrideDetailAPIView(AccessProtectedMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset = UserPagePermissionOverride.objects.select_related("user").all()
    serializer_class = UserPagePermissionOverrideSerializer

    def perform_update(self, serializer):
        with transaction.atomic():
            item = serializer.save()
            ensure_manage_access_remains()

            write_audit_log(
                actor=self.request.user,
                action="update",
                target=item,
                target_type="Индивидуал override",
                description="Фойдаланувчи учун индивидуал рухсат янгиланди.",
                extra_data={
                    "user": item.user.username,
                    "page_code": item.page_code,
                    "can_view": item.can_view,
                    "can_add": item.can_add,
                    "can_edit": item.can_edit,
                    "can_delete": item.can_delete,
                    "can_export": item.can_export,
                    "can_print": item.can_print,
                    "can_manage_access": item.can_manage_access,
                },
            )

    def destroy(self, request, *args, **kwargs):
        item = self.get_object()

        item_id = item.id
        item_repr = str(item)
        username = item.user.username
        page_code = item.page_code

        with transaction.atomic():
            response = super().destroy(request, *args, **kwargs)
            ensure_manage_access_remains()

            write_audit_log(
                actor=request.user,
                action="delete",
                target_type="Индивидуал override",
                description="Фойдаланувчи учун индивидуал рухсат ўчирилди.",
                extra_data={
                    "id": item_id,
                    "repr": item_repr,
                    "user": username,
                    "page_code": page_code,
                },
            )

        return response


class ManagedUserListCreateAPIView(AccessProtectedMixin, generics.ListCreateAPIView):
    def get_queryset(self):
        qs = User.objects.select_related("profile__role").all().order_by("username")
        search = self.request.query_params.get("search")
        role_id = self.request.query_params.get("role")
        is_active = self.request.query_params.get("is_active")

        if search:
            qs = qs.filter(username__icontains=search)
        if role_id:
            qs = qs.filter(profile__role_id=role_id)
        if is_active in {"true", "false"}:
            qs = qs.filter(is_active=(is_active == "true"))
        return qs

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ManagedUserCreateSerializer
        return ManagedUserSerializer

    def perform_create(self, serializer):
        user = serializer.save()

        role = getattr(getattr(user, "profile", None), "role", None)

        write_audit_log(
            actor=self.request.user,
            action="create",
            target=user,
            target_type="Фойдаланувчи",
            description="Фойдаланувчи қўшилди.",
            extra_data={
                "username": user.username,
                "is_active": user.is_active,
                "is_staff": user.is_staff,
                "is_superuser": user.is_superuser,
                "role": role.name if role else None,
                "password_policy": getattr(getattr(user, "profile", None), "password_policy", None),
                "must_change_password": getattr(getattr(user, "profile", None), "must_change_password", None),
            },
        )

class ManagedUserDetailAPIView(AccessProtectedMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.select_related("profile__role").all()

    def get_serializer_class(self):
        if self.request.method in {"PUT", "PATCH"}:
            return ManagedUserUpdateSerializer
        return ManagedUserSerializer

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()

        if user == request.user:
            return protected_delete_response("Ўзингизни ўчириб бўлмайди.")

        active_superusers_count = User.objects.filter(is_superuser=True, is_active=True).count()
        if user.is_superuser and active_superusers_count <= 1:
            return protected_delete_response("Охирги superuser'ни ўчириб бўлмайди.")

        user_id = user.id
        username = user.username
        user_repr = str(user)

        with transaction.atomic():
            response = super().destroy(request, *args, **kwargs)
            ensure_manage_access_remains()

            write_audit_log(
                actor=request.user,
                action="delete",
                target_type="Фойдаланувчи",
                description="Фойдаланувчи ўчирилди.",
                extra_data={
                    "id": user_id,
                    "username": username,
                    "repr": user_repr,
                },
            )

        return response

    def perform_update(self, serializer):
        current_user = self.get_object()
        requested_is_active = serializer.validated_data.get("is_active", current_user.is_active)
        requested_is_superuser = serializer.validated_data.get("is_superuser", current_user.is_superuser)

        if current_user == self.request.user and requested_is_active is False:
            raise serializers.ValidationError({
                "detail": "Ўзингизни API орқали нофаол қилиб бўлмайди."
            })

        if current_user.is_superuser and current_user.is_active:
            active_superusers_count = User.objects.filter(
                is_superuser=True,
                is_active=True,
            ).count()

            if requested_is_active is False and active_superusers_count <= 1:
                raise serializers.ValidationError({
                    "detail": "Охирги фаол superuser'ни нофаол қилиб бўлмайди."
                })

            if requested_is_superuser is False and active_superusers_count <= 1:
                raise serializers.ValidationError({
                    "detail": "Охирги фаол superuser ҳуқуқини олиб ташлаб бўлмайди."
                })

        was_active = current_user.is_active

        with transaction.atomic():
            user = serializer.save()
            ensure_manage_access_remains()

            role = getattr(getattr(user, "profile", None), "role", None)

            if was_active != user.is_active:
                description = (
                    "Фойдаланувчи фаол қилинди."
                    if user.is_active
                    else "Фойдаланувчи нофаол қилинди."
                )
            else:
                description = "Фойдаланувчи янгиланди."

            write_audit_log(
                actor=self.request.user,
                action="update",
                target=user,
                target_type="Фойдаланувчи",
                description=description,
                extra_data={
                    "username": user.username,
                    "is_active": user.is_active,
                    "is_staff": user.is_staff,
                    "is_superuser": user.is_superuser,
                    "role": role.name if role else None,
                    "password_policy": getattr(getattr(user, "profile", None), "password_policy", None),
                    "must_change_password": getattr(getattr(user, "profile", None), "must_change_password", None),
                },
            )

class AdminSetPasswordAPIView(AccessProtectedMixin, APIView):
    def post(self, request, pk):
        target_user = generics.get_object_or_404(User, pk=pk)
        serializer = AdminSetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        target_user.set_password(serializer.validated_data["new_password"])
        target_user.save(update_fields=["password"])

        profile, _created = UserProfile.objects.get_or_create(user=target_user)
        profile.password_policy = serializer.validated_data.get("password_policy", profile.password_policy)
        profile.must_change_password = serializer.validated_data.get("must_change_password", profile.must_change_password)
        profile.save()

        Token.objects.filter(user=target_user).delete()

        write_audit_log(
            actor=request.user,
            action="update",
            target=target_user,
            target_type="Фойдаланувчи пароли",
            description="Фойдаланувчи пароли админ томонидан янгиланди.",
            extra_data={
                "user_id": target_user.id,
                "username": target_user.username,
                "password_policy": profile.password_policy,
                "must_change_password": profile.must_change_password,
            },
        )
        
        return Response({"detail": "Пароль янгиланди. Эски токенлар бекор қилинди."})
    
class SelfChangePasswordAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = SelfChangePasswordSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)

        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save(update_fields=["password"])

        profile, _created = UserProfile.objects.get_or_create(user=request.user)
        profile.must_change_password = False
        profile.save(update_fields=["must_change_password"])

        Token.objects.filter(user=request.user).delete()
        token = Token.objects.create(user=request.user)

        write_audit_log(
            actor=request.user,
            action="update",
            target=request.user,
            target_type="Ўз пароли",
            description="Фойдаланувчи ўз паролини алмаштирди.",
            extra_data={
                "user_id": request.user.id,
                "username": request.user.username,
                "password_policy": profile.password_policy,
                "must_change_password": profile.must_change_password,
            },
        )

        return Response({
            "detail": "Пароль муваффақиятли алмаштирилди.",
            "token": token.key,
            "must_change_password": False,
        })
