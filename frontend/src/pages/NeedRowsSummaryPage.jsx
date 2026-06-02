import { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import api from "../api/client";
import { canDo, canViewPage } from "../utils/permission";

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

const formatNumber = (value) => {
  if (value === null || value === undefined || value === "") return "";
  return toNumber(value).toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
};

const formatMoney = (value) => {
  if (value === null || value === undefined || value === "") return "Нарх йўқ";
  if (value === "MULTI") return "Турли нархлар";
  return toNumber(value).toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatPercent = (value) => {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return "";

  return `${n.toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}%`;
};

const buildAdditionalNeedExportRows = (items) =>
  items.map((row, index) => ({
    "№": index + 1,
    "Йил": row.year,
    "Муассаса": row.institution_name,
    "ИНН": row.institution_inn || "",
    "Дори": row.drug_name,
    "Йил бошидаги эҳтиёж": toNumber(row.base_yearly_need),
    "Қўшимча эҳтиёж": toNumber(row.additional_need),
    "Қўшимча %": toNumber(row.additional_need_percent),
    "Қўшимча сони": toNumber(row.addition_count),
    "Умумий эҳтиёж": toNumber(row.total_yearly_need),
    "Берилган миқдор": toNumber(row.total_given_dpm),
    "Қолдиқ": toNumber(row.total_remaining),
    "Амбулатор рецепт бўйича эҳтиёж": toNumber(row.total_amb_rec_need),
    "ДПМ бўйича эҳтиёж": toNumber(row.total_dpm_need),
    "Умумий чораклик эҳтиёж": toNumber(row.total_quarterly_need),
    "Нарх": row.price_value !== null ? toNumber(row.price_value) : "Нарх йўқ",
    "Умумий эҳтиёж сумма": row.yearly_sum !== null ? toNumber(row.yearly_sum) : "Нарх йўқ",
    "Берилган сумма": row.given_sum !== null ? toNumber(row.given_sum) : "Нарх йўқ",
    "Қолдиқ сумма": row.remaining_sum !== null ? toNumber(row.remaining_sum) : "Нарх йўқ",
  }));

const getAdditionalNeedExportCols = () => [
  { wch: 6 },
  { wch: 10 },
  { wch: 35 },
  { wch: 14 },
  { wch: 28 },
  { wch: 18 },
  { wch: 18 },
  { wch: 12 },
  { wch: 14 },
  { wch: 18 },
  { wch: 18 },
  { wch: 18 },
  { wch: 24 },
  { wch: 18 },
  { wch: 22 },
  { wch: 16 },
  { wch: 22 },
  { wch: 18 },
  { wch: 18 },
];

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

const DETAIL_COLUMN_GROUPS = [
  {
    title: "Асосий",
    columns: [
      { key: "year", label: "Йил", required: true, compact: true, standard: true, nowrap: true },
      { key: "institution_name", label: "Муассаса", required: true, compact: true, standard: true, wrap: true },
      { key: "institution_inn", label: "ИНН", compact: false, standard: true, nowrap: true },
      { key: "drug_name", label: "Дори", required: true, compact: true, standard: true, wrap: true },
    ],
  },
  {
    title: "Эҳтиёж",
    columns: [
      { key: "base_yearly_need", label: "Йил бошидаги эҳтиёж", compact: true, standard: true, nowrap: true },
      { key: "additional_need", label: "Қўшимча эҳтиёж", compact: true, standard: true, nowrap: true },
      { key: "additional_need_percent", label: "Қўшимча %", compact: false, standard: true, nowrap: true },
      { key: "addition_count", label: "Қўшимча сони", compact: false, standard: true, nowrap: true },
      { key: "total_yearly_need", label: "Умумий эҳтиёж", required: true, compact: true, standard: true, nowrap: true },
      { key: "total_quarterly_need", label: "Умумий чораклик эҳтиёж", compact: false, standard: false, nowrap: true },
      { key: "total_amb_rec_need", label: "Амбулатор рецепт бўйича эҳтиёж", compact: false, standard: false, nowrap: true },
      { key: "total_dpm_need", label: "ДПМ бўйича эҳтиёж", compact: false, standard: false, nowrap: true },
    ],
  },
  {
    title: "Берилган / қолдиқ",
    columns: [
      { key: "total_given_dpm", label: "Берилган миқдор", compact: true, standard: true, nowrap: true },
      { key: "total_remaining", label: "Қолдиқ", compact: true, standard: true, nowrap: true },
    ],
  },
  {
    title: "Суммалар",
    columns: [
      { key: "price_value", label: "Нарх", compact: false, standard: false, nowrap: true },
      { key: "yearly_sum", label: "Умумий эҳтиёж сумма", compact: false, standard: false, nowrap: true },
      { key: "given_sum", label: "Берилган сумма", compact: false, standard: false, nowrap: true },
      { key: "remaining_sum", label: "Қолдиқ сумма", compact: false, standard: false, nowrap: true },
    ],
  },
];

const DRUG_TOTAL_COLUMN_GROUPS = [
  {
    title: "Асосий",
    columns: [
      { key: "drug_name", label: "Дори", required: true, compact: true, standard: true, wrap: true },
    ],
  },
  {
    title: "Эҳтиёж",
    columns: [
      { key: "base_yearly_need", label: "Йил бошидаги эҳтиёж", compact: true, standard: true, nowrap: true },
      { key: "additional_need", label: "Қўшимча эҳтиёж", compact: true, standard: true, nowrap: true },
      { key: "additional_need_percent", label: "Қўшимча %", compact: false, standard: true, nowrap: true },
      { key: "addition_count", label: "Қўшимча сони", compact: false, standard: true, nowrap: true },
      { key: "total_yearly_need", label: "Умумий эҳтиёж", required: true, compact: true, standard: true, nowrap: true },
      { key: "total_quarterly_need", label: "Умумий чораклик эҳтиёж", compact: false, standard: false, nowrap: true },
      { key: "total_amb_rec_need", label: "Амбулатор рецепт бўйича эҳтиёж", compact: false, standard: false, nowrap: true },
      { key: "total_dpm_need", label: "ДПМ бўйича эҳтиёж", compact: false, standard: false, nowrap: true },
    ],
  },
  {
    title: "Берилган / қолдиқ",
    columns: [
      { key: "total_given_dpm", label: "Берилган миқдор", compact: true, standard: true, nowrap: true },
      { key: "total_remaining", label: "Қолдиқ", compact: true, standard: true, nowrap: true },
    ],
  },
  {
    title: "Суммалар",
    columns: [
      { key: "price", label: "Нарх", compact: false, standard: false, nowrap: true },
      { key: "yearly_sum", label: "Умумий эҳтиёж сумма", compact: false, standard: false, nowrap: true },
      { key: "given_sum", label: "Берилган сумма", compact: false, standard: false, nowrap: true },
      { key: "remaining_sum", label: "Қолдиқ сумма", compact: false, standard: false, nowrap: true },
    ],
  },
];

const DETAIL_COLUMNS = DETAIL_COLUMN_GROUPS.flatMap((group) =>
  group.columns.map((column) => ({ ...column, groupTitle: group.title }))
);

const DRUG_TOTAL_COLUMNS = DRUG_TOTAL_COLUMN_GROUPS.flatMap((group) =>
  group.columns.map((column) => ({ ...column, groupTitle: group.title }))
);

const getColumnKeysByPreset = (columns, preset) => {
  if (preset === "all") return columns.map((column) => column.key);

  return columns
    .filter((column) => column.required || column[preset])
    .map((column) => column.key);
};

const normalizeVisibleColumns = (columns, rawKeys, fallbackPreset = "standard") => {
  const available = new Set(columns.map((column) => column.key));
  const required = columns
    .filter((column) => column.required)
    .map((column) => column.key);

  const fallback = getColumnKeysByPreset(columns, fallbackPreset);
  const selected = Array.isArray(rawKeys)
    ? rawKeys.filter((key) => available.has(key))
    : fallback;

  return [...new Set([...required, ...selected])];
};

const readVisibleColumns = (storageKey, columns, fallbackPreset = "standard") => {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
    return normalizeVisibleColumns(columns, saved, fallbackPreset);
  } catch {
    return normalizeVisibleColumns(columns, null, fallbackPreset);
  }
};

const renderColumnChooser = ({
  title,
  columns,
  groups,
  visibleKeys,
  onChange,
  storageKey,
  compactCountLabel,
  isOpen,
  onToggle,
}) => {
  const visibleSet = new Set(visibleKeys);

  const applyKeys = (keys) => {
    const normalized = normalizeVisibleColumns(columns, keys);
    onChange(normalized);
    localStorage.setItem(storageKey, JSON.stringify(normalized));
  };

  const toggleKey = (key) => {
    const column = columns.find((item) => item.key === key);
    if (!column || column.required) return;

    if (visibleSet.has(key)) {
      applyKeys(visibleKeys.filter((item) => item !== key));
    } else {
      applyKeys([...visibleKeys, key]);
    }
  };

  return (
    <div className="summary-column-panel form-card" style={{ marginTop: "16px", marginBottom: "12px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h3 style={{ margin: "0 0 4px" }}>{title}</h3>
          <p style={{ margin: 0, color: "#475569" }}>
            Доим керак бўлмайдиган устунларни яшириб қўйиш мумкин. Танлов браузерда сақланади.
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button type="button" onClick={onToggle}>
            {isOpen ? "Устунларни яшириш" : compactCountLabel} ({visibleKeys.length} / {columns.length})
          </button>
          <button type="button" onClick={() => applyKeys(getColumnKeysByPreset(columns, "compact"))}>
            Ихчам
          </button>
          <button type="button" onClick={() => applyKeys(getColumnKeysByPreset(columns, "standard"))}>
            Стандарт
          </button>
          <button type="button" onClick={() => applyKeys(getColumnKeysByPreset(columns, "all"))}>
            Ҳаммаси
          </button>
        </div>
      </div>

      {isOpen ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: "10px",
            marginTop: "12px",
          }}
        >
          {groups.map((group) => (
            <div
              key={group.title}
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: "10px",
                padding: "10px",
                background: "#ffffff",
              }}
            >
              <strong>{group.title}</strong>
              <div style={{ marginTop: "8px", display: "grid", gap: "6px" }}>
                {group.columns.map((column) => (
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
                      checked={visibleSet.has(column.key)}
                      disabled={column.required}
                      onChange={() => toggleKey(column.key)}
                    />
                    {column.label}
                    {column.required ? " (мажбурий)" : ""}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default function NeedRowsSummaryPage() {
  const [needRowsSummaryMainTablePage, setNeedRowsSummaryMainTablePage] = useState(1);
  const [needRowsSummaryMainTablePageSize, setNeedRowsSummaryMainTablePageSize] = useState(100);

  const canViewNeedRowsSummary = canViewPage("need_rows_summary");
  const canExportNeedRowsSummary = canDo("need_rows_summary", "export");
  const canPrintNeedRowsSummary = canDo("need_rows_summary", "print");

  const [rows, setRows] = useState([]);
  const [years, setYears] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [drugs, setDrugs] = useState([]);

  const [error, setError] = useState("");
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(true);

  const [searchText, setSearchText] = useState("");
  const [filterInn, setFilterInn] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedInstitution, setSelectedInstitution] = useState("");
  const [selectedDrug, setSelectedDrug] = useState("");

  const [visibleDetailColumns, setVisibleDetailColumns] = useState(() =>
    readVisibleColumns("need_rows_summary_detail_columns_v2", DETAIL_COLUMNS, "standard")
  );
  const [visibleDrugColumns, setVisibleDrugColumns] = useState(() =>
    readVisibleColumns("need_rows_summary_drug_columns_v2", DRUG_TOTAL_COLUMNS, "standard")
  );

  const [isDetailColumnChooserOpen, setIsDetailColumnChooserOpen] = useState(false);
  const [isDrugColumnChooserOpen, setIsDrugColumnChooserOpen] = useState(false);

  const loadFilters = useCallback(async () => {
    try {
      setLoadingFilters(true);
      setError("");

      const [needRowsRes, institutionsRes, drugsRes] = await Promise.allSettled([
        api.get("/need-rows/"),
        api.get("/institutions/"),
        api.get("/drugs/"),
      ]);

      const needRows =
        needRowsRes.status === "fulfilled" ? toArray(needRowsRes.value.data) : [];

      const yearList = [...new Set(needRows.map((item) => item.year))]
        .filter(Boolean)
        .sort((a, b) => Number(a) - Number(b));

      setYears(yearList);

      setInstitutions(
        institutionsRes.status === "fulfilled"
          ? toArray(institutionsRes.value.data)
          : []
      );

      setDrugs(
        drugsRes.status === "fulfilled"
          ? toArray(drugsRes.value.data)
          : []
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingFilters(false);
    }
  }, []);

  const loadSummary = useCallback(async () => {
    try {
      setLoadingSummary(true);
      setError("");

      const params = {};
      if (searchText.trim()) params.search = searchText.trim();
      if (filterInn.trim()) params.institution_inn = filterInn.trim();
      if (selectedYear) params.year = selectedYear;
      if (selectedInstitution) params.institution = selectedInstitution;
      if (selectedDrug) params.drug = selectedDrug;

      const res = await api.get("/need-rows-summary/", { params });
      setRows(toArray(res.data));
    } catch (e) {
      console.error(e);
      setError(extractError(e, "Сводкани юклашда хатолик юз берди."));
    } finally {
      setLoadingSummary(false);
    }
  }, [searchText, filterInn, selectedYear, selectedInstitution, selectedDrug]);

  useEffect(() => {
    loadFilters();
  }, [loadFilters]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const rowsWithMoney = useMemo(() => {
    return rows.map((row) => {
      const pickValue = (...values) =>
        values.find(
          (value) => value !== null && value !== undefined && value !== ""
        );

      const additionalNeedRaw = pickValue(
        row.total_additional_need,
        row.additional_need,
        row.additional_yearly_need,
        row.additional_need_qty,
        row.additional_qty
      );

      const additionalNeed = toNumber(additionalNeedRaw ?? 0);

      const totalNeedRaw = pickValue(
        row.total_need,
        row.total_need_qty,
        row.need_total
      );

      const baseNeedRaw = pickValue(
        row.base_yearly_need,
        row.base_need,
        row.initial_yearly_need,
        row.initial_need,
        row.yearly_need,
        row.total_yearly_need,
        row.need_qty
      );

      const baseFallback =
        totalNeedRaw !== undefined
          ? Math.max(toNumber(totalNeedRaw) - additionalNeed, 0)
          : 0;

      const baseYearlyNeed = toNumber(
        baseNeedRaw !== undefined ? baseNeedRaw : baseFallback
      );

      const yearlyNeed = toNumber(
        totalNeedRaw !== undefined
          ? totalNeedRaw
          : baseYearlyNeed + additionalNeed
      );

      const additionalNeedPercentRaw = pickValue(
        row.additional_need_percent,
        row.additional_percent
      );

      const additionalNeedPercent =
        additionalNeedPercentRaw !== undefined
          ? toNumber(additionalNeedPercentRaw)
          : baseYearlyNeed > 0
          ? (additionalNeed / baseYearlyNeed) * 100
          : 0;

      const additionCount = toNumber(
        pickValue(
          row.addition_count,
          row.additional_count,
          row.additions_count,
          0
        )
      );

      const givenQty = toNumber(
        pickValue(row.total_given_dpm, row.given_qty, row.issued_qty, 0)
      );

      const remainingQty = toNumber(
        pickValue(row.total_remaining, row.remaining_qty, yearlyNeed - givenQty)
      );

      const ambNeed = toNumber(
        pickValue(row.total_amb_rec_need, row.amb_rec_need, 0)
      );

      const dpmNeed = toNumber(
        pickValue(row.total_dpm_need, row.dpm_need, 0)
      );

      const quarterlyNeed = yearlyNeed / 4;

      const priceRaw = pickValue(row.price_value, row.price);

      const priceValue =
        priceRaw !== undefined && priceRaw !== "MULTI"
          ? toNumber(priceRaw)
          : null;

      const totalNeedSumRaw = pickValue(row.total_need_sum, row.total_yearly_sum);

      const yearlySum =
        totalNeedSumRaw !== undefined
          ? toNumber(totalNeedSumRaw)
          : priceValue !== null
          ? yearlyNeed * priceValue
          : pickValue(row.yearly_sum) !== undefined && additionalNeed === 0
          ? toNumber(row.yearly_sum)
          : null;

      const givenSum =
        pickValue(row.given_sum) !== undefined
          ? toNumber(row.given_sum)
          : priceValue !== null
          ? givenQty * priceValue
          : null;

      const remainingSum =
        pickValue(row.remaining_sum) !== undefined
          ? toNumber(row.remaining_sum)
          : priceValue !== null
          ? remainingQty * priceValue
          : null;

      return {
        ...row,
        institution_inn: row.institution_inn || "",
        base_yearly_need: baseYearlyNeed,
        additional_need: additionalNeed,
        additional_need_percent: additionalNeedPercent,
        addition_count: additionCount,
        total_yearly_need: yearlyNeed,
        total_given_dpm: givenQty,
        total_remaining: remainingQty,
        total_amb_rec_need: ambNeed,
        total_dpm_need: dpmNeed,
        total_quarterly_need: quarterlyNeed,
        price_value: priceValue,
        yearly_sum: yearlySum,
        given_sum: givenSum,
        remaining_sum: remainingSum,
      };
    });
  }, [rows]);

  const summaryStats = useMemo(() => {
    let totalYearlySum = 0;
    let totalGivenSum = 0;
    let totalRemainingSum = 0;
    let hasMoney = false;

    rowsWithMoney.forEach((row) => {
      if (row.yearly_sum !== null) {
        totalYearlySum += toNumber(row.yearly_sum);
        hasMoney = true;
      }
      if (row.given_sum !== null) {
        totalGivenSum += toNumber(row.given_sum);
      }
      if (row.remaining_sum !== null) {
        totalRemainingSum += toNumber(row.remaining_sum);
      }
    });

    return {
      rowsCount: rowsWithMoney.length,
      totalYearlySum: hasMoney ? totalYearlySum : null,
      totalGivenSum: hasMoney ? totalGivenSum : null,
      totalRemainingSum: hasMoney ? totalRemainingSum : null,
    };
  }, [rowsWithMoney]);

  const drugTotals = useMemo(() => {
    const map = {};

    rowsWithMoney.forEach((row) => {
      const key = row.drug_name || "Номаълум дори";

      if (!map[key]) {
        map[key] = {
          drug_name: key,
          base_yearly_need: 0,
          additional_need: 0,
          addition_count: 0,
          total_yearly_need: 0,
          total_given_dpm: 0,
          total_remaining: 0,
          total_amb_rec_need: 0,
          total_dpm_need: 0,
          total_quarterly_need: 0,
          yearly_sum: 0,
          given_sum: 0,
          remaining_sum: 0,
          prices_set: new Set(),
          hasAnyPrice: false,
        };
      }

      map[key].base_yearly_need += toNumber(row.base_yearly_need);
      map[key].additional_need += toNumber(row.additional_need);
      map[key].addition_count += toNumber(row.addition_count);
      map[key].total_yearly_need += toNumber(row.total_yearly_need);
      map[key].total_given_dpm += toNumber(row.total_given_dpm);
      map[key].total_remaining += toNumber(row.total_remaining);
      map[key].total_amb_rec_need += toNumber(row.total_amb_rec_need);
      map[key].total_dpm_need += toNumber(row.total_dpm_need);
      map[key].total_quarterly_need += toNumber(row.total_quarterly_need);

      if (row.yearly_sum !== null) map[key].yearly_sum += toNumber(row.yearly_sum);
      if (row.given_sum !== null) map[key].given_sum += toNumber(row.given_sum);
      if (row.remaining_sum !== null) {
        map[key].remaining_sum += toNumber(row.remaining_sum);
      }

      if (row.price_value !== null) {
        map[key].hasAnyPrice = true;
        map[key].prices_set.add(String(row.price_value));
      }
    });

    return Object.values(map)
      .map((item) => {
        let priceDisplay = null;

        if (!item.hasAnyPrice) {
          priceDisplay = null;
        } else if (item.prices_set.size === 1) {
          priceDisplay = Number([...item.prices_set][0]);
        } else {
          priceDisplay = "MULTI";
        }

        return {
          drug_name: item.drug_name,
          base_yearly_need: item.base_yearly_need,
          additional_need: item.additional_need,
          additional_need_percent:
            item.base_yearly_need > 0
              ? (item.additional_need / item.base_yearly_need) * 100
              : 0,
          addition_count: item.addition_count,
          total_yearly_need: item.total_yearly_need,
          total_given_dpm: item.total_given_dpm,
          total_remaining: item.total_remaining,
          total_amb_rec_need: item.total_amb_rec_need,
          total_dpm_need: item.total_dpm_need,
          total_quarterly_need: item.total_quarterly_need,
          price: priceDisplay,
          yearly_sum: item.hasAnyPrice ? item.yearly_sum : null,
          given_sum: item.hasAnyPrice ? item.given_sum : null,
          remaining_sum: item.hasAnyPrice ? item.remaining_sum : null,
        };
      })
      .sort((a, b) => a.drug_name.localeCompare(b.drug_name));
  }, [rowsWithMoney]);

  const additionalNeedRows = useMemo(() => {
    return rowsWithMoney
      .filter((row) => toNumber(row.additional_need) > 0)
      .sort((a, b) => {
        const percentDiff = toNumber(b.additional_need_percent) - toNumber(a.additional_need_percent);
        if (percentDiff !== 0) return percentDiff;
        return toNumber(b.additional_need) - toNumber(a.additional_need);
      });
  }, [rowsWithMoney]);

  const clearFilters = () => {
    setSearchText("");
    setFilterInn("");
    setSelectedYear("");
    setSelectedInstitution("");
    setSelectedDrug("");
  };


  const getDetailCellValue = (row, key) => {
    switch (key) {
      case "year":
        return row.year;
      case "institution_name":
        return row.institution_name;
      case "institution_inn":
        return row.institution_inn || "—";
      case "drug_name":
        return row.drug_name;
      case "base_yearly_need":
        return formatNumber(row.base_yearly_need);
      case "additional_need":
        return formatNumber(row.additional_need);
      case "additional_need_percent":
        return formatPercent(row.additional_need_percent);
      case "addition_count":
        return formatNumber(row.addition_count);
      case "total_yearly_need":
        return formatNumber(row.total_yearly_need);
      case "total_given_dpm":
        return formatNumber(row.total_given_dpm);
      case "total_remaining":
        return formatNumber(row.total_remaining);
      case "total_amb_rec_need":
        return formatNumber(row.total_amb_rec_need);
      case "total_dpm_need":
        return formatNumber(row.total_dpm_need);
      case "total_quarterly_need":
        return formatNumber(row.total_quarterly_need);
      case "price_value":
        return formatMoney(row.price_value);
      case "yearly_sum":
        return formatMoney(row.yearly_sum);
      case "given_sum":
        return formatMoney(row.given_sum);
      case "remaining_sum":
        return formatMoney(row.remaining_sum);
      default:
        return "";
    }
  };

  const getDrugCellValue = (row, key) => {
    switch (key) {
      case "drug_name":
        return row.drug_name;
      case "base_yearly_need":
        return formatNumber(row.base_yearly_need);
      case "additional_need":
        return formatNumber(row.additional_need);
      case "additional_need_percent":
        return formatPercent(row.additional_need_percent);
      case "addition_count":
        return formatNumber(row.addition_count);
      case "total_yearly_need":
        return formatNumber(row.total_yearly_need);
      case "total_given_dpm":
        return formatNumber(row.total_given_dpm);
      case "total_remaining":
        return formatNumber(row.total_remaining);
      case "total_amb_rec_need":
        return formatNumber(row.total_amb_rec_need);
      case "total_dpm_need":
        return formatNumber(row.total_dpm_need);
      case "total_quarterly_need":
        return formatNumber(row.total_quarterly_need);
      case "price":
        return formatMoney(row.price);
      case "yearly_sum":
        return formatMoney(row.yearly_sum);
      case "given_sum":
        return formatMoney(row.given_sum);
      case "remaining_sum":
        return formatMoney(row.remaining_sum);
      default:
        return "";
    }
  };

  const visibleDetailColumnDefs = DETAIL_COLUMNS.filter((column) =>
    visibleDetailColumns.includes(column.key)
  );

  const visibleDrugColumnDefs = DRUG_TOTAL_COLUMNS.filter((column) =>
    visibleDrugColumns.includes(column.key)
  );

  const exportToExcel = () => {
    const detailsSheetData = rowsWithMoney.map((row) => ({
      "Йил": row.year,
      "Муассаса": row.institution_name,
      "ИНН": row.institution_inn || "",
      "Дори": row.drug_name,
      "Йил бошидаги эҳтиёж": toNumber(row.base_yearly_need),
      "Қўшимча эҳтиёж": toNumber(row.additional_need),
      "Қўшимча %": toNumber(row.additional_need_percent),
      "Қўшимча сони": toNumber(row.addition_count),
      "Умумий эҳтиёж": toNumber(row.total_yearly_need),
      "Берилган миқдор": toNumber(row.total_given_dpm),
      "Қолдиқ": toNumber(row.total_remaining),
      "Амбулатор рецепт бўйича эҳтиёж": toNumber(row.total_amb_rec_need),
      "ДПМ бўйича эҳтиёж": toNumber(row.total_dpm_need),
      "Умумий чораклик эҳтиёж": toNumber(row.total_quarterly_need),
      "Нарх": row.price_value !== null ? toNumber(row.price_value) : "Нарх йўқ",
      "Умумий эҳтиёж сумма": row.yearly_sum !== null ? toNumber(row.yearly_sum) : "Нарх йўқ",
      "Берилган сумма": row.given_sum !== null ? toNumber(row.given_sum) : "Нарх йўқ",
      "Қолдиқ сумма": row.remaining_sum !== null ? toNumber(row.remaining_sum) : "Нарх йўқ",
    }));

    const drugTotalsSheetData = drugTotals.map((row) => ({
      "Дори": row.drug_name,
      "Йил бошидаги эҳтиёж": toNumber(row.base_yearly_need),
      "Қўшимча эҳтиёж": toNumber(row.additional_need),
      "Қўшимча %": toNumber(row.additional_need_percent),
      "Қўшимча сони": toNumber(row.addition_count),
      "Умумий эҳтиёж": toNumber(row.total_yearly_need),
      "Берилган миқдор": toNumber(row.total_given_dpm),
      "Қолдиқ": toNumber(row.total_remaining),
      "Амбулатор рецепт бўйича эҳтиёж": toNumber(row.total_amb_rec_need),
      "ДПМ бўйича эҳтиёж": toNumber(row.total_dpm_need),
      "Умумий чораклик эҳтиёж": toNumber(row.total_quarterly_need),
      "Нарх":
        row.price === null
          ? "Нарх йўқ"
          : row.price === "MULTI"
          ? "Турли нархлар"
          : toNumber(row.price),
      "Умумий эҳтиёж сумма": row.yearly_sum !== null ? toNumber(row.yearly_sum) : "Нарх йўқ",
      "Берилган сумма": row.given_sum !== null ? toNumber(row.given_sum) : "Нарх йўқ",
      "Қолдиқ сумма": row.remaining_sum !== null ? toNumber(row.remaining_sum) : "Нарх йўқ",
    }));

    const additionalNeedSheetData = buildAdditionalNeedExportRows(additionalNeedRows);

    const metaSheetData = [
      { "Кўрсаткич": "Жами қаторлар", "Қиймат": summaryStats.rowsCount },
      { "Кўрсаткич": "Эҳтиёж ошган қаторлар", "Қиймат": additionalNeedRows.length },
      {
        "Кўрсаткич": "Жами қўшимча эҳтиёж",
        "Қиймат": additionalNeedRows.reduce(
          (sum, row) => sum + toNumber(row.additional_need),
          0
        ),
      },
      {
        "Кўрсаткич": "Жами умумий эҳтиёж сумма",
        "Қиймат":
          summaryStats.totalYearlySum !== null
            ? summaryStats.totalYearlySum
            : "Нарх йўқ",
      },
      {
        "Кўрсаткич": "Жами берилган сумма",
        "Қиймат":
          summaryStats.totalGivenSum !== null
            ? summaryStats.totalGivenSum
            : "Нарх йўқ",
      },
      {
        "Кўрсаткич": "Жами қолдиқ сумма",
        "Қиймат":
          summaryStats.totalRemainingSum !== null
            ? summaryStats.totalRemainingSum
            : "Нарх йўқ",
      },
    ];

    const detailsWs = XLSX.utils.json_to_sheet(detailsSheetData);
    const drugTotalsWs = XLSX.utils.json_to_sheet(drugTotalsSheetData);
    const metaWs = XLSX.utils.json_to_sheet(metaSheetData);
    const additionalNeedWs = XLSX.utils.json_to_sheet(additionalNeedSheetData);

    detailsWs["!cols"] = [
      { wch: 10 },
      { wch: 35 },
      { wch: 14 },
      { wch: 24 },
      { wch: 18 },
      { wch: 18 },
      { wch: 14 },
      { wch: 14 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 24 },
      { wch: 18 },
      { wch: 22 },
      { wch: 16 },
      { wch: 22 },
      { wch: 18 },
      { wch: 18 },
    ];

    drugTotalsWs["!cols"] = [
      { wch: 24 },
      { wch: 18 },
      { wch: 18 },
      { wch: 14 },
      { wch: 14 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 24 },
      { wch: 18 },
      { wch: 22 },
      { wch: 16 },
      { wch: 22 },
      { wch: 18 },
      { wch: 18 },
    ];

    metaWs["!cols"] = [
      { wch: 28 },
      { wch: 20 },
    ];

    additionalNeedWs["!cols"] = getAdditionalNeedExportCols();

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, detailsWs, "Svodka");
    XLSX.utils.book_append_sheet(workbook, drugTotalsWs, "Dori_jami");
    XLSX.utils.book_append_sheet(workbook, additionalNeedWs, "Ehtiyoj_oshganlar");
    XLSX.utils.book_append_sheet(workbook, metaWs, "Jami");

    const parts = ["NeedRowsSummary"];
    if (searchText.trim()) parts.push(`search_${searchText.trim()}`);
    if (filterInn.trim()) parts.push(`inn_${filterInn.trim()}`);
    if (selectedYear) parts.push(`year_${selectedYear}`);
    if (selectedInstitution) parts.push(`inst_${selectedInstitution}`);
    if (selectedDrug) parts.push(`drug_${selectedDrug}`);

    XLSX.writeFile(workbook, `${parts.join("_")}.xlsx`);
  };

  const exportAdditionalNeedToExcel = () => {
    const sheetData = buildAdditionalNeedExportRows(additionalNeedRows);

    if (sheetData.length === 0) {
      setError("Эҳтиёж ошган қаторлар топилмади.");
      return;
    }

    const metaSheetData = [
      { "Кўрсаткич": "Эҳтиёж ошган қаторлар", "Қиймат": additionalNeedRows.length },
      {
        "Кўрсаткич": "Жами қўшимча эҳтиёж",
        "Қиймат": additionalNeedRows.reduce(
          (sum, row) => sum + toNumber(row.additional_need),
          0
        ),
      },
      {
        "Кўрсаткич": "Жами умумий эҳтиёж",
        "Қиймат": additionalNeedRows.reduce(
          (sum, row) => sum + toNumber(row.total_yearly_need),
          0
        ),
      },
      {
        "Кўрсаткич": "Жами берилган",
        "Қиймат": additionalNeedRows.reduce(
          (sum, row) => sum + toNumber(row.total_given_dpm),
          0
        ),
      },
      {
        "Кўрсаткич": "Жами қолдиқ",
        "Қиймат": additionalNeedRows.reduce(
          (sum, row) => sum + toNumber(row.total_remaining),
          0
        ),
      },
    ];

    const workbook = XLSX.utils.book_new();
    const sheetWs = XLSX.utils.json_to_sheet(sheetData);
    const metaWs = XLSX.utils.json_to_sheet(metaSheetData);

    sheetWs["!cols"] = getAdditionalNeedExportCols();
    metaWs["!cols"] = [{ wch: 28 }, { wch: 20 }];

    XLSX.utils.book_append_sheet(workbook, sheetWs, "Ehtiyoj_oshganlar");
    XLSX.utils.book_append_sheet(workbook, metaWs, "Jami");

    const parts = ["Ehtiyoj_oshganlar"];
    if (searchText.trim()) parts.push(`search_${searchText.trim()}`);
    if (filterInn.trim()) parts.push(`inn_${filterInn.trim()}`);
    if (selectedYear) parts.push(`year_${selectedYear}`);
    if (selectedInstitution) parts.push(`inst_${selectedInstitution}`);
    if (selectedDrug) parts.push(`drug_${selectedDrug}`);

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

      .filters-row,
      .summary-column-panel,
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

      h2,
      h3 {
        margin-top: 8px !important;
        margin-bottom: 6px !important;
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
    minWidth: "160px",
    maxWidth: "280px",
  };

  const nowrapCell = {
    ...compactCell,
    whiteSpace: "nowrap",
  };
  const isLoading = loadingFilters || loadingSummary;

    if (!canViewNeedRowsSummary) {
      return (
        <div className="page-container">
          Сизда ушбу саҳифани кўриш ҳуқуқи йўқ.
        </div>
      );
    }

  // --- needRowsSummaryMain_TABLE_PAGINATION_V1 ---
  const needRowsSummaryMainPageSizeNumber = Number(needRowsSummaryMainTablePageSize) || 100;
  const needRowsSummaryMainRows = Array.isArray(rowsWithMoney) ? rowsWithMoney : [];
  const needRowsSummaryMainTotalPages = Math.max(1, Math.ceil(needRowsSummaryMainRows.length / needRowsSummaryMainPageSizeNumber));
  const needRowsSummaryMainSafePage = Math.min(needRowsSummaryMainTablePage, needRowsSummaryMainTotalPages);
  const needRowsSummaryMainStartIndex = (needRowsSummaryMainSafePage - 1) * needRowsSummaryMainPageSizeNumber;
  const needRowsSummaryMainEndIndex = Math.min(needRowsSummaryMainRows.length, needRowsSummaryMainStartIndex + needRowsSummaryMainPageSizeNumber);
  const needRowsSummaryMainPagedRows = needRowsSummaryMainRows.slice(needRowsSummaryMainStartIndex, needRowsSummaryMainEndIndex);
  const renderNeedRowsSummaryMainPager = () => (
    <div className="table-pagination-bar">
      <div className="table-pagination-info">
        <strong>Эҳтиёжлар сводкаси</strong>
        <span>
          {needRowsSummaryMainRows.length
            ? ` ${needRowsSummaryMainStartIndex + 1}-${needRowsSummaryMainEndIndex} / ${needRowsSummaryMainRows.length}`
            : " 0 / 0"}
        </span>
      </div>
      <div className="table-pagination-actions">
        <span>Қатор:</span>
        <select
          className="table-page-size-select"
          value={needRowsSummaryMainTablePageSize}
          onChange={(event) => {
            setNeedRowsSummaryMainTablePageSize(Number(event.target.value));
            setNeedRowsSummaryMainTablePage(1);
          }}
        >
          {[50, 100, 250, 500, 1000].map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => setNeedRowsSummaryMainTablePage(1)} disabled={needRowsSummaryMainSafePage <= 1}>
          Биринчи
        </button>
        <button
          type="button"
          onClick={() => setNeedRowsSummaryMainTablePage(Math.max(1, needRowsSummaryMainSafePage - 1))}
          disabled={needRowsSummaryMainSafePage <= 1}
        >
          Олдинги
        </button>
        <span className="table-pagination-page">
          {needRowsSummaryMainSafePage} / {needRowsSummaryMainTotalPages}
        </span>
        <button
          type="button"
          onClick={() => setNeedRowsSummaryMainTablePage(Math.min(needRowsSummaryMainTotalPages, needRowsSummaryMainSafePage + 1))}
          disabled={needRowsSummaryMainSafePage >= needRowsSummaryMainTotalPages}
        >
          Кейинги
        </button>
        <button
          type="button"
          onClick={() => setNeedRowsSummaryMainTablePage(needRowsSummaryMainTotalPages)}
          disabled={needRowsSummaryMainSafePage >= needRowsSummaryMainTotalPages}
        >
          Охирги
        </button>
      </div>
    </div>
  );


  return (
    <div className="page-container">
      <style>{printStyles}</style>

      <h2>Эҳтиёжлар сводкаси</h2>

      {error ? <p style={{ color: "#dc2626" }}>{error}</p> : null}

      <div className="form-card" style={{ marginBottom: "16px" }}>
        <div className="stats-row">
          <div className="stat-card">
            <div>Жами қаторлар</div>
            <div>{summaryStats.rowsCount}</div>
          </div>
          <div className="stat-card">
            <div>Жами умумий эҳтиёж сумма</div>
            <div>{formatMoney(summaryStats.totalYearlySum)}</div>
          </div>
          <div className="stat-card">
            <div>Жами берилган сумма</div>
            <div>{formatMoney(summaryStats.totalGivenSum)}</div>
          </div>
          <div className="stat-card">
            <div>Жами қолдиқ сумма</div>
            <div>{formatMoney(summaryStats.totalRemainingSum)}</div>
          </div>
        </div>
      </div>

      <div className="filters-row">

        <input
          type="text"
          placeholder="Қидириш: муассаса, ИНН ёки дори"
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
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          disabled={loadingFilters}
        >
          <option value="">Барча йиллар</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>

        <select
          value={selectedInstitution}
          onChange={(e) => setSelectedInstitution(e.target.value)}
          disabled={loadingFilters}
        >
          <option value="">Барча муассасалар</option>
          {institutions.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
              {item.inn ? ` (${item.inn})` : ""}
            </option>
          ))}
        </select>

        <select
          value={selectedDrug}
          onChange={(e) => setSelectedDrug(e.target.value)}
          disabled={loadingFilters}
        >
          <option value="">Барча дорилар</option>
          {drugs.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>

        <button type="button" onClick={clearFilters}>
          Тозалаш
        </button>

        <button type="button" onClick={loadSummary}>
          Янгилаш
        </button>

        {canExportNeedRowsSummary ? (
          <button type="button" onClick={exportToExcel}>
            Excel юклаб олиш
          </button>
        ) : null}

        {canExportNeedRowsSummary ? (
          <button
            type="button"
            onClick={exportAdditionalNeedToExcel}
            disabled={additionalNeedRows.length === 0}
          >
            Эҳтиёж ошган Excel ({additionalNeedRows.length})
          </button>
        ) : null}

        {canPrintNeedRowsSummary ? (
          <button type="button" onClick={handlePrint}>
            Чоп этиш
          </button>
        ) : null}
      </div>

      {renderColumnChooser({
        title: "Муассаса ва дори сводкаси устунлари",
        columns: DETAIL_COLUMNS,
        groups: DETAIL_COLUMN_GROUPS,
        visibleKeys: visibleDetailColumns,
        onChange: setVisibleDetailColumns,
        storageKey: "need_rows_summary_detail_columns_v2",
        compactCountLabel: "Устунлар",
        isOpen: isDetailColumnChooserOpen,
        onToggle: () => setIsDetailColumnChooserOpen((value) => !value),
      })}

              {renderNeedRowsSummaryMainPager()}
<div className="table-wrap" style={{ overflowX: "auto" }}>
        <h3>Муассаса ва дори кесимида сводка</h3>
        <table
          className="grid-table"
          style={{
            width: "max-content",
            minWidth: `${Math.max(visibleDetailColumnDefs.length * 115, 950)}px`,
            tableLayout: "auto",
          }}
        >
          <thead>
            <tr>
              {visibleDetailColumnDefs.map((column) => (
                <th key={column.key} style={compactHeaderCell}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!isLoading && rowsWithMoney.length > 0 ? (
              needRowsSummaryMainPagedRows.map((row, index) => (
                <tr key={`${row.year}-${row.institution_name}-${row.drug_name}-${index}`}>
                  {visibleDetailColumnDefs.map((column) => (
                    <td key={column.key} style={column.wrap ? wrapCell : nowrapCell}>
                      {getDetailCellValue(row, column.key)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={visibleDetailColumnDefs.length || 1} style={compactCell}>
                  {isLoading ? "Юкланмоқда..." : "Маълумот топилмади"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {renderColumnChooser({
        title: "Дори кесимида жами устунлари",
        columns: DRUG_TOTAL_COLUMNS,
        groups: DRUG_TOTAL_COLUMN_GROUPS,
        visibleKeys: visibleDrugColumns,
        onChange: setVisibleDrugColumns,
        storageKey: "need_rows_summary_drug_columns_v2",
        compactCountLabel: "Устунлар",
        isOpen: isDrugColumnChooserOpen,
        onToggle: () => setIsDrugColumnChooserOpen((value) => !value),
      })}

      <div className="table-wrap" style={{ marginTop: "24px", overflowX: "auto" }}>
        <h3>Дори кесимида жами</h3>
        <table
          className="grid-table"
          style={{
            width: "max-content",
            minWidth: `${Math.max(visibleDrugColumnDefs.length * 115, 850)}px`,
            tableLayout: "auto",
          }}
        >
          <thead>
            <tr>
              {visibleDrugColumnDefs.map((column) => (
                <th key={column.key} style={compactHeaderCell}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!isLoading && drugTotals.length > 0 ? (
              drugTotals.map((row, index) => (
                <tr key={`${row.drug_name}-${index}`}>
                  {visibleDrugColumnDefs.map((column) => (
                    <td key={column.key} style={column.wrap ? wrapCell : nowrapCell}>
                      {getDrugCellValue(row, column.key)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={visibleDrugColumnDefs.length || 1} style={compactCell}>
                  {isLoading ? "Юкланмоқда..." : "Маълумот топилмади"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}