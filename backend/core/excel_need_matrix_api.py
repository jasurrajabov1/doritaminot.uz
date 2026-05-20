# coding: utf-8
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .excel_need_matrix_import import process_need_matrix_import
from .permissions import HasPagePermission


def truthy(value):
    return str(value or "").strip().lower() in {"1", "true", "yes", "ha", "ҳа", "xa", "on"}


class ExcelNeedMatrixImportAPIView(APIView):
    permission_classes = [HasPagePermission]
    page_code = "need_rows"

    def post(self, request):
        uploaded_file = request.FILES.get("file") or request.FILES.get("excel")

        if not uploaded_file:
            return Response(
                {"detail": "Excel файл юборилмаган. Field номи: file"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        mapping = {
            "sheet_name": request.data.get("sheet_name") or "",
            "year": request.data.get("year") or "",
            "start_row": request.data.get("start_row") or "7",
            "end_row": request.data.get("end_row") or "",
            "institution_name_col": request.data.get("institution_name_col") or "B",
            "institution_inn_col": request.data.get("institution_inn_col") or "C",
            "unit_col": request.data.get("unit_col") or "D",
        }

        commit = truthy(request.data.get("commit") or request.query_params.get("commit"))
        update_existing = truthy(
            request.data.get("update_existing")
            or request.query_params.get("update_existing")
            or "1"
        )

        result = process_need_matrix_import(
            uploaded_file=uploaded_file,
            mapping=mapping,
            commit=commit,
            update_existing=update_existing,
            user=request.user,
        )

        # Ҳамма қатор хато бўлса — 400.
        # Камида битта OK қатор бўлса — 200/201. Хатоли қаторлар result.error_rows ичида қайтади.
        if (result.get("ok_count") or 0) <= 0:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            result,
            status=status.HTTP_201_CREATED if commit else status.HTTP_200_OK,
        )
