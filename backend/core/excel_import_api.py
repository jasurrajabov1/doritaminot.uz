# coding: utf-8
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .excel_import import IMPORT_TYPES, process_excel_import
from .permissions import resolve_user_page_permissions


def _truthy(value):
    return str(value or "").strip().lower() in {"1", "true", "yes", "ҳа", "ха", "on"}


class ExcelImportAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        import_type = (
            request.data.get("import_type")
            or request.query_params.get("import_type")
            or "institutions"
        )

        if import_type not in IMPORT_TYPES:
            return Response(
                {
                    "detail": "Import тури нотўғри.",
                    "allowed_import_types": list(IMPORT_TYPES.keys()),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        page_code = IMPORT_TYPES[import_type]["page_code"]
        permissions = resolve_user_page_permissions(request.user)
        page_permissions = permissions.get(page_code, {})

        if not request.user.is_superuser and not page_permissions.get("add"):
            return Response(
                {
                    "detail": f"Excel import учун {page_code}.add ҳуқуқи керак."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        uploaded_file = request.FILES.get("file") or request.FILES.get("excel")
        if not uploaded_file:
            return Response(
                {"detail": "Excel файл юборилмаган. Field номи: file"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        mapping = {
            "mode": request.data.get("mode") or request.query_params.get("mode") or "template",
            "sheet_name": request.data.get("sheet_name") or request.query_params.get("sheet_name") or "",
            "start_row": request.data.get("start_row") or request.query_params.get("start_row") or "",
            "end_row": request.data.get("end_row") or request.query_params.get("end_row") or "",
            "name_col": request.data.get("name_col") or request.query_params.get("name_col") or "",
            "inn_col": request.data.get("inn_col") or request.query_params.get("inn_col") or "",
            "address_col": request.data.get("address_col") or request.query_params.get("address_col") or "",
            "active_col": request.data.get("active_col") or request.query_params.get("active_col") or "",
        }

        commit = _truthy(request.data.get("commit") or request.query_params.get("commit"))
        update_existing = _truthy(
            request.data.get("update_existing")
            or request.query_params.get("update_existing")
        )

        result = process_excel_import(
            uploaded_file=uploaded_file,
            import_type=import_type,
            commit=commit,
            update_existing=update_existing,
            mapping=mapping,
            user=request.user,
        )

        http_status = status.HTTP_201_CREATED if result.get("ok") and commit else status.HTTP_200_OK
        if not result.get("ok") and result.get("detail"):
            http_status = status.HTTP_400_BAD_REQUEST

        return Response(result, status=http_status)
