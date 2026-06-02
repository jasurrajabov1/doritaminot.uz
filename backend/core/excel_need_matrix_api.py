# coding: utf-8
import json

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .excel_need_matrix_import import process_need_matrix_import
from .permissions import resolve_user_page_permissions


def _truthy(value):
    return str(value or "").strip().lower() in {"1", "true", "yes", "ha", "ҳа", "ха", "on"}


def _parse_selected_row_keys(request):
    raw_values = []

    try:
        raw_values.extend(request.data.getlist("selected_row_keys"))
    except AttributeError:
        raw = request.data.get("selected_row_keys")
        if raw is not None:
            raw_values.append(raw)

    raw = request.data.get("selected_keys") or request.query_params.get("selected_row_keys")
    if raw is not None:
        raw_values.append(raw)

    selected = []

    for raw_value in raw_values:
        if raw_value is None or raw_value == "":
            continue

        if isinstance(raw_value, (list, tuple)):
            selected.extend(str(item) for item in raw_value if str(item).strip())
            continue

        text = str(raw_value).strip()
        if not text:
            continue

        try:
            decoded = json.loads(text)
        except Exception:
            decoded = None

        if isinstance(decoded, list):
            selected.extend(str(item) for item in decoded if str(item).strip())
        elif decoded is not None:
            selected.append(str(decoded))
        else:
            selected.extend(part.strip() for part in text.split("\n") if part.strip())

    # keep order and remove duplicates
    seen = set()
    result = []
    for item in selected:
        if item not in seen:
            seen.add(item)
            result.append(item)
    return result


class ExcelNeedMatrixImportAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        permissions = resolve_user_page_permissions(request.user)
        need_rows_permissions = permissions.get("need_rows", {})
        monthly_permissions = permissions.get("monthly_issues", {})
        excel_permissions = permissions.get("excel_import", {})

        can_import = (
            request.user.is_superuser
            or need_rows_permissions.get("add")
            or monthly_permissions.get("add")
            or excel_permissions.get("add")
        )

        if not can_import:
            return Response(
                {"detail": "Дори + эҳтиёж Excel import учун add ҳуқуқи керак."},
                status=status.HTTP_403_FORBIDDEN,
            )

        uploaded_file = request.FILES.get("file") or request.FILES.get("excel")
        if not uploaded_file:
            return Response(
                {"detail": "Excel файл юборилмаган. Field номи: file"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        mapping = {
            "sheet_name": request.data.get("sheet_name") or request.query_params.get("sheet_name") or "",
            "sheet_names": request.data.get("sheet_names") or request.query_params.get("sheet_names") or "",
            "year": request.data.get("year") or request.query_params.get("year") or "",
            "start_row": request.data.get("start_row") or request.query_params.get("start_row") or "",
            "end_row": request.data.get("end_row") or request.query_params.get("end_row") or "",
            "institution_name_col": request.data.get("institution_name_col") or request.query_params.get("institution_name_col") or "",
            "institution_inn_col": request.data.get("institution_inn_col") or request.query_params.get("institution_inn_col") or "",
            "unit_col": request.data.get("unit_col") or request.query_params.get("unit_col") or "",
        }

        commit = _truthy(request.data.get("commit") or request.query_params.get("commit"))
        update_existing = _truthy(
            request.data.get("update_existing")
            or request.query_params.get("update_existing")
        )
        selected_row_keys = _parse_selected_row_keys(request) if commit else []

        result = process_need_matrix_import(
            uploaded_file=uploaded_file,
            mapping=mapping,
            commit=commit,
            update_existing=update_existing,
            selected_row_keys=selected_row_keys,
            user=request.user,
        )

        http_status = status.HTTP_201_CREATED if result.get("ok") and commit else status.HTTP_200_OK
        if not result.get("ok") and result.get("detail"):
            http_status = status.HTTP_400_BAD_REQUEST

        return Response(result, status=http_status)
