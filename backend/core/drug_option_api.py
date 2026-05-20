import re

from rest_framework import serializers, viewsets, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from .models import DrugOption, PagePermission, UserPagePermissionOverride


def normalize_key(value):
    text = str(value or "").strip().casefold()
    text = text.replace("ё", "е")
    text = text.replace("'", "").replace("’", "").replace("`", "")
    text = re.sub(r"[\s\-_]+", "", text)
    return text


def split_aliases(value):
    raw = str(value or "").replace(";", ",").replace("\n", ",")
    return [x.strip() for x in raw.split(",") if x.strip()]


def user_can_manage_access(user):
    if not user or not user.is_authenticated:
        return False

    if user.is_superuser:
        return True

    override = UserPagePermissionOverride.objects.filter(
        user=user,
        page_code="access_management",
    ).first()

    if override and override.can_manage_access is not None:
        return bool(override.can_manage_access)

    try:
        role = user.profile.role
    except Exception:
        role = None

    if not role:
        return False

    permission = PagePermission.objects.filter(
        role=role,
        page_code="access_management",
    ).first()

    return bool(permission and permission.can_manage_access)


class DrugOptionSerializer(serializers.ModelSerializer):
    kind_display = serializers.CharField(source="get_kind_display", read_only=True)
    aliases_list = serializers.SerializerMethodField()

    class Meta:
        model = DrugOption
        fields = [
            "id",
            "kind",
            "kind_display",
            "name",
            "aliases",
            "aliases_list",
            "is_active",
            "sort_order",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "kind_display", "aliases_list", "created_at", "updated_at"]

    def get_aliases_list(self, obj):
        return obj.alias_list()

    def validate(self, attrs):
        kind = attrs.get("kind") or getattr(self.instance, "kind", None)
        name = str(attrs.get("name", getattr(self.instance, "name", "")) or "").strip()
        aliases = attrs.get("aliases", getattr(self.instance, "aliases", "")) or ""

        if not kind:
            raise serializers.ValidationError({"kind": "Справочник тури танланиши керак."})

        if not name:
            raise serializers.ValidationError({"name": "Тўғри вариант номи киритилиши керак."})

        alias_list = split_aliases(aliases)
        candidate_keys = {normalize_key(name)}
        candidate_keys.update(normalize_key(x) for x in alias_list)
        candidate_keys.discard("")

        qs = DrugOption.objects.filter(kind=kind, is_active=True)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)

        for option in qs:
            existing_keys = {normalize_key(option.name)}
            existing_keys.update(normalize_key(x) for x in split_aliases(option.aliases))
            existing_keys.discard("")

            if candidate_keys & existing_keys:
                raise serializers.ValidationError({
                    "aliases": (
                        f"Бу ном ёки alias бошқа справочник қиймати билан такрор: "
                        f"{option.name}. Аввал мавжуд қийматни таҳрирланг."
                    )
                })

        attrs["name"] = name
        attrs["aliases"] = "; ".join(alias_list)
        return attrs


class DrugOptionViewSet(viewsets.ModelViewSet):
    serializer_class = DrugOptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = DrugOption.objects.all().order_by("kind", "sort_order", "name")

        kind = self.request.query_params.get("kind")
        if kind:
            qs = qs.filter(kind=kind)

        q = (self.request.query_params.get("q") or "").strip()
        if q:
            qs = qs.filter(name__icontains=q) | qs.filter(aliases__icontains=q)

        include_inactive = self.request.query_params.get("include_inactive") in ["1", "true", "yes"]
        if include_inactive and user_can_manage_access(self.request.user):
            return qs

        return qs.filter(is_active=True)

    def require_manage_access(self):
        if not user_can_manage_access(self.request.user):
            raise PermissionDenied("Бу справочникни ўзгартириш учун manage_access ҳуқуқи керак.")

    def create(self, request, *args, **kwargs):
        self.require_manage_access()
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        self.require_manage_access()
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        self.require_manage_access()
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        self.require_manage_access()
        instance = self.get_object()
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])
        return Response({"detail": "Справочник қиймати нофаол қилинди."}, status=status.HTTP_200_OK)
