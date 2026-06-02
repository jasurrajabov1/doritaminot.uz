import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { canDo, canViewPage } from "../utils/permission";

const CONTROL_GROUPS = [
  ["general", "Оддий препарат"],
  ["narcotic", "Гиёҳвандлик воситалари"],
  ["psychotropic", "Психотроп моддалар"],
  ["strong", "Кучли таъсир қилувчи"],
  ["precursor", "Прекурсорлар"],
];

const DRUG_OPTION_API_DEFAULTS = {
  dosageUnits: ["мг", "гр", "кг", "мл", "мкг", "%", "МЕ", "ЕД"],
  dosageForms: [
    "амп",
    "табл",
    "порошок",
    "шамча",
    "мазь",
    "крем",
    "гель",
    "фл",
    "тюб",
    "дурулекс",
    "филм табл",
    "капс",
    "сироп",
    "суспензия",
    "эритма",
    "томчи",
    "спрей",
  ],
  measureUnits: [
    "шт",
    "уп",
    "блистер",
    "пастилки",
    "коробка",
    "дона",
    "флакон",
    "тюб",
    "ампула",
    "тыс. амп.",
  ],
};

const DRUG_OPTIONS_API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "/api"
).replace(/\/+$/, "");

function toArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function getErrorMessage(e, fallback) {
  const data = e?.response?.data;

  if (typeof data === "string" && data.trim()) return data;
  if (data?.detail) return data.detail;

  if (Array.isArray(data?.non_field_errors) && data.non_field_errors[0]) {
    return data.non_field_errors[0];
  }

  const firstField = data && typeof data === "object" ? Object.keys(data)[0] : null;

  if (firstField && Array.isArray(data[firstField]) && data[firstField][0]) {
    return `${firstField}: ${data[firstField][0]}`;
  }

  if (firstField && typeof data[firstField] === "string") {
    return `${firstField}: ${data[firstField]}`;
  }

  return fallback;
}

function normalizeDrugOptionText(value) {
  return String(value || "").trim();
}

function mergeUniqueDrugOptionValues(defaultValues, apiValues) {
  const result = new Set();

  [...(defaultValues || []), ...(apiValues || [])].forEach((value) => {
    const normalized = normalizeDrugOptionText(value);
    if (normalized) result.add(normalized);
  });

  return Array.from(result);
}

function cloneDrugOptionApiDefaults() {
  return {
    dosageUnits: [...DRUG_OPTION_API_DEFAULTS.dosageUnits],
    dosageForms: [...DRUG_OPTION_API_DEFAULTS.dosageForms],
    measureUnits: [...DRUG_OPTION_API_DEFAULTS.measureUnits],
  };
}

async function fetchDrugOptionApiValues(kind) {
  const token = sessionStorage.getItem("auth_token");
  const headers = token ? { Authorization: `Token ${token}` } : {};

  const res = await fetch(
    `${DRUG_OPTIONS_API_BASE_URL}/drug-options/?kind=${encodeURIComponent(kind)}`,
    { headers }
  );

  if (!res.ok) {
    throw new Error(`DrugOption API error: ${kind} ${res.status}`);
  }

  const data = await res.json();
  const rows = Array.isArray(data) ? data : data?.results || [];

  return rows.map((row) => normalizeDrugOptionText(row?.name ?? row)).filter(Boolean);
}

function controlGroupLabel(value) {
  return CONTROL_GROUPS.find(([code]) => code === value)?.[1] || "Оддий препарат";
}

function buildDrugDisplayName(d) {
  if (!d) return "";

  const backendName = d.display_name || d.full_name;
  if (backendName) return String(backendName);

  const parts = [];

  if (d.name) parts.push(d.name);

  const dose = [d.dosage_value, d.dosage_unit].filter(Boolean).join(" ").trim();
  if (dose) parts.push(dose);

  if (d.package_quantity) {
    const pkg = String(d.package_quantity);
    parts.push(pkg.startsWith("№") ? pkg : `№${pkg}`);
  }

  if (d.dosage_form) parts.push(d.dosage_form);

  return parts.join(" ").trim();
}

function latinToCyrillic(input) {
  let text = String(input || "");

  const replacements = [
    ["Sh", "Ш"], ["SH", "Ш"], ["sh", "ш"],
    ["Ch", "Ч"], ["CH", "Ч"], ["ch", "ч"],
    ["Gʻ", "Ғ"], ["G‘", "Ғ"], ["G'", "Ғ"], ["gʻ", "ғ"], ["g‘", "ғ"], ["g'", "ғ"],
    ["Oʻ", "Ў"], ["O‘", "Ў"], ["O'", "Ў"], ["oʻ", "ў"], ["o‘", "ў"], ["o'", "ў"],
    ["Yo", "Ё"], ["YO", "Ё"], ["yo", "ё"],
    ["Yu", "Ю"], ["YU", "Ю"], ["yu", "ю"],
    ["Ya", "Я"], ["YA", "Я"], ["ya", "я"],
    ["Ts", "Ц"], ["TS", "Ц"], ["ts", "ц"],
  ];

  replacements.forEach(([from, to]) => {
    text = text.split(from).join(to);
  });

  const map = {
    A: "А", B: "Б", D: "Д", E: "Е", F: "Ф", G: "Г", H: "Ҳ", I: "И", J: "Ж",
    K: "К", L: "Л", M: "М", N: "Н", O: "О", P: "П", Q: "Қ", R: "Р", S: "С",
    T: "Т", U: "У", V: "В", X: "Х", Y: "Й", Z: "З",
    a: "а", b: "б", d: "д", e: "е", f: "ф", g: "г", h: "ҳ", i: "и", j: "ж",
    k: "к", l: "л", m: "м", n: "н", o: "о", p: "п", q: "қ", r: "р", s: "с",
    t: "т", u: "у", v: "в", x: "х", y: "й", z: "з",
  };

  return text.replace(/[A-Za-z]/g, (ch) => map[ch] || ch);
}

function cyrillicToLatin(input) {
  const map = {
    А: "A", а: "a",
    Б: "B", б: "b",
    В: "V", в: "v",
    Г: "G", г: "g",
    Ғ: "Gʻ", ғ: "gʻ",
    Д: "D", д: "d",
    Е: "E", е: "e",
    Ё: "Yo", ё: "yo",
    Ж: "J", ж: "j",
    З: "Z", з: "z",
    И: "I", и: "i",
    Й: "Y", й: "y",
    К: "K", к: "k",
    Қ: "Q", қ: "q",
    Л: "L", л: "l",
    М: "M", м: "m",
    Н: "N", н: "n",
    О: "O", о: "o",
    П: "P", п: "p",
    Р: "R", р: "r",
    С: "S", с: "s",
    Т: "T", т: "t",
    У: "U", у: "u",
    Ў: "Oʻ", ў: "oʻ",
    Ф: "F", ф: "f",
    Х: "X", х: "x",
    Ҳ: "H", ҳ: "h",
    Ц: "Ts", ц: "ts",
    Ч: "Ch", ч: "ch",
    Ш: "Sh", ш: "sh",
    Щ: "Sh", щ: "sh",
    Ъ: "", ъ: "",
    Ы: "I", ы: "i",
    Ь: "", ь: "",
    Э: "E", э: "e",
    Ю: "Yu", ю: "yu",
    Я: "Ya", я: "ya",
  };

  return String(input || "").replace(/[А-Яа-яЁёЎўҚқҒғҲҳ]/g, (ch) => map[ch] ?? ch);
}

function transliterateText(value, target) {
  if (!value) return value;
  return target === "latin" ? cyrillicToLatin(value) : latinToCyrillic(value);
}

export default function DrugsPage() {
  const canViewDrugs = canViewPage("drugs");
  const canAddDrug = canDo("drugs", "add");
  const canEditDrug = canDo("drugs", "edit");
  const canDeleteDrug = canDo("drugs", "delete");

  const canManageDrugs = canAddDrug || canEditDrug || canDeleteDrug;

  const [drugs, setDrugs] = useState([]);

  const [drugPassportOptions, setDrugPassportOptions] = useState(() =>
    cloneDrugOptionApiDefaults()
  );

  const [name, setName] = useState("");
  const [mnnName, setMnnName] = useState("");
  const [dosageValue, setDosageValue] = useState("");
  const [dosageUnit, setDosageUnit] = useState("");
  const [packageQuantity, setPackageQuantity] = useState("");
  const [dosageForm, setDosageForm] = useState("");
  const [unit, setUnit] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [controlGroup, setControlGroup] = useState("general");
  const [isActive, setIsActive] = useState(true);

  const [editingId, setEditingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const [filterName, setFilterName] = useState("");
  const [filterManufacturer, setFilterManufacturer] = useState("");
  const [filterActive, setFilterActive] = useState("");
  const [filterControlGroup, setFilterControlGroup] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const isEditMode = editingId !== null;
  const canShowDrugForm = canAddDrug || (isEditMode && canEditDrug);
  const canShowDrugActions = canEditDrug || canDeleteDrug;

  useEffect(() => {
    let cancelled = false;

    async function loadDrugPassportOptions() {
      try {
        const [dosageUnits, dosageForms, measureUnits] = await Promise.all([
          fetchDrugOptionApiValues("dosage_unit"),
          fetchDrugOptionApiValues("dosage_form"),
          fetchDrugOptionApiValues("measure_unit"),
        ]);

        if (cancelled) return;

        setDrugPassportOptions({
          dosageUnits: mergeUniqueDrugOptionValues(
            DRUG_OPTION_API_DEFAULTS.dosageUnits,
            dosageUnits
          ),
          dosageForms: mergeUniqueDrugOptionValues(
            DRUG_OPTION_API_DEFAULTS.dosageForms,
            dosageForms
          ),
          measureUnits: mergeUniqueDrugOptionValues(
            DRUG_OPTION_API_DEFAULTS.measureUnits,
            measureUnits
          ),
        });
      } catch (optionError) {
        console.warn("DrugOption API юкланмади, default рўйхат ишлатилади:", optionError);
        if (!cancelled) {
          setDrugPassportOptions(cloneDrugOptionApiDefaults());
        }
      }
    }

    loadDrugPassportOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    try {
      setError("");
      setLoading(true);
      const res = await api.get("/drugs/");
      setDrugs(toArray(res.data));
      setSelectedIds(new Set());
    } catch (e) {
      console.error(e);
      setError(getErrorMessage(e, "Рўйхатни юклашда хато бўлди."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredDrugs = useMemo(() => {
    return drugs
      .filter((d) => {
        const searchText = [
          buildDrugDisplayName(d),
          d.name,
          d.mnn_name,
          d.dosage_value,
          d.dosage_unit,
          d.package_quantity,
          d.dosage_form,
          d.unit,
          d.manufacturer,
          controlGroupLabel(d.control_group || "general"),
        ]
          .join(" ")
          .toLowerCase();

        const byName = filterName.trim()
          ? searchText.includes(filterName.trim().toLowerCase())
          : true;

        const byManufacturer = filterManufacturer.trim()
          ? String(d.manufacturer || "")
              .toLowerCase()
              .includes(filterManufacturer.trim().toLowerCase())
          : true;

        const byActive =
          filterActive === ""
            ? true
            : filterActive === "true"
            ? (d.is_active ?? true) === true
            : (d.is_active ?? true) === false;

        const byGroup = filterControlGroup
          ? String(d.control_group || "general") === filterControlGroup
          : true;

        return byName && byManufacturer && byActive && byGroup;
      })
      .sort((a, b) => buildDrugDisplayName(a).localeCompare(buildDrugDisplayName(b)));
  }, [drugs, filterName, filterManufacturer, filterActive, filterControlGroup]);

  const visibleIds = useMemo(() => filteredDrugs.map((d) => Number(d.id)), [filteredDrugs]);

  const selectedRows = useMemo(() => {
    return drugs.filter((d) => selectedIds.has(Number(d.id)));
  }, [drugs, selectedIds]);

  const selectedCount = selectedIds.size;

  const drugNamePreview = useMemo(() => {
    return buildDrugDisplayName({
      name,
      dosage_value: dosageValue,
      dosage_unit: dosageUnit,
      package_quantity: packageQuantity,
      dosage_form: dosageForm,
      full_name: "",
      display_name: "",
    });
  }, [name, dosageValue, dosageUnit, packageQuantity, dosageForm]);

  const resetForm = () => {
    setName("");
    setMnnName("");
    setDosageValue("");
    setDosageUnit("");
    setPackageQuantity("");
    setDosageForm("");
    setUnit("");
    setManufacturer("");
    setControlGroup("general");
    setIsActive(true);
    setEditingId(null);
    setError("");
  };

  const startEdit = (d) => {
    setError("");
    setSuccess("");
    setEditingId(d.id);
    setName(d.name || "");
    setMnnName(d.mnn_name || "");
    setDosageValue(d.dosage_value || "");
    setDosageUnit(d.dosage_unit || "");
    setPackageQuantity(d.package_quantity || "");
    setDosageForm(d.dosage_form || "");
    setUnit(d.unit || "");
    setManufacturer(d.manufacturer || "");
    setControlGroup(d.control_group || "general");
    setIsActive(d.is_active ?? true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const buildPayload = () => {
    if (!name.trim()) return null;

    return {
      name: name.trim(),
      mnn_name: mnnName.trim(),
      dosage_value: dosageValue.trim(),
      dosage_unit: dosageUnit.trim(),
      package_quantity: packageQuantity.trim(),
      dosage_form: dosageForm.trim(),
      unit: unit.trim(),
      manufacturer: manufacturer.trim() ? manufacturer.trim() : null,
      control_group: controlGroup || "general",
      is_active: isActive,
    };
  };

  const handleAdd = async () => {
    try {
      setError("");
      setSuccess("");

      const payload = buildPayload();
      if (!payload) {
        setError("Дори номи мажбурий.");
        return;
      }

      await api.post("/drugs/", payload);

      resetForm();
      setSuccess("Дори қўшилди.");
      await load();
    } catch (e) {
      console.error(e);
      setError(getErrorMessage(e, "Қўшишда хато бўлди."));
    }
  };

  const handleSave = async () => {
    try {
      setError("");
      setSuccess("");

      if (!editingId) {
        setError("Таҳрирланаётган ёзув топилмади.");
        return;
      }

      const payload = buildPayload();
      if (!payload) {
        setError("Дори номи мажбурий.");
        return;
      }

      await api.patch(`/drugs/${editingId}/`, payload);

      resetForm();
      setSuccess("Дори янгиланди.");
      await load();
    } catch (e) {
      console.error(e);
      setError(getErrorMessage(e, "Сақлашда хато бўлди."));
    }
  };

  const handleDelete = async (id) => {
    const ok = window.confirm("Ростдан ҳам ушбу дорини ўчиришни тасдиқлайсизми?");
    if (!ok) return;

    try {
      setError("");
      setSuccess("");
      await api.delete(`/drugs/${id}/`);
      setSuccess("Дори ўчирилди.");
      await load();
    } catch (e) {
      console.error(e);
      setError(getErrorMessage(e, "Дорини ўчиришда хатолик юз берди."));
    }
  };

  const handleToggleActiveRow = async (d) => {
    try {
      setError("");
      setSuccess("");

      const nextActive = !(d.is_active ?? true);

      await api.patch(`/drugs/${d.id}/`, {
        is_active: nextActive,
      });

      setSuccess(nextActive ? "Дори фаол қилинди." : "Дори нофаол қилинди.");
      await load();
    } catch (e) {
      console.error(e);
      setError(getErrorMessage(e, "Фаолликни ўзгартиришда хато бўлди."));
    }
  };

  const toggleSelected = (id) => {
    const numericId = Number(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(numericId)) {
        next.delete(numericId);
      } else {
        next.add(numericId);
      }
      return next;
    });
  };

  const selectVisible = () => {
    setSelectedIds(new Set(visibleIds));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const bulkPatchSelected = async (payloadFactory, successText, fallbackError) => {
    if (selectedCount <= 0) {
      setError("Аввал камида битта дори белгиланг.");
      return;
    }

    try {
      setError("");
      setSuccess("");
      setLoading(true);

      let okCount = 0;
      const errors = [];

      for (const row of selectedRows) {
        try {
          const payload =
            typeof payloadFactory === "function" ? payloadFactory(row) : payloadFactory;
          await api.patch(`/drugs/${row.id}/`, payload);
          okCount += 1;
        } catch (e) {
          errors.push(`${buildDrugDisplayName(row)}: ${getErrorMessage(e, fallbackError)}`);
        }
      }

      await load();

      if (errors.length) {
        setError(errors.slice(0, 5).join("\n"));
      }

      setSuccess(`${okCount} та дори ${successText}.`);
    } finally {
      setLoading(false);
    }
  };

  const bulkDeactivateSelected = async () => {
    await bulkPatchSelected(
      { is_active: false },
      "нофаол қилинди",
      "Нофаол қилишда хато бўлди."
    );
  };

  const bulkActivateSelected = async () => {
    await bulkPatchSelected(
      { is_active: true },
      "фаол қилинди",
      "Фаол қилишда хато бўлди."
    );
  };

  const bulkTransliterateSelected = async (target) => {
    const targetText = target === "latin" ? "лотинга" : "кириллга";

    const ok = window.confirm(
      `${selectedCount} та белгиланган дори номи, МНН ва ишлаб чиқарувчисини ${targetText} ўтказишни тасдиқлайсизми?`
    );
    if (!ok) return;

    await bulkPatchSelected(
      (row) => ({
        name: transliterateText(row.name || "", target),
        mnn_name: transliterateText(row.mnn_name || "", target),
        manufacturer: row.manufacturer
          ? transliterateText(row.manufacturer, target)
          : row.manufacturer,
      }),
      `${targetText} ўтказилди`,
      "Алифбони ўзгартиришда хато бўлди."
    );
  };

  const bulkDeleteSelected = async () => {
    if (selectedCount <= 0) {
      setError("Аввал ўчириладиган дориларни белгиланг.");
      return;
    }

    const ok = window.confirm(
      `${selectedCount} та белгиланган дорини ўчиришни тасдиқлайсизми?\n\nЭслатма: нарх, эҳтиёж ёки берилган миқдорда ишлатилган дорилар backend томонидан ўчирилмайди.`
    );
    if (!ok) return;

    try {
      setError("");
      setSuccess("");
      setLoading(true);

      let okCount = 0;
      const errors = [];

      for (const row of selectedRows) {
        try {
          await api.delete(`/drugs/${row.id}/`);
          okCount += 1;
        } catch (e) {
          errors.push(`${buildDrugDisplayName(row)}: ${getErrorMessage(e, "Ўчиришда хато бўлди.")}`);
        }
      }

      await load();

      setSuccess(`${okCount} та дори ўчирилди.`);

      if (errors.length) {
        setError(errors.slice(0, 6).join("\n"));
      }
    } finally {
      setLoading(false);
    }
  };

  const compactHeaderCell = {
    padding: "6px 6px",
    fontSize: "12px",
    lineHeight: "1.15",
    verticalAlign: "top",
    whiteSpace: "normal",
    wordBreak: "break-word",
    overflowWrap: "anywhere",
    textAlign: "left",
  };

  const compactCell = {
    padding: "5px 6px",
    fontSize: "12px",
    verticalAlign: "top",
    lineHeight: "1.15",
  };

  const wrapCell = {
    ...compactCell,
    whiteSpace: "normal",
    wordBreak: "break-word",
    overflowWrap: "anywhere",
  };

  const nowrapCell = {
    ...compactCell,
    whiteSpace: "nowrap",
  };

  const actionButtonStyle = {
    padding: "6px 10px",
    fontSize: "12px",
    lineHeight: "1.1",
    borderRadius: "8px",
  };

  if (!canViewDrugs) {
    return <div className="page-container">Сизда ушбу саҳифани кўриш ҳуқуқи йўқ.</div>;
  }

  return (
    <div className="page-container">
      <h2>Дорилар</h2>

      {!canManageDrugs ? (
        <p style={{ color: "#475569" }}>
          Сизда ушбу саҳифада фақат кўриш ҳуқуқи бор.
        </p>
      ) : null}

      {error ? (
        <pre style={{ color: "#dc2626", whiteSpace: "pre-wrap" }}>{error}</pre>
      ) : null}
      {success ? <p style={{ color: "#166534" }}>{success}</p> : null}
      {loading ? <p>Юкланяпти...</p> : null}

      {canShowDrugForm ? (
        <div className="form-card">
          <datalist id="drug-dosage-units">
            {drugPassportOptions.dosageUnits.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>

          <datalist id="drug-dosage-forms">
            {drugPassportOptions.dosageForms.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>

          <datalist id="drug-measure-units">
            {drugPassportOptions.measureUnits.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>

          <div className="form-row">
            <input
              placeholder="Дори номи"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <input
              placeholder="МНН / generic номи"
              value={mnnName}
              onChange={(e) => setMnnName(e.target.value)}
            />

            <input
              placeholder="Доза: 0,5 / 2,0 / 500"
              value={dosageValue}
              onChange={(e) => setDosageValue(e.target.value)}
            />

            <input
              list="drug-dosage-units"
              placeholder="Доза бирлиги: мг, гр, мл"
              value={dosageUnit}
              onChange={(e) => setDosageUnit(e.target.value)}
            />

            <input
              placeholder="№ қадоқ: 10 / 20 / 100"
              value={packageQuantity}
              onChange={(e) => setPackageQuantity(e.target.value)}
            />

            <input
              list="drug-dosage-forms"
              placeholder="Дори тури: табл, амп, фл"
              value={dosageForm}
              onChange={(e) => setDosageForm(e.target.value)}
            />

            <input
              list="drug-measure-units"
              placeholder="Ўлчов бирлиги: уп, шт, тыс. амп."
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />

            <input
              placeholder="Ишлаб чиқарувчи"
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
            />

            <select
              value={controlGroup}
              onChange={(e) => setControlGroup(e.target.value)}
            >
              {CONTROL_GROUPS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <div style={{ flex: "1 1 420px", color: "#334155" }}>
              Тўлиқ кўриниш: <strong>{drugNamePreview || "—"}</strong>
            </div>

            {!isEditMode ? (
              canAddDrug ? (
                <button className="primary" type="button" onClick={handleAdd}>
                  Қўшиш
                </button>
              ) : null
            ) : (
              <>
                {canEditDrug ? (
                  <button className="primary" type="button" onClick={handleSave}>
                    Сақлаш
                  </button>
                ) : null}

                <button type="button" onClick={resetForm}>
                  Бекор қилиш
                </button>
              </>
            )}
          </div>

          <div className="checkbox-row">
            <input
              id="drug-active"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            <label htmlFor="drug-active">Фаол</label>
          </div>
        </div>
      ) : null}

      <div className="form-card" style={{ marginTop: "16px" }}>
        <div className="filter-row">
          <input
            placeholder="Қидириш: номи, МНН, доза, тур"
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
          />

          <input
            placeholder="Фильтр: ишлаб чиқарувчи"
            value={filterManufacturer}
            onChange={(e) => setFilterManufacturer(e.target.value)}
          />

          <select value={filterControlGroup} onChange={(e) => setFilterControlGroup(e.target.value)}>
            <option value="">Барча гуруҳлар</option>
            {CONTROL_GROUPS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <select value={filterActive} onChange={(e) => setFilterActive(e.target.value)}>
            <option value="">Барчаси</option>
            <option value="true">Фаол</option>
            <option value="false">Нофаол</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setFilterName("");
              setFilterManufacturer("");
              setFilterActive("");
              setFilterControlGroup("");
            }}
          >
            Тозалаш
          </button>

          <button type="button" onClick={load}>
            Янгилаш
          </button>
        </div>

        {canManageDrugs ? (
          <div className="filter-row" style={{ borderTop: "1px solid #e5e7eb", paddingTop: 12 }}>
            <strong>Танланган: {selectedCount} та</strong>

            <button type="button" onClick={selectVisible}>
              Кўринаётганларни белгилаш ({visibleIds.length})
            </button>

            <button type="button" onClick={clearSelection} disabled={selectedCount <= 0}>
              Танловни тозалаш
            </button>

            {canEditDrug ? (
              <>
                <button type="button" onClick={() => bulkTransliterateSelected("latin")} disabled={selectedCount <= 0}>
                  Танланганларни лотинга
                </button>

                <button type="button" onClick={() => bulkTransliterateSelected("cyrillic")} disabled={selectedCount <= 0}>
                  Танланганларни кириллга
                </button>

                <button type="button" onClick={bulkDeactivateSelected} disabled={selectedCount <= 0}>
                  Танланганларни нофаол қилиш
                </button>

                <button type="button" onClick={bulkActivateSelected} disabled={selectedCount <= 0}>
                  Танланганларни фаол қилиш
                </button>
              </>
            ) : null}

            {canDeleteDrug ? (
              <button
                type="button"
                onClick={bulkDeleteSelected}
                disabled={selectedCount <= 0}
                style={{ borderColor: "#ef4444", color: "#dc2626" }}
              >
                Танланганларни ўчириш
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="table-wrap">
        <table className="grid-table" style={{ width: "100%", tableLayout: "auto" }}>
          <thead>
            <tr>
              {canManageDrugs ? (
                <th style={compactHeaderCell}>
                  <input
                    type="checkbox"
                    checked={visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id))}
                    onChange={(e) => {
                      if (e.target.checked) selectVisible();
                      else clearSelection();
                    }}
                  />
                </th>
              ) : null}
              <th style={compactHeaderCell}>ИД</th>
              <th style={compactHeaderCell}>Тўлиқ номи</th>
              <th style={compactHeaderCell}>Асосий номи</th>
              <th style={compactHeaderCell}>МНН</th>
              <th style={compactHeaderCell}>Доза</th>
              <th style={compactHeaderCell}>№</th>
              <th style={compactHeaderCell}>Дори тури</th>
              <th style={compactHeaderCell}>Ўлчов бирлиги</th>
              <th style={compactHeaderCell}>Назорат гуруҳи</th>
              <th style={compactHeaderCell}>Ишлаб чиқарувчи</th>
              <th style={compactHeaderCell}>Фаол</th>
              {canShowDrugActions ? <th style={compactHeaderCell}>Амал</th> : null}
            </tr>
          </thead>

          <tbody>
            {filteredDrugs.length > 0 ? (
              filteredDrugs.map((d) => {
                const rowId = Number(d.id);
                const checked = selectedIds.has(rowId);

                return (
                  <tr key={d.id}>
                    {canManageDrugs ? (
                      <td style={nowrapCell}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSelected(rowId)}
                        />
                      </td>
                    ) : null}

                    <td style={nowrapCell}>{d.id}</td>
                    <td style={{ ...wrapCell, minWidth: 260 }}>{buildDrugDisplayName(d)}</td>
                    <td style={wrapCell}>{d.name || "—"}</td>
                    <td style={wrapCell}>{d.mnn_name || "—"}</td>
                    <td style={nowrapCell}>
                      {[d.dosage_value, d.dosage_unit].filter(Boolean).join(" ") || "—"}
                    </td>
                    <td style={nowrapCell}>{d.package_quantity || "—"}</td>
                    <td style={nowrapCell}>{d.dosage_form || "—"}</td>
                    <td style={nowrapCell}>{d.unit || "—"}</td>
                    <td style={wrapCell}>{controlGroupLabel(d.control_group || "general")}</td>
                    <td style={wrapCell}>{d.manufacturer || "—"}</td>
                    <td style={nowrapCell}>
                      <span className={`status-badge ${(d.is_active ?? true) ? "safe" : "danger"}`}>
                        {(d.is_active ?? true) ? "Ҳа" : "Йўқ"}
                      </span>
                    </td>

                    {canShowDrugActions ? (
                      <td style={{ ...compactCell, minWidth: 210 }}>
                        <div className="actions-cell">
                          {canEditDrug ? (
                            <>
                              <button type="button" style={actionButtonStyle} onClick={() => startEdit(d)}>
                                Таҳрирлаш
                              </button>

                              <button type="button" style={actionButtonStyle} onClick={() => handleToggleActiveRow(d)}>
                                {(d.is_active ?? true) ? "Нофаол қилиш" : "Фаол қилиш"}
                              </button>
                            </>
                          ) : null}

                          {canDeleteDrug ? (
                            <button type="button" style={actionButtonStyle} onClick={() => handleDelete(d.id)}>
                              Ўчириш
                            </button>
                          ) : null}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={canShowDrugActions ? 13 : 12} style={compactCell}>
                  Маълумот йўқ.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
