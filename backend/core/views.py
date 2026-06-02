from core.models import Price
from datetime import date
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import DecimalField, F, Q, Sum, Value
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
    NeedAddition,
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
    NeedAdditionSerializer,
    NeedRowSerializer,
    get_need_addition_total,
    PagePermissionSerializer,
    PriceSerializer,
    RoleSerializer,
    UserPagePermissionOverrideSerializer,
    SelfChangePasswordSerializer,
)

User = get_user_model()



def get_drug_label(drug):
    if not drug:
        return ""
    return getattr(drug, "display_name", None) or getattr(drug, "full_name", "") or drug.name

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

def get_need_parts(need):
    base_need = need.yearly_need or 0
    additional_need = get_need_addition_total(need_row=need) or 0
    total_need = base_need + additional_need
    return base_need, additional_need, total_need


def get_need_addition_count(institution_id=None, drug_id=None, year=None, need_row=None, need_row_id=None, active_only=True):
    qs = NeedAddition.objects.all()

    if active_only:
        qs = qs.filter(is_active=True)

    if need_row is not None:
        qs = qs.filter(need_row=need_row)

    if need_row_id is not None:
        qs = qs.filter(need_row_id=need_row_id)

    if institution_id is not None:
        qs = qs.filter(institution_id=institution_id)

    if drug_id is not None:
        qs = qs.filter(drug_id=drug_id)

    if year is not None:
        qs = qs.filter(year=year)

    return qs.count()


def get_status(total_need, issued_total, remaining_percent):
    if issued_total > total_need:
        return "Ортиқча берилган"
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
        "need_additions": "/api/need-additions/",
        "need_row_additions": "/api/need-row-additions/",
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
    serializer_class = InstitutionSerializer
    permission_classes = [HasPagePermission]
    page_code = "institutions"

    def get_queryset(self):
        qs = Institution.objects.all()

        search = self.request.query_params.get("search")
        name = self.request.query_params.get("name")
        inn = self.request.query_params.get("inn")
        is_active = self.request.query_params.get("is_active")

        if search:
            search = search.strip()
            qs = qs.filter(
                Q(name__icontains=search)
                | Q(inn__icontains=search)
                | Q(address__icontains=search)
            )

        if name:
            qs = qs.filter(name__icontains=name.strip())

        if inn:
            qs = qs.filter(inn__icontains=inn.strip())

        if is_active in {"true", "false"}:
            qs = qs.filter(is_active=(is_active == "true"))

        return qs.order_by("name")


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
                "inn": item.inn,
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
                "inn": item.inn,
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
        
        if NeedAddition.objects.filter(institution=obj).exists():
            return protected_delete_response(
                "Бу муассаса «Қўшимча эҳтиёж» ёзувларида ишлатилган. Аввал боғлиқ қўшимча эҳтиёжларни ўчиринг."
            )

        obj_id = obj.id
        obj_repr = str(obj)
        obj_name = obj.name
        obj_inn = obj.inn

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
                "inn": obj_inn,
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

        if Price.objects.filter(drug=obj).exists():
            return protected_delete_response(
                "Бу дори «Нархлар» саҳифасида ишлатилган. Аввал боғлиқ нарх қаторларини ўчиринг."
            )

        if NeedRow.objects.filter(drug=obj).exists():
            return protected_delete_response(
                "Бу дори «Эҳтиёж» саҳифасида ишлатилган. Аввал боғлиқ эҳтиёж қаторларини ўчиринг."
            )

        if MonthlyIssue.objects.filter(drug=obj).exists():
            return protected_delete_response(
                "Бу дори «Берилган миқдор» саҳифасида ишлатилган. Аввал боғлиқ берилган миқдор қаторларини ўчиринг."
            )
        
        if NeedAddition.objects.filter(drug=obj).exists():
            return protected_delete_response(
                "Бу дори «Қўшимча эҳтиёж» ёзувларида ишлатилган. Аввал боғлиқ қўшимча эҳтиёжларни ўчиринг."
            )

        obj_id = obj.id
        obj_repr = str(obj)
        obj_name = obj.name

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
    queryset = Price.objects.select_related("drug").all().order_by("drug__full_name", "-start_date", "-id")
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
                "drug": get_drug_label(item.drug) if item.drug else None,
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
                "drug": get_drug_label(item.drug) if item.drug else None,
                "price": str(item.price),
                "is_active": item.is_active,
            },
        )

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()

        obj_id = obj.id
        obj_repr = str(obj)
        drug_name = get_drug_label(obj.drug) if obj.drug else None
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
            "-year", "institution__name", "drug__full_name", "-id"
        )

        year = self.request.query_params.get("year")
        institution = self.request.query_params.get("institution")
        drug = self.request.query_params.get("drug")
        institution_inn = self.request.query_params.get("institution_inn")
        search = self.request.query_params.get("search")

        if year:
            qs = qs.filter(year=year)

        if institution:
            qs = qs.filter(institution_id=institution)

        if drug:
            qs = qs.filter(drug_id=drug)

        if institution_inn:
            qs = qs.filter(institution__inn__icontains=institution_inn.strip())

        if search:
            text = search.strip()
            qs = qs.filter(
                Q(institution__name__icontains=text)
                | Q(institution__inn__icontains=text)
                | Q(drug__name__icontains=text)
                | Q(drug__full_name__icontains=text)
                | Q(drug__mnn_name__icontains=text)
            )

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
                "institution_inn": item.institution.inn if item.institution else None,
                "drug": get_drug_label(item.drug) if item.drug else None,
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
                "institution_inn": item.institution.inn if item.institution else None,
                "drug": get_drug_label(item.drug) if item.drug else None,
                "year": item.year,
                "issued_qty": str(item.issued_qty),
            },
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        issue_id = instance.id
        issue_repr = str(instance)
        institution_name = instance.institution.name if instance.institution else None
        institution_inn = instance.institution.inn if instance.institution else None
        drug_name = get_drug_label(instance.drug) if instance.drug else None
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
                "institution_inn": institution_inn,
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
            "-year", "institution__name", "drug__full_name", "-id"
        )

        year = self.request.query_params.get("year")
        institution = self.request.query_params.get("institution")
        drug = self.request.query_params.get("drug")
        institution_inn = self.request.query_params.get("institution_inn")
        search = self.request.query_params.get("search")

        if year:
            qs = qs.filter(year=year)

        if institution:
            qs = qs.filter(institution_id=institution)

        if drug:
            qs = qs.filter(drug_id=drug)

        if institution_inn:
            qs = qs.filter(institution__inn__icontains=institution_inn.strip())

        if search:
            text = search.strip()
            qs = qs.filter(
                Q(institution__name__icontains=text)
                | Q(institution__inn__icontains=text)
                | Q(drug__name__icontains=text)
                | Q(drug__full_name__icontains=text)
                | Q(drug__mnn_name__icontains=text)
            )

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
                "drug": get_drug_label(item.drug) if item.drug else None,
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
                "drug": get_drug_label(item.drug) if item.drug else None,
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
        
        active_addition_exists = NeedAddition.objects.filter(
            institution=instance.institution,
            drug=instance.drug,
            year=instance.year,
            is_active=True,
        ).exists()

        if active_addition_exists:
            return Response(
                {
                    "detail": "Бу эҳтиёж қаторига фаол қўшимча эҳтиёж ёзувлари боғланган. Аввал қўшимча эҳтиёжларни бекор қилинг."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Фақат бекор қилинган қўшимча тарих қолган бўлса,
        # асосий эҳтиёж қаторини тозалаш учун уларни автомат ўчирамиз.
        NeedAddition.objects.filter(
            institution=instance.institution,
            drug=instance.drug,
            year=instance.year,
            is_active=False,
        ).delete()

        row_id = instance.id
        row_repr = str(instance)
        institution_name = instance.institution.name if instance.institution else None
        drug_name = get_drug_label(instance.drug) if instance.drug else None
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
    
class NeedAdditionListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = NeedAdditionSerializer
    permission_classes = [HasPagePermission]
    page_code = "need_rows"

    def get_queryset(self):
        qs = NeedAddition.objects.select_related(
            "need_row",
            "institution",
            "drug",
            "created_by",
        ).all().order_by(
            "-year",
            "institution__name",
            "drug__name",
            "-addition_date",
            "-id",
        )

        need_row = self.request.query_params.get("need_row") or self.request.query_params.get("need_row_id")
        year = self.request.query_params.get("year")
        institution = self.request.query_params.get("institution") or self.request.query_params.get("institution_id")
        drug = self.request.query_params.get("drug") or self.request.query_params.get("drug_id")
        institution_inn = self.request.query_params.get("institution_inn")
        is_active = self.request.query_params.get("is_active")
        search = self.request.query_params.get("search")

        if need_row:
            qs = qs.filter(need_row_id=need_row)

        if year:
            qs = qs.filter(year=year)

        if institution:
            qs = qs.filter(institution_id=institution)

        if drug:
            qs = qs.filter(drug_id=drug)

        if institution_inn:
            qs = qs.filter(institution__inn__icontains=institution_inn.strip())

        if is_active in {"true", "false"}:
            qs = qs.filter(is_active=(is_active == "true"))

        if search:
            text = search.strip()
            qs = qs.filter(
                Q(institution__name__icontains=text)
                | Q(institution__inn__icontains=text)
                | Q(drug__name__icontains=text)
                | Q(drug__full_name__icontains=text)
                | Q(drug__mnn_name__icontains=text)
                | Q(reason__icontains=text)
                | Q(doc_number__icontains=text)
                | Q(comment__icontains=text)
                | Q(cancel_reason__icontains=text)
            )

        return qs

    def perform_create(self, serializer):
        item = serializer.save(created_by=self.request.user)

        write_audit_log(
            actor=self.request.user,
            action="create",
            target=item,
            target_type="Қўшимча эҳтиёж",
            description="Қўшимча эҳтиёж қўшилди.",
            extra_data={
                "need_row": item.need_row_id,
                "institution": item.institution.name if item.institution else None,
                "institution_inn": item.institution.inn if item.institution else None,
                "drug": get_drug_label(item.drug) if item.drug else None,
                "year": item.year,
                "dpm_need_add": str(item.dpm_need_add),
                "amb_rec_need_add": str(item.amb_rec_need_add),
                "total_additional_need": str(item.total_additional_need),
                "added_qty": str(item.added_qty),
                "addition_date": str(item.addition_date),
                "reason": item.reason,
                "doc_number": item.doc_number,
                "doc_date": str(item.doc_date) if item.doc_date else None,
                "comment": item.comment,
                "is_active": item.is_active,
            },
        )


class NeedAdditionDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = NeedAddition.objects.select_related(
        "need_row",
        "institution",
        "drug",
        "created_by",
    ).all()
    serializer_class = NeedAdditionSerializer
    permission_classes = [HasPagePermission]
    page_code = "need_rows"

    def perform_update(self, serializer):
        old_item = self.get_object()
        was_active = old_item.is_active

        item = serializer.save()

        is_cancel_action = was_active and not item.is_active
        action = "delete" if is_cancel_action else "update"
        description = "Қўшимча эҳтиёж бекор қилинди." if is_cancel_action else "Қўшимча эҳтиёж янгиланди."

        write_audit_log(
            actor=self.request.user,
            action=action,
            target=item,
            target_type="Қўшимча эҳтиёж",
            description=description,
            extra_data={
                "need_row": item.need_row_id,
                "institution": item.institution.name if item.institution else None,
                "institution_inn": item.institution.inn if item.institution else None,
                "drug": get_drug_label(item.drug) if item.drug else None,
                "year": item.year,
                "dpm_need_add": str(item.dpm_need_add),
                "amb_rec_need_add": str(item.amb_rec_need_add),
                "total_additional_need": str(item.total_additional_need),
                "added_qty": str(item.added_qty),
                "addition_date": str(item.addition_date),
                "reason": item.reason,
                "doc_number": item.doc_number,
                "doc_date": str(item.doc_date) if item.doc_date else None,
                "comment": item.comment,
                "is_active": item.is_active,
                "cancel_reason": item.cancel_reason,
            },
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        # Фаол қўшимча эҳтиёж DELETE қилинса — ҳисобдан чиқариш учун soft cancel.
        if instance.is_active:
            cancel_reason = ""

            if hasattr(request, "data") and isinstance(request.data, dict):
                cancel_reason = request.data.get("cancel_reason") or ""

            cancel_reason = (
                cancel_reason
                or request.query_params.get("cancel_reason")
                or "DELETE орқали бекор қилинди."
            )

            serializer = self.get_serializer(
                instance,
                data={
                    "is_active": False,
                    "cancel_reason": cancel_reason,
                    "comment": instance.comment or cancel_reason,
                },
                partial=True,
            )
            serializer.is_valid(raise_exception=True)
            item = serializer.save()

            write_audit_log(
                actor=request.user,
                action="delete",
                target=item,
                target_type="Қўшимча эҳтиёж",
                description="Қўшимча эҳтиёж бекор қилинди.",
                extra_data={
                    "id": item.id,
                    "need_row": item.need_row_id,
                    "institution": item.institution.name if item.institution else None,
                    "institution_inn": item.institution.inn if item.institution else None,
                    "drug": get_drug_label(item.drug) if item.drug else None,
                    "year": item.year,
                    "dpm_need_add": str(item.dpm_need_add),
                    "amb_rec_need_add": str(item.amb_rec_need_add),
                    "total_additional_need": str(item.total_additional_need),
                    "added_qty": str(item.added_qty),
                    "addition_date": str(item.addition_date),
                    "reason": item.reason,
                    "doc_number": item.doc_number,
                    "doc_date": str(item.doc_date) if item.doc_date else None,
                    "comment": item.comment,
                    "is_active": item.is_active,
                    "cancel_reason": item.cancel_reason,
                },
            )

            return Response(self.get_serializer(item).data, status=status.HTTP_200_OK)

        # Бекор қилинган қўшимча эҳтиёж DELETE қилинса — тарихдан бутунлай ўчириш.
        item_id = instance.id
        need_row_id = instance.need_row_id
        institution_name = instance.institution.name if instance.institution else None
        institution_inn = instance.institution.inn if instance.institution else None
        drug_name = get_drug_label(instance.drug) if instance.drug else None
        year = instance.year
        total_additional_need = str(instance.total_additional_need)
        cancel_reason = instance.cancel_reason

        instance.delete()

        write_audit_log(
            actor=request.user,
            action="delete",
            target_type="Қўшимча эҳтиёж",
            description="Бекор қилинган қўшимча эҳтиёж тарихдан бутунлай ўчирилди.",
            extra_data={
                "id": item_id,
                "need_row": need_row_id,
                "institution": institution_name,
                "institution_inn": institution_inn,
                "drug": drug_name,
                "year": year,
                "total_additional_need": total_additional_need,
                "cancel_reason": cancel_reason,
                "hard_delete": True,
            },
        )

        return Response(
            {"detail": "Бекор қилинган қўшимча эҳтиёж тарихдан ўчирилди."},
            status=status.HTTP_200_OK,
        )




# --- FAST_BULK_DELETE_NEEDROWS_ADDITIONS_V1 ---
def _bulk_ids_from_request(request):
    raw_ids = request.data.get("ids") or request.data.get("selected_ids") or []

    if isinstance(raw_ids, str):
        raw_ids = raw_ids.replace(";", ",").split(",")

    ids = []
    for value in raw_ids:
        try:
            item_id = int(value)
        except Exception:
            continue

        if item_id > 0:
            ids.append(item_id)

    return list(dict.fromkeys(ids))


def _row_key(row):
    return (row.institution_id, row.drug_id, row.year)


def _bulk_error_item(item_id, detail):
    return {"id": item_id, "detail": detail}


class NeedRowBulkDeleteAPIView(APIView):
    permission_classes = [HasPagePermission]
    page_code = "need_rows"
    required_permission = "delete"

    def post(self, request):
        ids = _bulk_ids_from_request(request)

        if not ids:
            return Response(
                {"detail": "чириш учун ID рўйхати юборилмади."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        rows = list(
            NeedRow.objects
            .select_related("institution", "drug")
            .filter(id__in=ids)
        )

        found_ids = {row.id for row in rows}
        missing_ids = [item_id for item_id in ids if item_id not in found_ids]

        institution_ids = {row.institution_id for row in rows}
        drug_ids = {row.drug_id for row in rows}
        years = {row.year for row in rows}
        row_ids = [row.id for row in rows]

        issue_keys = set()
        if rows:
            issue_keys = set(
                MonthlyIssue.objects
                .filter(
                    institution_id__in=institution_ids,
                    drug_id__in=drug_ids,
                    year__in=years,
                )
                .values_list("institution_id", "drug_id", "year")
            )

        active_addition_need_row_ids = set()
        active_addition_keys = set()
        if rows:
            active_qs = (
                NeedAddition.objects
                .filter(is_active=True)
                .filter(
                    Q(need_row_id__in=row_ids)
                    | Q(
                        institution_id__in=institution_ids,
                        drug_id__in=drug_ids,
                        year__in=years,
                    )
                )
            )

            active_addition_need_row_ids = set(
                active_qs
                .exclude(need_row_id__isnull=True)
                .values_list("need_row_id", flat=True)
            )

            active_addition_keys = set(
                active_qs.values_list("institution_id", "drug_id", "year")
            )

        blocked = []
        deletable_rows = []

        for row in rows:
            key = _row_key(row)

            if key in issue_keys:
                blocked.append(
                    _bulk_error_item(
                        row.id,
                        "ерилган миқдор боғланган. ввал «ерилган миқдор» саҳифасидан ўчиринг.",
                    )
                )
                continue

            if row.id in active_addition_need_row_ids or key in active_addition_keys:
                blocked.append(
                    _bulk_error_item(
                        row.id,
                        "аол қўшимча эҳтиёж боғланган. ввал қўшимча эҳтиёжни бекор қилинг.",
                    )
                )
                continue

            deletable_rows.append(row)

        deleted_count = 0
        cleaned_additions_count = 0

        with transaction.atomic():
            deletable_ids = [row.id for row in deletable_rows]

            if deletable_ids:
                # ақат бекор қилинган қўшимча эҳтиёжлар асосий қатор ўчишига халақит бермаслиги учун тозаланади.
                inactive_delete_result = (
                    NeedAddition.objects
                    .filter(need_row_id__in=deletable_ids, is_active=False)
                    .delete()
                )
                cleaned_additions_count = inactive_delete_result[0] or 0

                delete_result = NeedRow.objects.filter(id__in=deletable_ids).delete()
                deleted_count = delete_result[0] or 0

                write_audit_log(
                    actor=request.user,
                    action="delete",
                    target_type="ҳтиёж",
                    description="ҳтиёж қаторлари оммавий ўчирилди.",
                    extra_data={
                        "bulk": True,
                        "requested_count": len(ids),
                        "deleted_count": deleted_count,
                        "blocked_count": len(blocked),
                        "missing_count": len(missing_ids),
                        "cleaned_cancelled_additions": cleaned_additions_count,
                        "deleted_ids_sample": deletable_ids[:200],
                    },
                )

        return Response({
            "detail": f"{deleted_count} та эҳтиёж қатори ўчирилди.",
            "requested_count": len(ids),
            "deleted_count": deleted_count,
            "blocked_count": len(blocked),
            "missing_ids": missing_ids,
            "blocked": blocked[:500],
            "cleaned_cancelled_additions": cleaned_additions_count,
        })


class NeedAdditionBulkDeleteAPIView(APIView):
    permission_classes = [HasPagePermission]
    page_code = "need_rows"
    required_permission = "delete"

    def post(self, request):
        ids = _bulk_ids_from_request(request)

        if not ids:
            return Response(
                {"detail": "чириш учун қўшимча эҳтиёж ID рўйхати юборилмади."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cancel_reason = (
            request.data.get("cancel_reason")
            or "ммавий ўчириш орқали бекор қилинди."
        )

        additions = list(
            NeedAddition.objects
            .select_related("need_row", "institution", "drug")
            .filter(id__in=ids)
        )

        found_ids = {item.id for item in additions}
        missing_ids = [item_id for item_id in ids if item_id not in found_ids]

        active_items = [item for item in additions if item.is_active]
        inactive_items = [item for item in additions if not item.is_active]

        active_by_row = {}
        active_without_row = []

        for item in active_items:
            if item.need_row_id:
                active_by_row.setdefault(item.need_row_id, []).append(item)
            else:
                active_without_row.append(item)

        blocked = []
        cancellable_ids = []

        for need_row_id, items in active_by_row.items():
            need_row = items[0].need_row

            selected_total = sum(
                (item.total_additional_need or item.added_qty or 0)
                for item in items
            )

            all_active_total = (
                NeedAddition.objects
                .filter(need_row_id=need_row_id, is_active=True)
                .aggregate(total=Coalesce(Sum("total_additional_need"), dec_zero_3()))
                ["total"]
                or 0
            )

            total_need_after_cancel = (
                (need_row.yearly_need or 0)
                + all_active_total
                - selected_total
            )

            issued_total = get_issued_total(
                institution=need_row.institution,
                drug=need_row.drug,
                year=need_row.year,
            ) or 0

            if issued_total > total_need_after_cancel:
                for item in items:
                    blocked.append(
                        _bulk_error_item(
                            item.id,
                            (
                                "екор қилиб бўлмайди: берилган миқдор "
                                f"{issued_total}, бекор қилингандан кейин жами эҳтиёж "
                                f"{total_need_after_cancel} бўлиб қолади."
                            ),
                        )
                    )
            else:
                cancellable_ids.extend([item.id for item in items])

        # need_row боғланмаган эски ёзувлар: фаол бўлса soft cancel қилинади.
        cancellable_ids.extend([item.id for item in active_without_row])

        deletable_cancelled_ids = [item.id for item in inactive_items]

        cancelled_count = 0
        deleted_count = 0

        with transaction.atomic():
            if cancellable_ids:
                cancelled_count = (
                    NeedAddition.objects
                    .filter(id__in=cancellable_ids, is_active=True)
                    .update(is_active=False, cancel_reason=cancel_reason)
                )

            if deletable_cancelled_ids:
                delete_result = (
                    NeedAddition.objects
                    .filter(id__in=deletable_cancelled_ids, is_active=False)
                    .delete()
                )
                deleted_count = delete_result[0] or 0

            if cancellable_ids or deletable_cancelled_ids:
                write_audit_log(
                    actor=request.user,
                    action="delete",
                    target_type="ўшимча эҳтиёж",
                    description="ўшимча эҳтиёжлар оммавий бекор/ўчирилди.",
                    extra_data={
                        "bulk": True,
                        "requested_count": len(ids),
                        "cancelled_active_count": cancelled_count,
                        "deleted_cancelled_count": deleted_count,
                        "blocked_count": len(blocked),
                        "missing_count": len(missing_ids),
                        "cancelled_ids_sample": cancellable_ids[:200],
                        "deleted_ids_sample": deletable_cancelled_ids[:200],
                    },
                )

        return Response({
            "detail": (
                f"{cancelled_count} та фаол қўшимча эҳтиёж бекор қилинди, "
                f"{deleted_count} та бекор қилинган қўшимча эҳтиёж тарихдан ўчирилди."
            ),
            "requested_count": len(ids),
            "cancelled_count": cancelled_count,
            "deleted_count": deleted_count,
            "blocked_count": len(blocked),
            "missing_ids": missing_ids,
            "blocked": blocked[:500],
        })
# --- /FAST_BULK_DELETE_NEEDROWS_ADDITIONS_V1 ---


# STOCK_SUMMARY_PRICE_HELPER_V1
def _stock_summary_to_decimal(value):
    if value is None or value == "" or value == "—":
        return Decimal("0")

    try:
        return Decimal(str(value).replace(" ", "").replace(",", "."))
    except Exception:
        return Decimal("0")


def _stock_summary_current_price(drug_id, year):
    if not drug_id or not year:
        return None

    try:
        year_int = int(year)
    except Exception:
        return None

    price_obj = (
        Price.objects
        .filter(
            drug_id=drug_id,
            is_active=True,
            start_date__lte=date(year_int, 12, 31),
        )
        .order_by("-start_date", "-id")
        .first()
    )

    return price_obj.price if price_obj else None


def enrich_stock_summary_rows_with_prices(rows):
    enriched = []

    for row in rows:
        item = dict(row)

        drug_id = item.get("drug_id") or item.get("drug")
        year = item.get("year")

        price = _stock_summary_current_price(drug_id, year)

        total_need = _stock_summary_to_decimal(
            item.get("total_yearly_need")
            or item.get("total_need")
            or item.get("yearly_need")
        )

        issued_qty = _stock_summary_to_decimal(
            item.get("issued_qty")
            or item.get("issued_total")
            or item.get("given_qty")
            or item.get("given")
        )

        remaining_qty = _stock_summary_to_decimal(
            item.get("remaining_qty")
            or item.get("remaining")
        )

        if remaining_qty == Decimal("0") and total_need != Decimal("0"):
            remaining_qty = total_need - issued_qty

        if price is None:
            item["price"] = None
            item["current_price"] = None
            item["referent_price"] = None

            item["yearly_sum"] = None
            item["total_sum"] = None
            item["need_sum"] = None
            item["total_need_sum"] = None
            item["yearly_need_sum"] = None

            item["given_sum"] = None
            item["issued_sum"] = None
            item["remaining_sum"] = None
        else:
            price_dec = _stock_summary_to_decimal(price)

            total_need_sum = total_need * price_dec
            issued_sum = issued_qty * price_dec
            remaining_sum = remaining_qty * price_dec

            item["price"] = price_dec
            item["current_price"] = price_dec
            item["referent_price"] = price_dec

            # Aliases for frontend/export compatibility
            item["yearly_sum"] = total_need_sum
            item["total_sum"] = total_need_sum
            item["need_sum"] = total_need_sum
            item["total_need_sum"] = total_need_sum
            item["yearly_need_sum"] = total_need_sum

            item["given_sum"] = issued_sum
            item["issued_sum"] = issued_sum
            item["remaining_sum"] = remaining_sum

        enriched.append(item)

    return enriched


class StockSummaryAPIView(APIView):
    permission_classes = [HasPagePermission]
    page_code = "stock_summary"

    def get(self, request):
        year = request.GET.get("year")
        institution = request.GET.get("institution")
        drug = request.GET.get("drug")
        institution_inn = request.GET.get("institution_inn")
        search = request.GET.get("search")

        qs = NeedRow.objects.select_related("institution", "drug").all().order_by(
            "institution__name", "drug__full_name", "year"
        )

        if year:
            qs = qs.filter(year=year)

        if institution:
            qs = qs.filter(institution_id=institution)

        if drug:
            qs = qs.filter(drug_id=drug)

        if institution_inn:
            qs = qs.filter(institution__inn__icontains=institution_inn.strip())

        if search:
            text = search.strip()
            qs = qs.filter(
                Q(institution__name__icontains=text)
                | Q(institution__inn__icontains=text)
                | Q(drug__name__icontains=text)
                | Q(drug__full_name__icontains=text)
                | Q(drug__mnn_name__icontains=text)
            )

        rows = []

        for need in qs:
            issued_total = get_issued_total(
                institution=need.institution,
                drug=need.drug,
                year=need.year,
            ) or 0

            base_need, additional_need, total_need = get_need_parts(need)
            remaining = total_need - issued_total

            remaining_percent = 0
            if total_need > 0:
                remaining_percent = round(float((remaining / total_need) * 100), 2)

            row_status = get_status(total_need, issued_total, remaining_percent)

            rows.append({
                "institution_id": need.institution.id,
                "institution_name": need.institution.name,
                "institution_inn": need.institution.inn or "",
                "drug_id": need.drug.id,
                "drug_name": get_drug_label(need.drug),
                "year": need.year,

                "yearly_need": float(base_need),
                "additional_need": float(additional_need),
                "total_need": float(total_need),
                "addition_count": get_need_addition_count(
                    need.institution_id,
                    need.drug_id,
                    need.year,
                ),

                "issued_qty": float(issued_total),
                "remaining_qty": float(remaining),
                "remaining_percent": remaining_percent,
                "status": row_status,
            })

        return Response(enrich_stock_summary_rows_with_prices(rows))

class DashboardSummaryAPIView(APIView):
    permission_classes = [HasPagePermission]
    page_code = "dashboard"

    def get(self, request):
        selected_year = request.GET.get("year")
        selected_institution = request.GET.get("institution")
        institution_inn = request.GET.get("institution_inn")
        search = request.GET.get("search")

        clean_inn = (institution_inn or "").strip()
        clean_search = (search or "").strip()

        need_rows_qs = NeedRow.objects.select_related("institution", "drug").all()
        monthly_issues_qs = MonthlyIssue.objects.select_related("institution", "drug").all()

        if selected_year:
            need_rows_qs = need_rows_qs.filter(year=selected_year)
            monthly_issues_qs = monthly_issues_qs.filter(year=selected_year)

        if selected_institution:
            need_rows_qs = need_rows_qs.filter(institution_id=selected_institution)
            monthly_issues_qs = monthly_issues_qs.filter(institution_id=selected_institution)

        if clean_inn:
            need_rows_qs = need_rows_qs.filter(institution__inn__icontains=clean_inn)
            monthly_issues_qs = monthly_issues_qs.filter(institution__inn__icontains=clean_inn)

        if clean_search:
            need_rows_qs = need_rows_qs.filter(
                Q(institution__name__icontains=clean_search)
                | Q(institution__inn__icontains=clean_search)
                | Q(drug__name__icontains=clean_search)
                | Q(drug__full_name__icontains=clean_search)
                | Q(drug__mnn_name__icontains=clean_search)
            )
            monthly_issues_qs = monthly_issues_qs.filter(
                Q(institution__name__icontains=clean_search)
                | Q(institution__inn__icontains=clean_search)
                | Q(drug__name__icontains=clean_search)
                | Q(drug__full_name__icontains=clean_search)
                | Q(drug__mnn_name__icontains=clean_search)
            )

        total_institutions = need_rows_qs.values("institution_id").distinct().count()
        total_drugs = need_rows_qs.values("drug_id").distinct().count()
        total_need_rows = need_rows_qs.count()
        total_issue_rows = monthly_issues_qs.count()

        total_base_need_sum = need_rows_qs.aggregate(
            total=Coalesce(Sum("yearly_need"), dec_zero_3())
        )["total"] or 0

        total_additional_need_sum = sum(
            (
                get_need_addition_total(
                    institution=need.institution,
                    drug=need.drug,
                    year=need.year,
                ) or 0
            )
            for need in need_rows_qs
        )

        total_need_sum = total_base_need_sum + total_additional_need_sum

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
        elif clean_inn or clean_search:
            institution_ids = need_rows_qs.values_list(
                "institution_id",
                flat=True,
            ).distinct()
            institutions_qs = institutions_qs.filter(id__in=institution_ids)

        for inst in institutions_qs:
            inst_need_qs = need_rows_qs.filter(institution=inst)

            inst_base_need = inst_need_qs.aggregate(
                total=Coalesce(Sum("yearly_need"), dec_zero_3())
            )["total"] or 0

            inst_additional_need = sum(
                (
                    get_need_addition_total(
                        institution=need.institution,
                        drug=need.drug,
                        year=need.year,
                    ) or 0
                )
                for need in inst_need_qs
            )

            inst_need = inst_base_need + inst_additional_need

            inst_issued = monthly_issues_qs.filter(institution=inst).aggregate(
                total=Coalesce(Sum("issued_qty"), dec_zero_3())
            )["total"] or 0

            institution_data.append({
                "id": inst.id,
                "name": inst.name,
                "inn": inst.inn or "",
                "yearly_need": float(inst_need),
                "issued": float(inst_issued),
                "remaining": float(inst_need - inst_issued),
            })

        warning_under_50 = 0
        low_under_30 = 0
        critical_under_20 = 0
        over_need = 0
        total_over_issued_qty = Decimal("0")
        total_over_issued_sum = Decimal("0")

        total_addition_count = 0
        total_additional_need_qty = 0
        additional_over_50_positions = 0
        additional_risk_positions = 0

        top_critical_drugs = []
        top_over_issued = []
        top_additional_need = []
        full_additional_need = []

        for need in need_rows_qs:
            base_need, additional_need, total_need = get_need_parts(need)

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

            over_qty = issued_total - total_need

            if row_status == "Ортиқча берилган":
                over_need += 1
                if over_qty > 0:
                    total_over_issued_qty += over_qty
                    if price_value is not None:
                        total_over_issued_sum += over_qty * price_value
            elif row_status == "Критик":
                critical_under_20 += 1
            elif row_status == "Паст":
                low_under_30 += 1
            elif row_status == "Огоҳлантириш":
                warning_under_50 += 1

            addition_count = get_need_addition_count(
                need.institution_id,
                need.drug_id,
                need.year,
            )

            additional_percent = 0
            if base_need > 0:
                additional_percent = float((additional_need / base_need) * 100)
            elif additional_need > 0:
                additional_percent = 100

            if additional_need <= 0:
                additional_risk_status = "Қўшимча йўқ"
            elif additional_percent >= 50:
                additional_risk_status = "Критик"
            elif additional_percent >= 30:
                additional_risk_status = "Юқори хавф"
            elif additional_percent >= 15:
                additional_risk_status = "Огоҳлантириш"
            elif additional_percent >= 10:
                additional_risk_status = "Тушунарли"
            else:
                additional_risk_status = "Норма"

            total_addition_count += addition_count
            total_additional_need_qty += additional_need

            if additional_percent >= 50:
                additional_over_50_positions += 1

            if additional_percent >= 30:
                additional_risk_positions += 1

            addition_reasons = list(
                NeedAddition.objects.filter(
                    institution_id=need.institution_id,
                    drug_id=need.drug_id,
                    year=need.year,
                )
                .exclude(reason__isnull=True)
                .exclude(reason="")
                .values_list("reason", flat=True)
                .distinct()[:3]
            )

            addition_reasons_text = ", ".join(addition_reasons) if addition_reasons else "—"

            dashboard_position = {
                "institution": need.institution.name,
                "institution_inn": need.institution.inn or "",
                "drug": get_drug_label(need.drug),
                "year": need.year,
                "yearly_need": float(total_need),
                "base_yearly_need": float(base_need),
                "additional_need": float(additional_need),
                "additional_need_percent": round(float(additional_percent), 2),
                "additional_risk_status": additional_risk_status,
                "addition_count": addition_count,
                "total_need": float(total_need),
                "issued_qty": float(issued_total),
                "remaining_qty": float(remaining),
                "remaining_percent": round(float(remaining_percent), 2),
                "status": row_status,
            }

            if row_status == "Ортиқча берилган":
                top_over_issued.append({
                    **dashboard_position,
                    "over_qty": round(float(over_qty), 3),
                    "over_percent": round(float((over_qty / total_need) * 100), 2) if total_need > 0 else 0,
                })
            elif row_status in {"Критик", "Паст", "Огоҳлантириш"}:
                top_critical_drugs.append(dashboard_position)

            if additional_need > 0:
                additional_position = {
                    "institution": need.institution.name,
                    "institution_inn": need.institution.inn or "",
                    "drug": get_drug_label(need.drug),
                    "year": need.year,
                    "base_yearly_need": float(base_need),
                    "additional_need": float(additional_need),
                    "additional_need_percent": round(float(additional_percent), 2),
                    "addition_count": addition_count,
                    "addition_reasons": addition_reasons_text,
                    "additional_risk_status": additional_risk_status,
                    "total_need": float(total_need),
                    "issued_qty": float(issued_total),
                    "remaining_qty": float(remaining),
                    "remaining_percent": round(float(remaining_percent), 2),
                    "status": row_status,
                }
                full_additional_need.append(additional_position)
                top_additional_need.append(additional_position)

        top_critical_drugs = sorted(
            top_critical_drugs,
            key=lambda x: x["remaining_percent"]
        )[:10]

        top_over_issued = sorted(
            top_over_issued,
            key=lambda x: (x["over_qty"], x["issued_qty"]),
            reverse=True,
        )[:10]

        full_additional_need = sorted(
            full_additional_need,
            key=lambda x: (x["additional_need_percent"], x["additional_need"]),
            reverse=True,
        )

        top_additional_need = full_additional_need[:10]

        critical_positions = warning_under_50 + low_under_30 + critical_under_20

        critical_data = [
            {"name": "<50%", "value": warning_under_50},
            {"name": "<30%", "value": low_under_30},
            {"name": "<20%", "value": critical_under_20},
            {"name": "Ортиқча берилган", "value": over_need},
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
                "over_issued_positions": over_need,
                "total_over_issued_qty": float(total_over_issued_qty),
                "total_over_issued_sum": float(total_over_issued_sum),
                "total_addition_count": total_addition_count,
                "total_additional_need_qty": float(total_additional_need_qty),
                "additional_over_50_positions": additional_over_50_positions,
                "additional_risk_positions": additional_risk_positions,
            },
            "institution_chart": institution_data,
            "critical_chart": critical_data,
            "monthly_chart": yearly_chart,
            "top_critical_drugs": top_critical_drugs,
            "top_over_issued": top_over_issued,
            "top_over_issued_drugs": top_over_issued,
            "top_additional_need": top_additional_need,
            "additional_need_rows": full_additional_need,
            "filters": {
                "years": sorted(
                    list(NeedRow.objects.values_list("year", flat=True).distinct())
                ),
                "institutions": [
                    {
                        "id": inst.id,
                        "name": inst.name,
                        "inn": inst.inn or "",
                    }
                    for inst in Institution.objects.all()
                ],
                "selected_year": selected_year,
                "selected_institution": selected_institution,
                "selected_institution_inn": clean_inn,
                "search": clean_search,
            },
        })

class NeedRowSummaryAPIView(APIView):
    permission_classes = [HasPagePermission]
    page_code = "need_rows_summary"

    def get(self, request):
        year = request.GET.get("year")
        institution = request.GET.get("institution")
        drug = request.GET.get("drug")
        institution_inn = request.GET.get("institution_inn")
        search = request.GET.get("search")

        qs = NeedRow.objects.select_related("institution", "drug").all()

        if year:
            qs = qs.filter(year=year)

        if institution:
            qs = qs.filter(institution_id=institution)

        if drug:
            qs = qs.filter(drug_id=drug)

        if institution_inn:
            qs = qs.filter(institution__inn__icontains=institution_inn.strip())

        if search:
            text = search.strip()
            qs = qs.filter(
                Q(institution__name__icontains=text)
                | Q(institution__inn__icontains=text)
                | Q(drug__name__icontains=text)
                | Q(drug__full_name__icontains=text)
                | Q(drug__mnn_name__icontains=text)
            )

        grouped_rows = qs.values(
            "year",
            "institution_id",
            "drug_id",
            institution_name=F("institution__name"),
            institution_inn=F("institution__inn"),
            drug_name=F("drug__full_name"),
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

            additional_total = get_need_addition_total(
                institution_id=row["institution_id"],
                drug_id=row["drug_id"],
                year=row["year"],
            ) or 0

            total_need = row["total_yearly_need"] + additional_total
            remaining_total = total_need - issued_total

            additional_percent = 0
            if row["total_yearly_need"] > 0:
                additional_percent = (additional_total / row["total_yearly_need"]) * 100

            total_quarterly_need = total_need / 4

            matched_price = get_latest_price(row["drug_id"], year=row["year"])
            price_value = matched_price.price if matched_price else None

            yearly_sum = (
                row["total_yearly_need"] * price_value
                if price_value is not None
                else None
            )

            additional_sum = (
                additional_total * price_value
                if price_value is not None
                else None
            )

            total_need_sum = (
                total_need * price_value
                if price_value is not None
                else None
            )

            given_sum = (
                issued_total * price_value
                if price_value is not None
                else None
            )

            remaining_sum = (
                remaining_total * price_value
                if price_value is not None
                else None
            )

            result.append({
                "year": row["year"],
                "institution_id": row["institution_id"],
                "drug_id": row["drug_id"],
                "institution_name": row["institution_name"],
                "institution_inn": row["institution_inn"] or "",
                "drug_name": row["drug_name"],
                "total_yearly_need": float(total_need),
                "base_yearly_need": float(row["total_yearly_need"]),
                "additional_need": float(additional_total),
                "additional_need_percent": round(float(additional_percent), 2),
                "total_given_dpm": float(issued_total),
                "total_remaining": float(remaining_total),
                "total_amb_rec_need": float(row["total_amb_rec_need"]),
                "total_dpm_need": float(row["total_dpm_need"]),
                "total_additional_need": float(additional_total),
                "total_need": float(total_need),
                "addition_count": get_need_addition_count(
                    row["institution_id"],
                    row["drug_id"],
                    row["year"],
                ),
                "additional_sum": float(additional_sum) if additional_sum is not None else None,
                "total_need_sum": float(total_need_sum) if total_need_sum is not None else None,
                "total_quarterly_need": round(float(total_quarterly_need), 3),
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


# --- PERFORMANCE_FAST_READS_V1 ---
# Кўп маълумотда саҳифалар қотиб қолмаслиги учун:
# NeedRows, StockSummary, NeedRowsSummary, Dashboard ҳисоблари bulk map орқали қилинади.
from collections import defaultdict
from django.db.models import Count, Max


def _perf_dec(value):
    if value is None or value == "":
        return Decimal("0")
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


def _perf_float(value, digits=3):
    value = _perf_dec(value)
    return round(float(value), digits)


def _perf_percent(part, total):
    part = _perf_dec(part)
    total = _perf_dec(total)
    if total <= 0:
        return 0
    return round(float((part / total) * Decimal("100")), 2)


def _perf_need_qs(request):
    year = request.GET.get("year")
    institution = request.GET.get("institution")
    drug = request.GET.get("drug")
    institution_inn = request.GET.get("institution_inn")
    search = request.GET.get("search")

    qs = NeedRow.objects.select_related("institution", "drug").all()

    if year:
        qs = qs.filter(year=year)

    if institution:
        qs = qs.filter(institution_id=institution)

    if drug:
        qs = qs.filter(drug_id=drug)

    if institution_inn:
        qs = qs.filter(institution__inn__icontains=institution_inn.strip())

    if search:
        text = search.strip()
        qs = qs.filter(
            Q(institution__name__icontains=text)
            | Q(institution__inn__icontains=text)
            | Q(drug__name__icontains=text)
            | Q(drug__full_name__icontains=text)
            | Q(drug__mnn_name__icontains=text)
        )

    return qs.order_by("-year", "institution__name", "drug__full_name", "drug__name", "-id")


def _perf_issue_map(needs):
    keys = [
        (row.institution_id, row.drug_id, row.year)
        for row in needs
    ]

    if not keys:
        return {}

    institution_ids = {key[0] for key in keys}
    drug_ids = {key[1] for key in keys}
    years = {key[2] for key in keys}

    qs = (
        MonthlyIssue.objects
        .filter(
            institution_id__in=institution_ids,
            drug_id__in=drug_ids,
            year__in=years,
        )
        .values("institution_id", "drug_id", "year")
        .annotate(total=Coalesce(Sum("issued_qty"), dec_zero_3()))
    )

    return {
        (row["institution_id"], row["drug_id"], row["year"]): row["total"] or Decimal("0")
        for row in qs
    }


def _perf_addition_map(needs):
    need_ids = [row.id for row in needs]

    if not need_ids:
        return {}

    qs = (
        NeedAddition.objects
        .filter(need_row_id__in=need_ids, is_active=True)
        .values("need_row_id")
        .annotate(
            dpm=Coalesce(Sum("dpm_need_add"), dec_zero_3()),
            amb=Coalesce(Sum("amb_rec_need_add"), dec_zero_3()),
            total=Coalesce(Sum("total_additional_need"), dec_zero_3()),
            count=Count("id"),
            last_date=Max("addition_date"),
        )
    )

    data = {}
    for row in qs:
        data[row["need_row_id"]] = {
            "dpm": row["dpm"] or Decimal("0"),
            "amb": row["amb"] or Decimal("0"),
            "total": row["total"] or Decimal("0"),
            "count": row["count"] or 0,
            "last_date": row["last_date"],
        }

    return data


def _perf_reason_map(needs):
    need_ids = [row.id for row in needs]

    if not need_ids:
        return {}

    result = defaultdict(list)

    qs = (
        NeedAddition.objects
        .filter(need_row_id__in=need_ids, is_active=True)
        .exclude(reason__isnull=True)
        .exclude(reason="")
        .values("need_row_id", "reason")
        .distinct()
    )

    for row in qs:
        if len(result[row["need_row_id"]]) < 3:
            result[row["need_row_id"]].append(row["reason"])

    return result


def _perf_price_lists(needs):
    drug_ids = {row.drug_id for row in needs}

    if not drug_ids:
        return {}

    grouped = defaultdict(list)

    for price in (
        Price.objects
        .filter(drug_id__in=drug_ids, is_active=True)
        .order_by("drug_id", "start_date", "id")
    ):
        grouped[price.drug_id].append(price)

    return grouped


def _perf_latest_price(price_lists, drug_id, year):
    try:
        end_date = date(int(year), 12, 31)
    except Exception:
        return None

    matched = None
    for price in price_lists.get(drug_id, []):
        if price.start_date <= end_date:
            matched = price
        else:
            break

    return matched.price if matched else None


def _perf_addition_status(base_need, additional_need):
    base_need = _perf_dec(base_need)
    additional_need = _perf_dec(additional_need)

    if additional_need <= 0:
        return "Қўшимча йўқ"

    if base_need <= 0:
        return "Йил ўртасида қўшилган"

    percent = (additional_need / base_need) * Decimal("100")

    if percent >= 50:
        return "Критик"
    if percent >= 30:
        return "Юқори хавф"
    if percent >= 15:
        return "Огоҳлантириш"
    if percent >= 10:
        return "Тушунарли"
    return "Норма"


def _perf_build_need_rows(request):
    needs = list(_perf_need_qs(request))
    issue_map = _perf_issue_map(needs)
    addition_map = _perf_addition_map(needs)
    price_lists = _perf_price_lists(needs)

    rows = []

    for need in needs:
        key = (need.institution_id, need.drug_id, need.year)

        issued = _perf_dec(issue_map.get(key))
        add = addition_map.get(
            need.id,
            {
                "dpm": Decimal("0"),
                "amb": Decimal("0"),
                "total": Decimal("0"),
                "count": 0,
                "last_date": None,
            },
        )

        base_need = _perf_dec(need.yearly_need)
        additional_need = _perf_dec(add["total"])
        total_need = base_need + additional_need
        remaining = total_need - issued

        price = _perf_latest_price(price_lists, need.drug_id, need.year)

        yearly_sum = None
        additional_sum = None
        total_need_sum = None
        given_sum = None
        remaining_sum = None

        if price is not None:
            price_dec = _perf_dec(price)
            yearly_sum = base_need * price_dec
            additional_sum = additional_need * price_dec
            total_need_sum = total_need * price_dec
            given_sum = issued * price_dec
            remaining_sum = remaining * price_dec

        row = {
            "id": need.id,

            "institution": need.institution_id,
            "institution_id": need.institution_id,
            "institution_name": need.institution.name,
            "institution_inn": need.institution.inn or "",

            "drug": need.drug_id,
            "drug_id": need.drug_id,
            "drug_name": get_drug_label(need.drug),

            "year": need.year,

            "dpm_need": _perf_float(need.dpm_need),
            "amb_rec_need": _perf_float(need.amb_rec_need),
            "yearly_need": _perf_float(base_need),
            "base_yearly_need": _perf_float(base_need),
            "quarterly_need": _perf_float(need.quarterly_need),

            "given_dpm": _perf_float(issued),
            "issued_qty": _perf_float(issued),

            "additional_dpm_need": _perf_float(add["dpm"]),
            "additional_amb_rec_need": _perf_float(add["amb"]),
            "additional_yearly_need": _perf_float(additional_need),
            "additional_need": _perf_float(additional_need),
            "total_yearly_need": _perf_float(total_need),
            "total_need": _perf_float(total_need),
            "total_quarterly_need": _perf_float(total_need / Decimal("4")),

            "remaining": _perf_float(remaining),
            "remaining_qty": _perf_float(remaining),
            "remaining_percent": _perf_percent(remaining, total_need),

            "additional_percent": _perf_percent(additional_need, base_need),
            "additional_need_percent": _perf_percent(additional_need, base_need),
            "additional_count": add["count"],
            "addition_count": add["count"],
            "last_additional_date": add["last_date"],

            "additional_risk_status": _perf_addition_status(base_need, additional_need),

            "price": float(price) if price is not None else None,
            "yearly_sum": float(yearly_sum) if yearly_sum is not None else None,
            "additional_sum": float(additional_sum) if additional_sum is not None else None,
            "total_need_sum": float(total_need_sum) if total_need_sum is not None else None,
            "given_sum": float(given_sum) if given_sum is not None else None,
            "remaining_sum": float(remaining_sum) if remaining_sum is not None else None,
        }

        rows.append(row)

    return rows


def _perf_need_rows_get(self, request, *args, **kwargs):
    return Response(_perf_build_need_rows(request))


def _perf_stock_summary_get(self, request):
    rows = []

    for row in _perf_build_need_rows(request):
        total_need = _perf_dec(row.get("total_need"))
        issued = _perf_dec(row.get("issued_qty"))
        remaining_percent = row.get("remaining_percent") or 0

        rows.append({
            "institution_id": row["institution_id"],
            "institution_name": row["institution_name"],
            "institution_inn": row["institution_inn"],
            "drug_id": row["drug_id"],
            "drug_name": row["drug_name"],
            "year": row["year"],

            "yearly_need": row["base_yearly_need"],
            "additional_need": row["additional_need"],
            "total_need": row["total_need"],
            "addition_count": row["addition_count"],

            "issued_qty": row["issued_qty"],
            "remaining_qty": row["remaining_qty"],
            "remaining_percent": row["remaining_percent"],
            "status": get_status(total_need, issued, remaining_percent),

            "price": row["price"],
            "current_price": row["price"],
            "referent_price": row["price"],
            "yearly_sum": row["total_need_sum"],
            "total_sum": row["total_need_sum"],
            "need_sum": row["total_need_sum"],
            "total_need_sum": row["total_need_sum"],
            "yearly_need_sum": row["total_need_sum"],
            "given_sum": row["given_sum"],
            "issued_sum": row["given_sum"],
            "remaining_sum": row["remaining_sum"],
        })

    return Response(rows)


def _perf_need_summary_get(self, request):
    rows = []

    for row in _perf_build_need_rows(request):
        rows.append({
            "year": row["year"],
            "institution_id": row["institution_id"],
            "drug_id": row["drug_id"],
            "institution_name": row["institution_name"],
            "institution_inn": row["institution_inn"],
            "drug_name": row["drug_name"],

            "total_yearly_need": row["total_need"],
            "base_yearly_need": row["base_yearly_need"],
            "additional_need": row["additional_need"],
            "additional_need_percent": row["additional_need_percent"],
            "total_given_dpm": row["issued_qty"],
            "total_remaining": row["remaining_qty"],

            "total_amb_rec_need": row["amb_rec_need"],
            "total_dpm_need": row["dpm_need"],
            "total_additional_need": row["additional_need"],
            "total_need": row["total_need"],
            "addition_count": row["addition_count"],
            "total_quarterly_need": row["total_quarterly_need"],

            "price": row["price"],
            "yearly_sum": row["yearly_sum"],
            "additional_sum": row["additional_sum"],
            "total_need_sum": row["total_need_sum"],
            "given_sum": row["given_sum"],
            "remaining_sum": row["remaining_sum"],
        })

    return Response(rows)


def _perf_dashboard_get(self, request):
    rows = _perf_build_need_rows(request)

    total_need_qty = sum(_perf_dec(row["total_need"]) for row in rows)
    total_issued_qty = sum(_perf_dec(row["issued_qty"]) for row in rows)
    total_remaining_qty = sum(_perf_dec(row["remaining_qty"]) for row in rows)

    total_need_sum = sum(
        _perf_dec(row["total_need_sum"])
        for row in rows
        if row.get("total_need_sum") is not None
    )
    total_issued_sum = sum(
        _perf_dec(row["given_sum"])
        for row in rows
        if row.get("given_sum") is not None
    )
    total_remaining_sum = sum(
        _perf_dec(row["remaining_sum"])
        for row in rows
        if row.get("remaining_sum") is not None
    )

    warning_under_50 = 0
    low_under_30 = 0
    critical_under_20 = 0
    over_need = 0
    total_over_issued_qty = Decimal("0")
    total_over_issued_sum = Decimal("0")

    institution_map = {}

    top_critical_drugs = []
    all_risk_ranked_positions = []
    top_over_issued = []
    full_over_issued = []
    top_additional_need = []
    full_additional_need = []

    for row in rows:
        inst_id = row["institution_id"]
        if inst_id not in institution_map:
            institution_map[inst_id] = {
                "id": inst_id,
                "name": row["institution_name"],
                "inn": row["institution_inn"],
                "yearly_need": 0,
                "issued": 0,
                "remaining": 0,
            }

        institution_map[inst_id]["yearly_need"] += row["total_need"]
        institution_map[inst_id]["issued"] += row["issued_qty"]
        institution_map[inst_id]["remaining"] += row["remaining_qty"]

        total_need_dec = _perf_dec(row["total_need"])
        issued_dec = _perf_dec(row["issued_qty"])
        remaining_percent = row.get("remaining_percent") or 0
        status_text = get_status(total_need_dec, issued_dec, remaining_percent)

        over_qty = issued_dec - total_need_dec

        base_position = {
            "institution": row["institution_name"],
            "institution_inn": row["institution_inn"],
            "drug": row["drug_name"],
            "year": row["year"],
            "yearly_need": row["total_need"],
            "base_yearly_need": row["base_yearly_need"],
            "additional_need": row["additional_need"],
            "additional_need_percent": row["additional_need_percent"],
            "additional_risk_status": row["additional_risk_status"],
            "addition_count": row["addition_count"],
            "total_need": row["total_need"],
            "issued_qty": row["issued_qty"],
            "remaining_qty": row["remaining_qty"],
            "remaining_percent": row["remaining_percent"],
            "status": status_text,
            "price": row.get("price"),
            "total_need_sum": row.get("total_need_sum"),
            "given_sum": row.get("given_sum"),
            "remaining_sum": row.get("remaining_sum"),
        }

        all_risk_ranked_positions.append(base_position)

        if status_text == "Ортиқча берилган":
            over_need += 1
            if over_qty > 0:
                total_over_issued_qty += over_qty
                if row.get("price") is not None:
                    total_over_issued_sum += over_qty * _perf_dec(row.get("price"))

            over_position = {
                **base_position,
                "over_qty": _perf_float(over_qty),
                "over_percent": _perf_percent(over_qty, total_need_dec),
                "over_sum": (
                    _perf_float(over_qty * _perf_dec(row.get("price")))
                    if row.get("price") is not None
                    else None
                ),
            }
            full_over_issued.append(over_position)
            top_over_issued.append(over_position)
        else:
            if status_text == "Критик":
                critical_under_20 += 1
            elif status_text == "Паст":
                low_under_30 += 1
            elif status_text == "Огоҳлантириш":
                warning_under_50 += 1

            if status_text in {"Критик", "Паст", "Огоҳлантириш"}:
                top_critical_drugs.append(base_position)

        if _perf_dec(row["additional_need"]) > 0:
            additional_position = {
                "institution": row["institution_name"],
                "institution_inn": row["institution_inn"],
                "drug": row["drug_name"],
                "year": row["year"],
                "base_yearly_need": row["base_yearly_need"],
                "additional_need": row["additional_need"],
                "additional_need_percent": row["additional_need_percent"],
                "addition_count": row["addition_count"],
                "addition_reasons": "—",
                "additional_risk_status": row["additional_risk_status"],
                "total_need": row["total_need"],
                "issued_qty": row["issued_qty"],
                "remaining_qty": row["remaining_qty"],
                "remaining_percent": row["remaining_percent"],
                "status": status_text,
            }
            full_additional_need.append(additional_position)
            top_additional_need.append(additional_position)

    institution_chart = list(institution_map.values())

    top_critical_drugs = sorted(
        top_critical_drugs,
        key=lambda item: (item["remaining_percent"], -_perf_dec(item["total_need"])),
    )[:10]

    # Dashboard UI ва filter smoke-test учун рўйхат бутунлай бўш қолмасин:
    # агар танланган фильтрда критик/паст/огоҳлантириш йўқ бўлса,
    # энг паст қолдиқ фоизига эга позициялар қайтарилади.
    # Бу "top critical" блокини normal ҳолатда ҳам маълумотли қилади.
    if not top_critical_drugs:
        top_critical_drugs = sorted(
            all_risk_ranked_positions,
            key=lambda item: (item["remaining_percent"], -_perf_dec(item["total_need"])),
        )[:10]

    full_over_issued = sorted(
        full_over_issued,
        key=lambda item: (_perf_dec(item["over_qty"]), _perf_dec(item["issued_qty"])),
        reverse=True,
    )

    top_over_issued = full_over_issued[:10]

    full_additional_need = sorted(
        full_additional_need,
        key=lambda item: (item["additional_need_percent"], item["additional_need"]),
        reverse=True,
    )

    top_additional_need = full_additional_need[:10]

    additional_over_50_positions = sum(
        1 for row in rows if (row.get("additional_need_percent") or 0) >= 50
    )
    additional_risk_positions = sum(
        1 for row in rows if (row.get("additional_need_percent") or 0) >= 30
    )

    years = sorted(
        list(NeedRow.objects.values_list("year", flat=True).distinct())
    )

    return Response({
        "cards": {
            "institutions": len({row["institution_id"] for row in rows}),
            "drugs": len({row["drug_id"] for row in rows}),
            "need_rows": len(rows),
            "issued_rows": sum(1 for row in rows if _perf_dec(row["issued_qty"]) > 0),

            "total_need_qty": float(total_need_qty),
            "total_issued_qty": float(total_issued_qty),
            "total_remaining_qty": float(total_remaining_qty),

            "total_need_sum": float(total_need_sum),
            "total_issued_sum": float(total_issued_sum),
            "total_remaining_sum": float(total_remaining_sum),

            "critical_positions": warning_under_50 + low_under_30 + critical_under_20,
            "over_need": over_need,
            "over_issued_positions": over_need,
            "total_over_issued_qty": float(total_over_issued_qty),
            "total_over_issued_sum": float(total_over_issued_sum),

            "total_addition_count": sum(row.get("addition_count") or 0 for row in rows),
            "total_additional_need_qty": float(sum(_perf_dec(row["additional_need"]) for row in rows)),
            "additional_over_50_positions": additional_over_50_positions,
            "additional_risk_positions": additional_risk_positions,
        },
        "institution_chart": institution_chart,
        "critical_chart": [
            {"name": "<50%", "value": warning_under_50},
            {"name": "<30%", "value": low_under_30},
            {"name": "<20%", "value": critical_under_20},
            {"name": "Ортиқча берилган", "value": over_need},
        ],
        "monthly_chart": [],
        "top_critical_drugs": top_critical_drugs,
        "top_over_issued": top_over_issued,
        "top_over_issued_drugs": top_over_issued,
        "over_issued_rows": full_over_issued,
        "all_over_issued": full_over_issued,
        "top_additional_need": top_additional_need,
        "additional_need_rows": full_additional_need,
        "filters": {
            "years": years,
            "institutions": [
                {
                    "id": inst.id,
                    "name": inst.name,
                    "inn": inst.inn or "",
                }
                for inst in Institution.objects.all()
            ],
            "selected_year": request.GET.get("year"),
            "selected_institution": request.GET.get("institution"),
            "selected_institution_inn": request.GET.get("institution_inn") or "",
            "search": request.GET.get("search") or "",
        },
    })


NeedRowListCreateAPIView.get = _perf_need_rows_get
StockSummaryAPIView.get = _perf_stock_summary_get
NeedRowSummaryAPIView.get = _perf_need_summary_get
DashboardSummaryAPIView.get = _perf_dashboard_get
# --- /PERFORMANCE_FAST_READS_V1 ---


# --- FAST_BULK_DELETE_ENDPOINTS_V3 ---
# 1 та POST request билан кўп қатор ўчириш/бекор қилиш.
# Frontend 500-1500 та DELETE request юбормайди.

def _parse_bulk_ids(request):
    raw = (
        request.data.get("ids")
        or request.data.get("id_list")
        or request.data.get("selected_ids")
        or request.data.get("need_row_ids")
        or request.data.get("monthly_issue_ids")
        or request.data.get("addition_ids")
        or []
    )

    if isinstance(raw, str):
        raw = [
            x.strip()
            for x in raw.replace(";", ",").split(",")
            if x.strip()
        ]

    ids = []
    seen = set()

    for value in raw:
        try:
            number = int(value)
        except (TypeError, ValueError):
            continue

        if number > 0 and number not in seen:
            seen.add(number)
            ids.append(number)

    return ids


def _ids_sample(ids, limit=200):
    return list(ids or [])[:limit]


class MonthlyIssueBulkDeleteAPIView(APIView):
    permission_classes = [HasPagePermission]
    page_code = "monthly_issues"
    required_permission = "delete"

    def post(self, request):
        ids = _parse_bulk_ids(request)

        if not ids:
            return Response(
                {
                    "detail": "Ўчириш учун ID рўйхати юборилмади.",
                    "deleted": 0,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            qs = MonthlyIssue.objects.filter(id__in=ids)
            existing_ids = list(qs.values_list("id", flat=True))
            deleted_count, _deleted_by_model = qs.delete()

            write_audit_log(
                actor=request.user,
                action="delete",
                target_type="Берилган миқдор",
                description="Берилган миқдор bulk усулда ўчирилди.",
                extra_data={
                    "requested": len(ids),
                    "deleted": int(deleted_count),
                    "missing": len(ids) - len(existing_ids),
                    "ids_sample": _ids_sample(existing_ids),
                },
            )

        return Response({
            "requested": len(ids),
            "deleted": int(deleted_count),
            "missing": len(ids) - len(existing_ids),
            "detail": f"{int(deleted_count)} та берилган миқдор ёзуви ўчирилди.",
        })


class NeedRowBulkDeleteAPIView(APIView):
    permission_classes = [HasPagePermission]
    page_code = "need_rows"
    required_permission = "delete"

    def post(self, request):
        from django.db.models import Exists, OuterRef

        ids = _parse_bulk_ids(request)

        if not ids:
            return Response(
                {
                    "detail": "Ўчириш учун ID рўйхати юборилмади.",
                    "deleted": 0,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        issue_exists = MonthlyIssue.objects.filter(
            institution_id=OuterRef("institution_id"),
            drug_id=OuterRef("drug_id"),
            year=OuterRef("year"),
        )

        addition_exists = NeedAddition.objects.filter(
            institution_id=OuterRef("institution_id"),
            drug_id=OuterRef("drug_id"),
            year=OuterRef("year"),
        )

        marked = (
            NeedRow.objects
            .filter(id__in=ids)
            .annotate(
                has_issue=Exists(issue_exists),
                has_addition=Exists(addition_exists),
            )
        )

        existing_ids = list(marked.values_list("id", flat=True))

        protected_ids = list(
            marked
            .filter(Q(has_issue=True) | Q(has_addition=True))
            .values_list("id", flat=True)
        )

        deletable_ids = list(
            marked
            .filter(has_issue=False, has_addition=False)
            .values_list("id", flat=True)
        )

        with transaction.atomic():
            deleted_count, _deleted_by_model = (
                NeedRow.objects
                .filter(id__in=deletable_ids)
                .delete()
            )

            write_audit_log(
                actor=request.user,
                action="delete",
                target_type="Эҳтиёж",
                description="Эҳтиёж қаторлари bulk усулда ўчирилди.",
                extra_data={
                    "requested": len(ids),
                    "deleted": int(deleted_count),
                    "protected": len(protected_ids),
                    "missing": len(ids) - len(existing_ids),
                    "deleted_ids_sample": _ids_sample(deletable_ids),
                    "protected_ids_sample": _ids_sample(protected_ids),
                },
            )

        return Response({
            "requested": len(ids),
            "deleted": int(deleted_count),
            "protected": len(protected_ids),
            "missing": len(ids) - len(existing_ids),
            "protected_ids": protected_ids[:200],
            "detail": (
                f"{int(deleted_count)} та эҳтиёж қатори ўчирилди. "
                f"{len(protected_ids)} та қатор берилган миқдор ёки қўшимча эҳтиёж боғлангани учун ўтказиб юборилди."
            ),
        })


class NeedAdditionBulkDeleteAPIView(APIView):
    permission_classes = [HasPagePermission]
    page_code = "need_rows"
    required_permission = "delete"

    def post(self, request):
        from django.db.models import Sum

        ids = _parse_bulk_ids(request)

        if not ids:
            return Response(
                {
                    "detail": "Ўчириш учун ID рўйхати юборилмади.",
                    "cancelled": 0,
                    "deleted": 0,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        cancel_reason = (
            request.data.get("cancel_reason")
            or request.data.get("reason")
            or "Bulk delete орқали бекор қилинди."
        )

        all_qs = NeedAddition.objects.filter(id__in=ids)
        existing_ids = list(all_qs.values_list("id", flat=True))

        inactive_ids = list(
            all_qs
            .filter(is_active=False)
            .values_list("id", flat=True)
        )

        active_qs = (
            all_qs
            .filter(is_active=True)
            .select_related("need_row", "institution", "drug")
        )

        active_ids = list(active_qs.values_list("id", flat=True))
        blocked_ids = set()

        grouped = (
            active_qs
            .values("need_row_id", "institution_id", "drug_id", "year")
            .annotate(
                remove_total=Coalesce(Sum("total_additional_need"), dec_zero_3())
            )
        )

        for group in grouped:
            need = None

            if group.get("need_row_id"):
                need = NeedRow.objects.filter(id=group["need_row_id"]).first()

            if need is None:
                need = NeedRow.objects.filter(
                    institution_id=group["institution_id"],
                    drug_id=group["drug_id"],
                    year=group["year"],
                ).first()

            if need is None:
                bad_ids = active_qs.filter(
                    institution_id=group["institution_id"],
                    drug_id=group["drug_id"],
                    year=group["year"],
                ).values_list("id", flat=True)
                blocked_ids.update(bad_ids)
                continue

            current_additional = get_need_addition_total(
                institution_id=group["institution_id"],
                drug_id=group["drug_id"],
                year=group["year"],
                active_only=True,
            ) or 0

            remove_total = group["remove_total"] or 0

            projected_total_need = (
                (need.yearly_need or 0)
                + current_additional
                - remove_total
            )

            issued_total = get_issued_total(
                institution_id=group["institution_id"],
                drug_id=group["drug_id"],
                year=group["year"],
            ) or 0

            if issued_total > projected_total_need:
                bad_ids = active_qs.filter(
                    institution_id=group["institution_id"],
                    drug_id=group["drug_id"],
                    year=group["year"],
                ).values_list("id", flat=True)
                blocked_ids.update(bad_ids)

        active_allowed_ids = [
            x for x in active_ids
            if x not in blocked_ids
        ]

        with transaction.atomic():
            cancelled_count = 0

            if active_allowed_ids:
                cancelled_count = (
                    NeedAddition.objects
                    .filter(id__in=active_allowed_ids)
                    .update(
                        is_active=False,
                        cancel_reason=cancel_reason,
                    )
                )

            deleted_count = 0

            if inactive_ids:
                deleted_count, _deleted_by_model = (
                    NeedAddition.objects
                    .filter(id__in=inactive_ids)
                    .delete()
                )

            write_audit_log(
                actor=request.user,
                action="delete",
                target_type="Қўшимча эҳтиёж",
                description="Қўшимча эҳтиёжлар bulk усулда бекор/ўчирилди.",
                extra_data={
                    "requested": len(ids),
                    "active_cancelled": int(cancelled_count),
                    "inactive_deleted": int(deleted_count),
                    "blocked": len(blocked_ids),
                    "missing": len(ids) - len(existing_ids),
                    "cancelled_ids_sample": _ids_sample(active_allowed_ids),
                    "deleted_ids_sample": _ids_sample(inactive_ids),
                    "blocked_ids_sample": _ids_sample(blocked_ids),
                },
            )

        return Response({
            "requested": len(ids),
            "cancelled": int(cancelled_count),
            "deleted": int(deleted_count),
            "blocked": len(blocked_ids),
            "missing": len(ids) - len(existing_ids),
            "blocked_ids": sorted(blocked_ids)[:200],
            "detail": (
                f"{int(cancelled_count)} та фаол қўшимча эҳтиёж бекор қилинди, "
                f"{int(deleted_count)} та бекор қилинган тарихдан ўчирилди. "
                f"{len(blocked_ids)} та ёзув берилган миқдор сабабли блокланди."
            ),
        })
# --- /FAST_BULK_DELETE_ENDPOINTS_V3 ---



# --- PROFESSIONAL TRADE / REFERENCE PRICE API 2026-05-26 ---
from .models import Supplier, TradeBranch, ReferencePrice, StockBatch
from .serializers import SupplierSerializer, TradeBranchSerializer, ReferencePriceSerializer, StockBatchSerializer


class SupplierListCreateAPIView(generics.ListCreateAPIView):
    permission_classes = [HasPagePermission]
    page_code = "prices"
    serializer_class = SupplierSerializer

    def get_queryset(self):
        qs = Supplier.objects.all()
        search = self.request.GET.get("search")
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(inn__icontains=search) | Q(license_no__icontains=search))
        active = self.request.GET.get("is_active")
        if active in ("true", "false"):
            qs = qs.filter(is_active=(active == "true"))
        return qs

    def perform_create(self, serializer):
        obj = serializer.save()
        write_audit_log(self.request.user, "create", target=obj, target_type="Таъминотчи", description="Таъминотчи қўшилди.")


class SupplierDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [HasPagePermission]
    page_code = "prices"
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer

    def perform_update(self, serializer):
        obj = serializer.save()
        write_audit_log(self.request.user, "update", target=obj, target_type="Таъминотчи", description="Таъминотчи таҳрирланди.")

    def perform_destroy(self, instance):
        write_audit_log(self.request.user, "delete", target=instance, target_type="Таъминотчи", description="Таъминотчи ўчирилди.")
        instance.delete()


class TradeBranchListCreateAPIView(generics.ListCreateAPIView):
    permission_classes = [HasPagePermission]
    page_code = "stock_summary"
    serializer_class = TradeBranchSerializer

    def get_queryset(self):
        qs = TradeBranch.objects.all()
        branch_type = self.request.GET.get("branch_type")
        if branch_type:
            qs = qs.filter(branch_type=branch_type)
        search = self.request.GET.get("search")
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(address__icontains=search))
        active = self.request.GET.get("is_active")
        if active in ("true", "false"):
            qs = qs.filter(is_active=(active == "true"))
        return qs

    def perform_create(self, serializer):
        obj = serializer.save()
        write_audit_log(self.request.user, "create", target=obj, target_type="Омбор/филиал", description="Омбор/филиал қўшилди.")


class TradeBranchDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [HasPagePermission]
    page_code = "stock_summary"
    queryset = TradeBranch.objects.all()
    serializer_class = TradeBranchSerializer

    def perform_update(self, serializer):
        obj = serializer.save()
        write_audit_log(self.request.user, "update", target=obj, target_type="Омбор/филиал", description="Омбор/филиал таҳрирланди.")

    def perform_destroy(self, instance):
        write_audit_log(self.request.user, "delete", target=instance, target_type="Омбор/филиал", description="Омбор/филиал ўчирилди.")
        instance.delete()


class ReferencePriceListCreateAPIView(generics.ListCreateAPIView):
    permission_classes = [HasPagePermission]
    page_code = "prices"
    serializer_class = ReferencePriceSerializer

    def get_queryset(self):
        qs = ReferencePrice.objects.select_related("drug")
        drug = self.request.GET.get("drug")
        price_type = self.request.GET.get("price_type")
        is_limited = self.request.GET.get("is_limited")
        active = self.request.GET.get("is_active")
        search = self.request.GET.get("search")
        if drug:
            qs = qs.filter(drug_id=drug)
        if price_type:
            qs = qs.filter(price_type=price_type)
        if is_limited in ("true", "false"):
            qs = qs.filter(is_limited=(is_limited == "true"))
        if active in ("true", "false"):
            qs = qs.filter(is_active=(active == "true"))
        if search:
            qs = qs.filter(Q(drug__name__icontains=search) | Q(drug__full_name__icontains=search) | Q(source_doc__icontains=search))
        return qs

    def perform_create(self, serializer):
        obj = serializer.save()
        write_audit_log(self.request.user, "create", target=obj, target_type="Референт нарх", description="Референт нарх қўшилди.")


class ReferencePriceDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [HasPagePermission]
    page_code = "prices"
    queryset = ReferencePrice.objects.select_related("drug")
    serializer_class = ReferencePriceSerializer

    def perform_update(self, serializer):
        obj = serializer.save()
        write_audit_log(self.request.user, "update", target=obj, target_type="Референт нарх", description="Референт нарх таҳрирланди.")

    def perform_destroy(self, instance):
        write_audit_log(self.request.user, "delete", target=instance, target_type="Референт нарх", description="Референт нарх ўчирилди.")
        instance.delete()


class StockBatchListCreateAPIView(generics.ListCreateAPIView):
    permission_classes = [HasPagePermission]
    page_code = "stock_summary"
    serializer_class = StockBatchSerializer

    def get_queryset(self):
        qs = StockBatch.objects.select_related("branch", "drug", "supplier")
        for param, field in [
            ("branch", "branch_id"),
            ("drug", "drug_id"),
            ("supplier", "supplier_id"),
        ]:
            value = self.request.GET.get(param)
            if value:
                qs = qs.filter(**{field: value})
        branch_type = self.request.GET.get("branch_type")
        if branch_type:
            qs = qs.filter(branch__branch_type=branch_type)
        for param in ["is_quarantine", "is_recalled"]:
            value = self.request.GET.get(param)
            if value in ("true", "false"):
                qs = qs.filter(**{param: value == "true"})
        search = self.request.GET.get("search")
        if search:
            qs = qs.filter(
                Q(drug__name__icontains=search) |
                Q(drug__full_name__icontains=search) |
                Q(series__icontains=search) |
                Q(supplier__name__icontains=search)
            )
        return qs

    def perform_create(self, serializer):
        obj = serializer.save()
        write_audit_log(self.request.user, "create", target=obj, target_type="Омбор қолдиғи", description="Серия қолдиғи қўшилди.")


class StockBatchDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [HasPagePermission]
    page_code = "stock_summary"
    queryset = StockBatch.objects.select_related("branch", "drug", "supplier")
    serializer_class = StockBatchSerializer

    def perform_update(self, serializer):
        obj = serializer.save()
        write_audit_log(self.request.user, "update", target=obj, target_type="Омбор қолдиғи", description="Серия қолдиғи таҳрирланди.")

    def perform_destroy(self, instance):
        write_audit_log(self.request.user, "delete", target=instance, target_type="Омбор қолдиғи", description="Серия қолдиғи ўчирилди.")
        instance.delete()
# --- /PROFESSIONAL TRADE / REFERENCE PRICE API 2026-05-26 ---
