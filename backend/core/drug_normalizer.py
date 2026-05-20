import re

from django.apps import apps


KIND_DOSAGE_UNIT = "dosage_unit"
KIND_DOSAGE_FORM = "dosage_form"
KIND_MEASURE_UNIT = "measure_unit"


def clean_text(value):
    text = str(value or "").strip()
    text = text.replace("№", "№")
    text = re.sub(r"\s+", " ", text)
    return text


def norm_key(value):
    text = clean_text(value).casefold()
    text = text.replace("ё", "е")
    text = text.replace(".", "")
    text = text.replace("'", "")
    text = text.replace('"', "")
    text = re.sub(r"[\s\-_]+", "", text)
    return text


DOSAGE_UNIT_ALIASES = {
    "мг": "мг",
    "mg": "мг",
    "мгр": "мг",
    "миллиграмм": "мг",
    "миллиграм": "мг",

    "гр": "гр",
    "г": "гр",
    "g": "гр",
    "грамм": "гр",
    "грам": "гр",

    "кг": "кг",
    "kg": "кг",

    "мл": "мл",
    "ml": "мл",
    "миллилитр": "мл",
    "миллилитир": "мл",

    "мкг": "мкг",
    "mcg": "мкг",
    "ug": "мкг",

    "%": "%",
    "процент": "%",

    "ме": "МЕ",
    "ед": "ЕД",
}

DOSAGE_FORM_ALIASES = {
    "амп": "амп",
    "ампула": "амп",
    "ампулы": "амп",

    "табл": "табл",
    "таб": "табл",
    "таблетка": "табл",
    "таблетки": "табл",

    "порошок": "порошок",
    "пор": "порошок",

    "шамча": "шамча",
    "свеча": "шамча",

    "мазь": "мазь",
    "маз": "мазь",

    "крем": "крем",

    "гел": "гель",
    "гель": "гель",

    "фл": "фл",
    "флакон": "фл",

    "тюб": "тюб",
    "тюбик": "тюб",

    "дурулекс": "дурулекс",
    "дурулек": "дурулекс",

    "филм табл": "филм табл",
    "фильм табл": "филм табл",

    "капс": "капс",
    "капсула": "капс",
    "капсулы": "капс",

    "сироп": "сироп",
    "суспензия": "суспензия",

    "эритма": "эритма",
    "раствор": "эритма",

    "томчи": "томчи",
    "капли": "томчи",

    "спрей": "спрей",
}

MEASURE_UNIT_ALIASES = {
    "шт": "шт",
    "штук": "шт",

    "уп": "уп",
    "упак": "уп",
    "упаковка": "уп",

    "блистер": "блистер",
    "бл": "блистер",

    "пастилки": "пастилки",

    "коробка": "коробка",
    "кор": "коробка",

    "дона": "дона",

    "флакон": "флакон",
    "фл": "флакон",

    "тюб": "тюб",
    "тюбик": "тюб",
}

DEFAULT_ALIASES = {
    KIND_DOSAGE_UNIT: DOSAGE_UNIT_ALIASES,
    KIND_DOSAGE_FORM: DOSAGE_FORM_ALIASES,
    KIND_MEASURE_UNIT: MEASURE_UNIT_ALIASES,
}


def split_aliases(value):
    raw = str(value or "").replace(";", ",").replace("\n", ",")
    return [x.strip() for x in raw.split(",") if x.strip()]


def option_map(kind):
    mapping = dict(DEFAULT_ALIASES.get(kind, {}))

    try:
        DrugOption = apps.get_model("core", "DrugOption")

        for option in DrugOption.objects.filter(kind=kind, is_active=True):
            canonical = clean_text(option.name)
            if not canonical:
                continue

            mapping[norm_key(canonical)] = canonical

            for alias in split_aliases(option.aliases):
                mapping[norm_key(alias)] = canonical

    except Exception:
        # Migration вақтида ёки table ҳали йўқ пайтда default aliases ишлайверади.
        pass

    return mapping


def normalize_option(value, kind):
    text = clean_text(value)
    if not text:
        return ""

    mapping = option_map(kind)
    return mapping.get(norm_key(text), text)


def normalize_package_quantity(value):
    text = clean_text(value)
    if not text:
        return ""

    text = text.replace("№", "№")
    text = re.sub(r"^(no|n|#|№)\s*", "№", text, flags=re.I)
    text = re.sub(r"^№\s*", "№", text)

    if re.match(r"^\d", text):
        return f"№{text}"

    return text


def normalize_drug_for_save(drug):
    drug.name = clean_text(getattr(drug, "name", ""))
    drug.mnn_name = clean_text(getattr(drug, "mnn_name", ""))

    drug.dosage_value = clean_text(getattr(drug, "dosage_value", ""))
    drug.dosage_unit = normalize_option(
        getattr(drug, "dosage_unit", ""),
        KIND_DOSAGE_UNIT,
    )

    drug.package_quantity = normalize_package_quantity(
        getattr(drug, "package_quantity", "")
    )

    drug.dosage_form = normalize_option(
        getattr(drug, "dosage_form", ""),
        KIND_DOSAGE_FORM,
    )

    drug.unit = normalize_option(
        getattr(drug, "unit", ""),
        KIND_MEASURE_UNIT,
    )

    if getattr(drug, "manufacturer", None):
        drug.manufacturer = clean_text(drug.manufacturer)

    return drug


def allowed_option_names(kind):
    mapping = option_map(kind)
    values = sorted(set(mapping.values()), key=lambda x: x.casefold())
    return values


def normalize_option_strict(value, kind):
    text = clean_text(value)
    if not text:
        return ""

    mapping = option_map(kind)
    key = norm_key(text)

    if key not in mapping:
        allowed = ", ".join(allowed_option_names(kind)[:30])
        raise ValueError(
            f"Справочникда бундай қиймат йўқ: {text}. "
            f"Админ справочникка қўшиши ёки алиас сифатида киритиши керак. "
            f"Рухсат берилганлар: {allowed}"
        )

    return mapping[key]

