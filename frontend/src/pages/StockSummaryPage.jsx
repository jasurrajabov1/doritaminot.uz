import { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import api from "../api/client";
import { canDo, canViewPage } from "../utils/permission";

const STOCK_COLUMNS_STORAGE_KEY = "stock_summary_columns_v2";

const toArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const extractError = (e, fallbackText) => {
  const data = e?.response?.data;

  if (typeof data === "string" && data.trim()) return data;
  if (data?.detail) return data.detail;

  if (Array.isArray(data?.non_field_errors) && data.non_field_errors[0]) {
    return data.non_field_errors[0];
  }

  const firstField =
    data && typeof data === "object" ? Object.keys(data)[0] : null;

  if (firstField && Array.isArray(data[firstField]) && data[firstField][0]) {
    return `${firstField}: ${data[firstField][0]}`;
  }

  if (firstField && typeof data[firstField] === "string") {
    return `${firstField}: ${data[firstField]}`;
  }

  return fallbackText;
};

const fmt = (value) => {
  return toNumber(value).toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
};

const fmtMoney = (value) => {
  return toNumber(value).toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const fmtPercent = (value) => {
  return toNumber(value).toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

const normalizeStatusLabel = (status) => {
  if (status === "Ортиқча берилган" || status === "Эҳтиёждан ошган") return "Ортиқча берилган";
  if (status === "Критик") return "Критик";
  if (status === "Паст") return "Паст";
  if (status === "Огоҳлантириш") return "Огоҳлантириш";
  if (status === "Норма") return "Норма";
  return "";
};

const getStatusLabel = (x) => {
  const totalNeed = toNumber(x.total_need ?? x.yearly_need);
  const givenQty = toNumber(x.given_qty);
  const remainingQty = toNumber(x.remaining_qty);
  const percent = toNumber(x.remaining_percent);

  if (remainingQty < 0 || givenQty > totalNeed) return "Ортиқча берилган";
  if (totalNeed <= 0) return "Номаълум";
  if (percent < 20) return "Критик";
  if (percent < 30) return "Паст";
  if (percent < 50) return "Огоҳлантириш";
  return "Норма";
};

const getStatusStyle = (x) => {
  const status = getStatusLabel(x);

  if (status === "Ортиқча берилган") {
    return { background: "#7f1d1d", color: "#ffffff" };
  }
  if (status === "Критик") {
    return { background: "#dc2626", color: "#ffffff" };
  }
  if (status === "Паст") {
    return { background: "#fecaca", color: "#7f1d1d" };
  }
  if (status === "Огоҳлантириш") {
    return { background: "#fef3c7", color: "#92400e" };
  }
  if (status === "Норма") {
    return { background: "#dcfce7", color: "#166534" };
  }

  return { background: "#e5e7eb", color: "#374151" };
};

const getRowStyle = (x) => {
  const status = getStatusLabel(x);

  if (status === "Ортиқча берилган") {
    return { background: "#fef2f2" };
  }

  if (status === "Критик") {
    return { background: "#fff1f2" };
  }

  if (status === "Паст") {
    return { background: "#fff7ed" };
  }

  return {};
};

const getAdditionalPercent = (x) => {
  const baseNeed = toNumber(x.yearly_need);
  const additionalNeed = toNumber(x.additional_need);

  if (baseNeed <= 0) return null;
  return (additionalNeed / baseNeed) * 100;
};

const normalizeRow = (x, index) => {
  const baseNeed = toNumber(x.yearly_need ?? x.base_yearly_need);
  const additionalNeed = toNumber(
    x.additional_need ?? x.additional_yearly_need
  );

  const totalNeed =
    x.total_need !== undefined && x.total_need !== null
      ? toNumber(x.total_need)
      : x.total_yearly_need !== undefined && x.total_yearly_need !== null
      ? toNumber(x.total_yearly_need)
      : baseNeed + additionalNeed;

  const givenQty = toNumber(x.issued_qty ?? x.given_qty ?? x.given_dpm);

  const remainingQty =
    x.remaining_qty !== undefined && x.remaining_qty !== null
      ? toNumber(x.remaining_qty)
      : x.remaining !== undefined && x.remaining !== null
      ? toNumber(x.remaining)
      : totalNeed - givenQty;

  const remainingPercent =
    x.remaining_percent !== undefined && x.remaining_percent !== null
      ? toNumber(x.remaining_percent)
      : totalNeed > 0
      ? (remainingQty / totalNeed) * 100
      : 0;

  const normalized = {
    id:
      x.id ??
      `${x.institution_name || "inst"}-${x.drug_name || "drug"}-${x.year || "year"}-${index}`,
    institution_name: x.institution_name ?? x.institution ?? "",
    institution_inn: x.institution_inn ?? "",
    drug_name: x.drug_name ?? x.drug ?? "",
    year: x.year ?? "",

    yearly_need: baseNeed,
    additional_need: additionalNeed,
    addition_count: toNumber(x.addition_count ?? x.additional_count),
    total_need: totalNeed,

    given_qty: givenQty,
    remaining_qty: remainingQty,
    remaining_percent: remainingPercent,
    status: normalizeStatusLabel(x.status),

    price: x.price !== undefined && x.price !== null ? toNumber(x.price) : null,
    total_need_sum:
      x.total_need_sum !== undefined && x.total_need_sum !== null
        ? toNumber(x.total_need_sum)
        : x.total_yearly_need_sum !== undefined && x.total_yearly_need_sum !== null
        ? toNumber(x.total_yearly_need_sum)
        : null,
    given_sum:
      x.given_sum !== undefined && x.given_sum !== null
        ? toNumber(x.given_sum)
        : null,
    remaining_sum:
      x.remaining_sum !== undefined && x.remaining_sum !== null
        ? toNumber(x.remaining_sum)
        : null,
  };

  normalized.additional_percent = getAdditionalPercent(normalized);
  return normalized;
};

const STOCK_COLUMNS = [
  {
    key: "institution_name",
    label: "Муассаса",
    group: "Асосий",
    required: true,
    preset: ["compact", "standard", "all"],
    cell: "wrap",
    exportLabel: "Муассаса",
    render: (x) => x.institution_name,
  },
  {
    key: "institution_inn",
    label: "ИНН",
    group: "Асосий",
    preset: ["standard", "all"],
    cell: "nowrap",
    exportLabel: "ИНН",
    render: (x) => x.institution_inn || "—",
  },
  {
    key: "drug_name",
    label: "Дори",
    group: "Асосий",
    required: true,
    preset: ["compact", "standard", "all"],
    cell: "wrap",
    exportLabel: "Дори",
    render: (x) => x.drug_name,
  },
  {
    key: "year",
    label: "Йил",
    group: "Асосий",
    required: true,
    preset: ["compact", "standard", "all"],
    cell: "nowrap",
    exportLabel: "Йил",
    render: (x) => x.year,
  },
  {
    key: "yearly_need",
    label: "Йил бошидаги эҳтиёж",
    group: "Эҳтиёж",
    preset: ["standard", "all"],
    cell: "nowrap",
    exportLabel: "Йил бошидаги эҳтиёж",
    render: (x) => fmt(x.yearly_need),
  },
  {
    key: "additional_need",
    label: "Қўшимча эҳтиёж",
    group: "Эҳтиёж",
    preset: ["compact", "standard", "all"],
    cell: "nowrap",
    exportLabel: "Қўшимча эҳтиёж",
    render: (x) => fmt(x.additional_need),
  },
  {
    key: "additional_percent",
    label: "Қўшимча %",
    group: "Эҳтиёж",
    preset: ["standard", "all"],
    cell: "nowrap",
    exportLabel: "Қўшимча %",
    render: (x) =>
      x.additional_percent === null ? "—" : `${fmtPercent(x.additional_percent)}%`,
  },
  {
    key: "addition_count",
    label: "Қўшимча сони",
    group: "Эҳтиёж",
    preset: ["standard", "all"],
    cell: "nowrap",
    exportLabel: "Қўшимча сони",
    render: (x) => fmt(x.addition_count),
  },
  {
    key: "total_need",
    label: "Умумий эҳтиёж",
    group: "Эҳтиёж",
    required: true,
    preset: ["compact", "standard", "all"],
    cell: "nowrap",
    exportLabel: "Умумий эҳтиёж",
    render: (x) => fmt(x.total_need),
  },
  {
    key: "given_qty",
    label: "Берилган миқдор",
    group: "Берилган / қолдиқ",
    preset: ["compact", "standard", "all"],
    cell: "nowrap",
    exportLabel: "Берилган миқдор",
    render: (x) => fmt(x.given_qty),
  },
  {
    key: "remaining_qty",
    label: "Қолдиқ",
    group: "Берилган / қолдиқ",
    preset: ["compact", "standard", "all"],
    cell: "nowrap",
    exportLabel: "Қолдиқ",
    render: (x) => fmt(x.remaining_qty),
  },
  {
    key: "remaining_percent",
    label: "Қолдиқ %",
    group: "Берилган / қолдиқ",
    preset: ["compact", "standard", "all"],
    cell: "nowrap",
    exportLabel: "Қолдиқ %",
    render: (x) => `${fmtPercent(x.remaining_percent)}%`,
  },
  {
    key: "status",
    label: "Статус",
    group: "Берилган / қолдиқ",
    required: true,
    preset: ["compact", "standard", "all"],
    cell: "nowrap",
    exportLabel: "Статус",
    render: (x) => (
      <span
        style={{
          ...getStatusStyle(x),
          display: "inline-block",
          padding: "6px 10px",
          borderRadius: "999px",
          fontSize: "12px",
          whiteSpace: "nowrap",
        }}
      >
        {getStatusLabel(x)}
      </span>
    ),
  },
  {
    key: "price",
    label: "Нарх",
    group: "Суммалар",
    preset: ["all"],
    cell: "nowrap",
    exportLabel: "Нарх",
    render: (x) => (x.price === null ? "—" : fmtMoney(x.price)),
  },
  {
    key: "total_need_sum",
    label: "Умумий эҳтиёж сумма",
    group: "Суммалар",
    preset: ["all"],
    cell: "nowrap",
    exportLabel: "Умумий эҳтиёж сумма",
    render: (x) => (x.total_need_sum === null ? "—" : fmtMoney(x.total_need_sum)),
  },
  {
    key: "given_sum",
    label: "Берилган сумма",
    group: "Суммалар",
    preset: ["all"],
    cell: "nowrap",
    exportLabel: "Берилган сумма",
    render: (x) => (x.given_sum === null ? "—" : fmtMoney(x.given_sum)),
  },
  {
    key: "remaining_sum",
    label: "Қолдиқ сумма",
    group: "Суммалар",
    preset: ["all"],
    cell: "nowrap",
    exportLabel: "Қолдиқ сумма",
    render: (x) => (x.remaining_sum === null ? "—" : fmtMoney(x.remaining_sum)),
  },
];

const COLUMN_GROUPS = ["Асосий", "Эҳтиёж", "Берилган / қолдиқ", "Суммалар"];

const getColumnsByPreset = (preset) => {
  const keys = STOCK_COLUMNS.filter(
    (column) => column.required || column.preset.includes(preset)
  ).map((column) => column.key);
  return [...new Set(keys)];
};

const sanitizeVisibleColumns = (keys) => {
  const validKeys = new Set(STOCK_COLUMNS.map((column) => column.key));
  const requiredKeys = STOCK_COLUMNS.filter((column) => column.required).map(
    (column) => column.key
  );

  const cleaned = Array.isArray(keys)
    ? keys.filter((key) => validKeys.has(key))
    : [];

  return [...new Set([...requiredKeys, ...cleaned])];
};

const readVisibleColumns = () => {
  try {
    const raw = localStorage.getItem(STOCK_COLUMNS_STORAGE_KEY);
    if (!raw) return getColumnsByPreset("standard");
    return sanitizeVisibleColumns(JSON.parse(raw));
  } catch {
    return getColumnsByPreset("standard");
  }
};

const writeVisibleColumns = (keys) => {
  try {
    localStorage.setItem(STOCK_COLUMNS_STORAGE_KEY, JSON.stringify(keys));
  } catch {
    // localStorage mavjud bo'lmasa jim o'tamiz
  }
};

export default function StockSummaryPage() {
  const [stockSummaryMainTablePage, setStockSummaryMainTablePage] = useState(1);
  const [stockSummaryMainTablePageSize, setStockSummaryMainTablePageSize] = useState(100);

  const canViewStockSummary = canViewPage("stock_summary");
  const canExportStockSummary = canDo("stock_summary", "export");
  const canPrintStockSummary = canDo("stock_summary", "print");

  const canManageStockSummary = canExportStockSummary || canPrintStockSummary;

  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [searchText, setSearchText] = useState("");
  const [filterInstitution, setFilterInstitution] = useState("");
  const [filterInn, setFilterInn] = useState("");
  const [filterDrug, setFilterDrug] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [visibleColumnKeys, setVisibleColumnKeys] = useState(readVisibleColumns);
  const [isColumnChooserOpen, setIsColumnChooserOpen] = useState(false);

  const setColumnsByPreset = (preset) => {
    const keys = getColumnsByPreset(preset);
    setVisibleColumnKeys(keys);
    writeVisibleColumns(keys);
  };

  const toggleColumn = (key) => {
    const column = STOCK_COLUMNS.find((item) => item.key === key);
    if (!column || column.required) return;

    setVisibleColumnKeys((current) => {
      const exists = current.includes(key);
      const next = sanitizeVisibleColumns(
        exists ? current.filter((item) => item !== key) : [...current, key]
      );
      writeVisibleColumns(next);
      return next;
    });
  };

  const visibleColumns = useMemo(() => {
    const visibleSet = new Set(sanitizeVisibleColumns(visibleColumnKeys));
    return STOCK_COLUMNS.filter((column) => visibleSet.has(column.key));
  }, [visibleColumnKeys]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/stock-summary/");
      setItems(toArray(res.data).map(normalizeRow));
    } catch (e) {
      console.error(e);
      setError(extractError(e, "Рўйхатни юклашда хато бўлди."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const yearOptions = useMemo(() => {
    return [...new Set(items.map((x) => String(x.year)).filter(Boolean))].sort(
      (a, b) => Number(b) - Number(a)
    );
  }, [items]);

  const institutionOptions = useMemo(() => {
    return [...new Set(items.map((x) => x.institution_name).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b)
    );
  }, [items]);

  const drugOptions = useMemo(() => {
    return [...new Set(items.map((x) => x.drug_name).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b)
    );
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const innFilter = filterInn.trim();

    return items
      .filter((x) => {
        const byInstitution = filterInstitution
          ? x.institution_name === filterInstitution
          : true;

        const byInn = innFilter
          ? String(x.institution_inn || "").includes(innFilter)
          : true;

        const byDrug = filterDrug ? x.drug_name === filterDrug : true;
        const byYear = filterYear ? String(x.year) === String(filterYear) : true;
        const byStatus = filterStatus ? getStatusLabel(x) === filterStatus : true;

        const text = `${x.institution_name} ${x.institution_inn} ${x.drug_name} ${x.year}`.toLowerCase();
        const bySearch = q ? text.includes(q) : true;

        return byInstitution && byInn && byDrug && byYear && byStatus && bySearch;
      })
      .sort((a, b) => {
        if (Number(a.year) !== Number(b.year)) return Number(b.year) - Number(a.year);
        if (String(a.institution_name) !== String(b.institution_name)) {
          return String(a.institution_name).localeCompare(String(b.institution_name));
        }
        return String(a.drug_name).localeCompare(String(b.drug_name));
      });
  }, [
    items,
    searchText,
    filterInstitution,
    filterInn,
    filterDrug,
    filterYear,
    filterStatus,
  ]);

  const stats = useMemo(() => {
    return {
      totalCount: filteredItems.length,
      overNeedCount: filteredItems.filter(
        (x) => getStatusLabel(x) === "Ортиқча берилган"
      ).length,
      criticalCount: filteredItems.filter(
        (x) => getStatusLabel(x) === "Критик"
      ).length,
      lowCount: filteredItems.filter((x) => getStatusLabel(x) === "Паст").length,
      warningCount: filteredItems.filter(
        (x) => getStatusLabel(x) === "Огоҳлантириш"
      ).length,
      normalCount: filteredItems.filter((x) => getStatusLabel(x) === "Норма")
        .length,
    };
  }, [filteredItems]);

  const clearFilters = () => {
    setSearchText("");
    setFilterInstitution("");
    setFilterInn("");
    setFilterDrug("");
    setFilterYear("");
    setFilterStatus("");
  };

  const buildExportRows = (sourceItems) =>
    sourceItems.map((x) => ({
      "Муассаса": x.institution_name,
      "ИНН": x.institution_inn || "",
      "Дори": x.drug_name,
      "Йил": x.year,
      "Йил бошидаги эҳтиёж": toNumber(x.yearly_need),
      "Қўшимча эҳтиёж": toNumber(x.additional_need),
      "Қўшимча %": x.additional_percent === null ? "" : toNumber(x.additional_percent),
      "Қўшимча сони": toNumber(x.addition_count),
      "Умумий эҳтиёж": toNumber(x.total_need),
      "Берилган миқдор": toNumber(x.given_qty),
      "Қолдиқ": toNumber(x.remaining_qty),
      "Қолдиқ %": toNumber(x.remaining_percent),
      "Статус": getStatusLabel(x),
      "Нарх": x.price ?? "",
      "Умумий эҳтиёж сумма": x.total_need_sum ?? "",
      "Берилган сумма": x.given_sum ?? "",
      "Қолдиқ сумма": x.remaining_sum ?? "",
    }));

  const exportOverIssuedToExcel = () => {
    const sourceItems = filteredItems.filter(
      (x) => getStatusLabel(x) === "Ортиқча берилган"
    );

    if (sourceItems.length === 0) {
      setError("Ортиқча берилган қаторлар топилмади.");
      return;
    }

    const detailSheetData = buildExportRows(sourceItems);
    const statsSheetData = [
      { "Кўрсаткич": "Ортиқча берилган", "Қиймат": sourceItems.length },
      {
        "Кўрсаткич": "Жами ортиқча миқдор",
        "Қиймат": sourceItems.reduce(
          (sum, x) => sum + Math.max(toNumber(x.given_qty) - toNumber(x.total_need), 0),
          0
        ),
      },
      {
        "Кўрсаткич": "Жами умумий эҳтиёж",
        "Қиймат": sourceItems.reduce((sum, x) => sum + toNumber(x.total_need), 0),
      },
      {
        "Кўрсаткич": "Жами берилган",
        "Қиймат": sourceItems.reduce((sum, x) => sum + toNumber(x.given_qty), 0),
      },
    ];

    const workbook = XLSX.utils.book_new();
    const detailWs = XLSX.utils.json_to_sheet(detailSheetData);
    const statsWs = XLSX.utils.json_to_sheet(statsSheetData);

    detailWs["!cols"] = [
      { wch: 35 },
      { wch: 14 },
      { wch: 24 },
      { wch: 10 },
      { wch: 20 },
      { wch: 18 },
      { wch: 12 },
      { wch: 14 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 12 },
      { wch: 16 },
      { wch: 14 },
      { wch: 22 },
      { wch: 18 },
      { wch: 18 },
    ];
    statsWs["!cols"] = [{ wch: 32 }, { wch: 20 }];

    XLSX.utils.book_append_sheet(workbook, detailWs, "Orticha_berilganlar");
    XLSX.utils.book_append_sheet(workbook, statsWs, "Jami");

    const parts = ["Orticha_berilganlar"];
    if (filterYear) parts.push(`year_${filterYear}`);
    if (filterInstitution) parts.push(`inst_${filterInstitution}`);
    if (filterInn) parts.push(`inn_${filterInn}`);
    if (filterDrug) parts.push(`drug_${filterDrug}`);

    XLSX.writeFile(workbook, `${parts.join("_")}.xlsx`);
  };

  const exportToExcel = () => {
    const detailSheetData = buildExportRows(filteredItems);
    const overIssuedSheetData = buildExportRows(
      filteredItems.filter((x) => getStatusLabel(x) === "Ортиқча берилган")
    );
    const criticalSheetData = buildExportRows(
      filteredItems.filter((x) =>
        ["Критик", "Паст", "Огоҳлантириш"].includes(getStatusLabel(x))
      )
    );

    const statsSheetData = [
      { "Кўрсаткич": "Жами", "Қиймат": stats.totalCount },
      { "Кўрсаткич": "Ортиқча берилган", "Қиймат": stats.overNeedCount },
      { "Кўрсаткич": "Критик", "Қиймат": stats.criticalCount },
      { "Кўрсаткич": "Паст", "Қиймат": stats.lowCount },
      { "Кўрсаткич": "Огоҳлантириш", "Қиймат": stats.warningCount },
      { "Кўрсаткич": "Норма", "Қиймат": stats.normalCount },
    ];

    const detailWs = XLSX.utils.json_to_sheet(detailSheetData);
    const overIssuedWs = XLSX.utils.json_to_sheet(overIssuedSheetData);
    const criticalOnlyWs = XLSX.utils.json_to_sheet(criticalSheetData);
    const statsWs = XLSX.utils.json_to_sheet(statsSheetData);

    detailWs["!cols"] = [
      { wch: 35 },
      { wch: 14 },
      { wch: 24 },
      { wch: 10 },
      { wch: 20 },
      { wch: 18 },
      { wch: 12 },
      { wch: 14 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 12 },
      { wch: 16 },
      { wch: 14 },
      { wch: 22 },
      { wch: 18 },
      { wch: 18 },
    ];

    overIssuedWs["!cols"] = detailWs["!cols"];
    criticalOnlyWs["!cols"] = detailWs["!cols"];
    statsWs["!cols"] = [{ wch: 28 }, { wch: 20 }];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, detailWs, "StockSummary");
    XLSX.utils.book_append_sheet(workbook, overIssuedWs, "Orticha_berilganlar");
    XLSX.utils.book_append_sheet(workbook, criticalOnlyWs, "Kritiklar");
    XLSX.utils.book_append_sheet(workbook, statsWs, "Jami");

    const parts = ["StockSummary"];
    if (filterYear) parts.push(`year_${filterYear}`);
    if (filterInstitution) parts.push(`inst_${filterInstitution}`);
    if (filterInn) parts.push(`inn_${filterInn}`);
    if (filterDrug) parts.push(`drug_${filterDrug}`);
    if (filterStatus) parts.push("status");

    XLSX.writeFile(workbook, `${parts.join("_")}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  const printStyles = `
    @media print {
      @page {
        size: A4 landscape;
        margin: 10mm;
      }

      body {
        background: #ffffff !important;
      }

      .page-container {
        padding: 0 !important;
        margin: 0 !important;
      }

      .form-card,
      button,
      nav,
      .menu-link,
      .app-nav,
      .top-nav,
      .header,
      .navbar {
        display: none !important;
      }

      .table-wrap {
        overflow: visible !important;
        margin-top: 12px !important;
      }

      .grid-table {
        width: 100% !important;
        border-collapse: collapse !important;
        table-layout: fixed !important;
        font-size: 10px !important;
      }

      .grid-table th,
      .grid-table td {
        border: 1px solid #999 !important;
        padding: 4px !important;
        white-space: normal !important;
        word-break: break-word !important;
        overflow-wrap: anywhere !important;
      }

      h2 {
        margin-top: 0 !important;
        margin-bottom: 8px !important;
      }

      p {
        margin-bottom: 10px !important;
      }
    }
  `;

  const compactHeaderCell = {
    padding: "6px 6px",
    fontSize: "12px",
    lineHeight: "1.15",
    verticalAlign: "top",
    whiteSpace: "normal",
    wordBreak: "normal",
    overflowWrap: "break-word",
    textAlign: "left",
    minWidth: "95px",
  };

  const compactCell = {
    padding: "6px 6px",
    fontSize: "12px",
    verticalAlign: "top",
    lineHeight: "1.2",
    minWidth: "95px",
  };

  const wrapCell = {
    ...compactCell,
    whiteSpace: "normal",
    wordBreak: "normal",
    overflowWrap: "break-word",
    minWidth: "170px",
    maxWidth: "320px",
  };

  const nowrapCell = {
    ...compactCell,
    whiteSpace: "nowrap",
  };

  const getCellStyle = (column) => (column.cell === "wrap" ? wrapCell : nowrapCell);

  if (!canViewStockSummary) {
    return <div className="page-container">Сизда ушбу саҳифани кўриш ҳуқуқи йўқ.</div>;
  }

  const visibleKeySet = new Set(visibleColumnKeys);

  // --- stockSummaryMain_TABLE_PAGINATION_V1 ---
  const stockSummaryMainPageSizeNumber = Number(stockSummaryMainTablePageSize) || 100;
  const stockSummaryMainRows = Array.isArray(filteredItems) ? filteredItems : [];
  const stockSummaryMainTotalPages = Math.max(1, Math.ceil(stockSummaryMainRows.length / stockSummaryMainPageSizeNumber));
  const stockSummaryMainSafePage = Math.min(stockSummaryMainTablePage, stockSummaryMainTotalPages);
  const stockSummaryMainStartIndex = (stockSummaryMainSafePage - 1) * stockSummaryMainPageSizeNumber;
  const stockSummaryMainEndIndex = Math.min(stockSummaryMainRows.length, stockSummaryMainStartIndex + stockSummaryMainPageSizeNumber);
  const stockSummaryMainPagedRows = stockSummaryMainRows.slice(stockSummaryMainStartIndex, stockSummaryMainEndIndex);
  const renderStockSummaryMainPager = () => (
    <div className="table-pagination-bar">
      <div className="table-pagination-info">
        <strong>Омбор қолдиғи</strong>
        <span>
          {stockSummaryMainRows.length
            ? ` ${stockSummaryMainStartIndex + 1}-${stockSummaryMainEndIndex} / ${stockSummaryMainRows.length}`
            : " 0 / 0"}
        </span>
      </div>
      <div className="table-pagination-actions">
        <span>Қатор:</span>
        <select
          className="table-page-size-select"
          value={stockSummaryMainTablePageSize}
          onChange={(event) => {
            setStockSummaryMainTablePageSize(Number(event.target.value));
            setStockSummaryMainTablePage(1);
          }}
        >
          {[50, 100, 250, 500, 1000].map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => setStockSummaryMainTablePage(1)} disabled={stockSummaryMainSafePage <= 1}>
          Биринчи
        </button>
        <button
          type="button"
          onClick={() => setStockSummaryMainTablePage(Math.max(1, stockSummaryMainSafePage - 1))}
          disabled={stockSummaryMainSafePage <= 1}
        >
          Олдинги
        </button>
        <span className="table-pagination-page">
          {stockSummaryMainSafePage} / {stockSummaryMainTotalPages}
        </span>
        <button
          type="button"
          onClick={() => setStockSummaryMainTablePage(Math.min(stockSummaryMainTotalPages, stockSummaryMainSafePage + 1))}
          disabled={stockSummaryMainSafePage >= stockSummaryMainTotalPages}
        >
          Кейинги
        </button>
        <button
          type="button"
          onClick={() => setStockSummaryMainTablePage(stockSummaryMainTotalPages)}
          disabled={stockSummaryMainSafePage >= stockSummaryMainTotalPages}
        >
          Охирги
        </button>
      </div>
    </div>
  );


  return (
    <div className="page-container">
      <style>{printStyles}</style>

      <h2>Омбор қолдиғи</h2>
      <p style={{ marginTop: "-6px", color: "#475569" }}>
        Бу саҳифа эҳтиёж, берилган миқдор ва қолдиқ ҳолатини назорат қилади.
      </p>

      {!canManageStockSummary ? (
        <p style={{ color: "#475569" }}>
          Сизда ушбу саҳифада фақат кўриш ҳуқуқи бор.
        </p>
      ) : null}

      {error ? <p style={{ color: "#dc2626" }}>{error}</p> : null}

      <div className="form-card">
        <div className="stats-row">
          <div className="stat-card">
            <div>Жами</div>
            <div>{stats.totalCount}</div>
          </div>
          <div className="stat-card">
            <div>Ортиқча берилган</div>
            <div>{stats.overNeedCount}</div>
          </div>
          <div className="stat-card">
            <div>Критик</div>
            <div>{stats.criticalCount}</div>
          </div>
          <div className="stat-card">
            <div>Паст</div>
            <div>{stats.lowCount}</div>
          </div>
          <div className="stat-card">
            <div>Огоҳлантириш</div>
            <div>{stats.warningCount}</div>
          </div>
          <div className="stat-card">
            <div>Норма</div>
            <div>{stats.normalCount}</div>
          </div>
        </div>
      </div>

      <div className="form-card" style={{ marginTop: "16px" }}>
        <div className="filter-row">
          <input
            type="text"
            placeholder="Қидириш: муассаса, дори, йил"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />

          <input
            type="text"
            inputMode="numeric"
            placeholder="Фильтр: ИНН"
            value={filterInn}
            onChange={(e) =>
              setFilterInn(e.target.value.replace(/\D/g, "").slice(0, 9))
            }
          />

          <select
            value={filterInstitution}
            onChange={(e) => setFilterInstitution(e.target.value)}
          >
            <option value="">Барча муассасалар</option>
            {institutionOptions.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>

          <select value={filterDrug} onChange={(e) => setFilterDrug(e.target.value)}>
            <option value="">Барча дорилар</option>
            {drugOptions.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>

          <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
            <option value="">Барча йиллар</option>
            {yearOptions.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">Барча статуслар</option>
            <option value="Ортиқча берилган">Ортиқча берилган</option>
            <option value="Критик">Критик</option>
            <option value="Паст">Паст</option>
            <option value="Огоҳлантириш">Огоҳлантириш</option>
            <option value="Норма">Норма</option>
          </select>

          <button type="button" onClick={clearFilters}>
            Тозалаш
          </button>

          <button type="button" onClick={load}>
            Янгилаш
          </button>

          {canExportStockSummary ? (
            <button type="button" onClick={exportToExcel}>
              Excel юклаб олиш
            </button>
          ) : null}

          {canExportStockSummary ? (
            <button
              type="button"
              onClick={exportOverIssuedToExcel}
              disabled={stats.overNeedCount === 0}
            >
              Ортиқча берилган Excel ({stats.overNeedCount})
            </button>
          ) : null}

          {canPrintStockSummary ? (
            <button type="button" onClick={handlePrint}>
              Чоп этиш
            </button>
          ) : null}
        </div>
      </div>

      <div className="form-card" style={{ marginTop: "16px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <strong>Омбор жадвали устунлари</strong>
            <div style={{ color: "#475569", marginTop: "4px" }}>
              Доим керак бўлмаган устунларни яшириб қўйиш мумкин. Танлов браузерда сақланади.
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setIsColumnChooserOpen((value) => !value)}
            >
              {isColumnChooserOpen ? "Устунларни яшириш" : "Устунлар"} ({visibleColumns.length} / {STOCK_COLUMNS.length})
            </button>
            <button type="button" onClick={() => setColumnsByPreset("compact")}>
              Ихчам
            </button>
            <button type="button" onClick={() => setColumnsByPreset("standard")}>
              Стандарт
            </button>
            <button type="button" onClick={() => setColumnsByPreset("all")}>
              Ҳаммаси
            </button>
          </div>
        </div>

        {isColumnChooserOpen ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
              gap: "10px",
              marginTop: "12px",
            }}
          >
            {COLUMN_GROUPS.map((group) => (
              <div
                key={group}
                style={{
                  border: "1px solid #cbd5e1",
                  borderRadius: "10px",
                  padding: "10px",
                  background: "#ffffff",
                }}
              >
                <strong>{group}</strong>
                <div style={{ marginTop: "8px", display: "grid", gap: "6px" }}>
                  {STOCK_COLUMNS.filter((column) => column.group === group).map(
                    (column) => (
                      <label
                        key={column.key}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          color: column.required ? "#64748b" : "#0f172a",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={visibleKeySet.has(column.key)}
                          disabled={column.required}
                          onChange={() => toggleColumn(column.key)}
                        />
                        {column.label}
                        {column.required ? " (мажбурий)" : ""}
                      </label>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

              {renderStockSummaryMainPager()}
<div className="table-wrap" style={{ overflowX: "auto" }}>
        <table
          className="grid-table"
          style={{
            width: "max-content",
            minWidth: `${Math.max(visibleColumns.length * 105, 900)}px`,
            tableLayout: "auto",
          }}
        >
          <thead>
            <tr>
              {visibleColumns.map((column) => (
                <th key={column.key} style={compactHeaderCell}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!loading && filteredItems.length > 0 ? (
              stockSummaryMainPagedRows.map((x) => (
                <tr key={x.id} style={getRowStyle(x)}>
                  {visibleColumns.map((column) => (
                    <td key={column.key} style={getCellStyle(column)}>
                      {column.render(x)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={visibleColumns.length} style={compactCell}>
                  {loading ? "Юкланмоқда..." : "Маълумот йўқ"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
