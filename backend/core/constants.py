PAGE_DEFINITIONS = (
    ("dashboard", "Бош саҳифа"),
    ("institutions", "Муассасалар"),
    ("drugs", "Дорилар"),
    ("prices", "Нархлар"),
    ("need_rows", "Эҳтиёж"),
    ("monthly_issues", "Берилган миқдор"),
    ("stock_summary", "Омбор қолдиғи"),
    ("need_rows_summary", "Эҳтиёжлар сводкаси"),
    ("access_management", "Фойдаланувчилар ва доступ"),
)

ACTION_DEFINITIONS = (
    ("view", "Кўриш"),
    ("add", "Қўшиш"),
    ("edit", "Таҳрирлаш"),
    ("delete", "Ўчириш"),
    ("export", "Экспорт"),
    ("print", "Чоп этиш"),
    ("manage_access", "Доступни бошқариш"),
)

ACTION_TO_FIELD = {
    "view": "can_view",
    "add": "can_add",
    "edit": "can_edit",
    "delete": "can_delete",
    "export": "can_export",
    "print": "can_print",
    "manage_access": "can_manage_access",
}

FIELD_TO_ACTION = {field_name: action for action, field_name in ACTION_TO_FIELD.items()}
PERMISSION_FIELD_NAMES = tuple(ACTION_TO_FIELD.values())
PAGE_CHOICES = PAGE_DEFINITIONS


def get_page_label(page_code):
    for code, label in PAGE_DEFINITIONS:
        if code == page_code:
            return label
    return page_code


def build_empty_permission_payload(page_code, page_label=None):
    payload = {
        "page_code": page_code,
        "page_label": page_label or get_page_label(page_code),
    }
    for action, _label in ACTION_DEFINITIONS:
        payload[action] = False
    return payload
