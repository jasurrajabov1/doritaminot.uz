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

export default function NeedRowsSummaryPage() {
  const canViewNeedRowsSummary = canViewPage("need_rows_summary");
  const canExportNeedRowsSummary = canDo("need_rows_summary", "export");
  const canPrintNeedRowsSummary = canDo("need_rows_summary", "print");

  const canManageNeedRowsSummary =
    canExportNeedRowsSummary || canPrintNeedRowsSummary;


  const [rows, setRows] = useState([]);
  const [years, setYears] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [drugs, setDrugs] = useState([]);

  const [error, setError] = useState("");
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(true);

  const [selectedYear, setSelectedYear] = useState("");
  const [selectedInstitution, setSelectedInstitution] = useState("");
  const [selectedDrug, setSelectedDrug] = useState("");

  const loadFilters = useCallback(async () => {
    try {
      setLoadingFilters(true);
      setError("");

      const [needRowsRes, institutionsRes, drugsRes] = await Promise.all([
        api.get("/need-rows/"),
        api.get("/institutions/"),
        api.get("/drugs/"),
      ]);

      const needRows = toArray(needRowsRes.data);
      const yearList = [...new Set(needRows.map((item) => item.year))]
        .filter(Boolean)
        .sort((a, b) => Number(a) - Number(b));

      setYears(yearList);
      setInstitutions(toArray(institutionsRes.data));
      setDrugs(toArray(drugsRes.data));
    } catch (e) {
      console.error(e);
      setError(extractError(e, "Фильтрларни юклашда хатолик юз берди."));
    } finally {
      setLoadingFilters(false);
    }
  }, []);

  const loadSummary = useCallback(async () => {
    try {
      setLoadingSummary(true);
      setError("");

      const params = {};
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
  }, [selectedYear, selectedInstitution, selectedDrug]);

  useEffect(() => {
    loadFilters();
  }, [loadFilters]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const rowsWithMoney = useMemo(() => {
  return rows.map((row) => {
    const yearlyNeed = toNumber(
      row.total_yearly_need ?? row.yearly_need ?? row.need_qty ?? 0
    );
    const givenQty = toNumber(
      row.total_given_dpm ?? row.given_qty ?? row.issued_qty ?? 0
    );
    const remainingQty = toNumber(
      row.total_remaining ?? row.remaining_qty ?? 0
    );
    const ambNeed = toNumber(
      row.total_amb_rec_need ?? row.amb_rec_need ?? 0
    );
    const dpmNeed = toNumber(row.total_dpm_need ?? row.dpm_need ?? 0);
    const quarterlyNeed = toNumber(
      row.total_quarterly_need ?? row.quarterly_need ?? 0
    );

    const priceValue =
      row?.price !== null && row?.price !== undefined && row?.price !== ""
        ? toNumber(row.price)
        : null;

    const yearlySum =
      row?.yearly_sum !== null && row?.yearly_sum !== undefined
        ? toNumber(row.yearly_sum)
        : priceValue !== null
        ? yearlyNeed * priceValue
        : null;

    const givenSum =
      row?.given_sum !== null && row?.given_sum !== undefined
        ? toNumber(row.given_sum)
        : priceValue !== null
        ? givenQty * priceValue
        : null;

    const remainingSum =
      row?.remaining_sum !== null && row?.remaining_sum !== undefined
        ? toNumber(row.remaining_sum)
        : priceValue !== null
        ? remainingQty * priceValue
        : null;

    return {
      ...row,
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

  const clearFilters = () => {
    setSelectedYear("");
    setSelectedInstitution("");
    setSelectedDrug("");
  };

  const exportToExcel = () => {
    const detailsSheetData = rowsWithMoney.map((row) => ({
      "Йил": row.year,
      "Муассаса": row.institution_name,
      "Дори": row.drug_name,
      "Йиллик эҳтиёж": toNumber(row.total_yearly_need),
      "Берилган миқдор": toNumber(row.total_given_dpm),
      "Қолдиқ": toNumber(row.total_remaining),
      "Амбулатор рецепт бўйича эҳтиёж": toNumber(row.total_amb_rec_need),
      "ДПМ бўйича эҳтиёж": toNumber(row.total_dpm_need),
      "Чораклик эҳтиёж": toNumber(row.total_quarterly_need),
      "Нарх": row.price_value !== null ? toNumber(row.price_value) : "Нарх йўқ",
      "Йиллик сумма": row.yearly_sum !== null ? toNumber(row.yearly_sum) : "Нарх йўқ",
      "Берилган сумма": row.given_sum !== null ? toNumber(row.given_sum) : "Нарх йўқ",
      "Қолдиқ сумма": row.remaining_sum !== null ? toNumber(row.remaining_sum) : "Нарх йўқ",
    }));

    const drugTotalsSheetData = drugTotals.map((row) => ({
      "Дори": row.drug_name,
      "Йиллик эҳтиёж": toNumber(row.total_yearly_need),
      "Берилган миқдор": toNumber(row.total_given_dpm),
      "Қолдиқ": toNumber(row.total_remaining),
      "Амбулатор рецепт бўйича эҳтиёж": toNumber(row.total_amb_rec_need),
      "ДПМ бўйича эҳтиёж": toNumber(row.total_dpm_need),
      "Чораклик эҳтиёж": toNumber(row.total_quarterly_need),
      "Нарх":
        row.price === null
          ? "Нарх йўқ"
          : row.price === "MULTI"
          ? "Турли нархлар"
          : toNumber(row.price),
      "Йиллик сумма": row.yearly_sum !== null ? toNumber(row.yearly_sum) : "Нарх йўқ",
      "Берилган сумма": row.given_sum !== null ? toNumber(row.given_sum) : "Нарх йўқ",
      "Қолдиқ сумма": row.remaining_sum !== null ? toNumber(row.remaining_sum) : "Нарх йўқ",
    }));

    const metaSheetData = [
      { "Кўрсаткич": "Жами қаторлар", "Қиймат": summaryStats.rowsCount },
      {
        "Кўрсаткич": "Жами йиллик сумма",
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

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(detailsSheetData),
      "Svodka"
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(drugTotalsSheetData),
      "Dori_jami"
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(metaSheetData),
      "Jami"
    );

    const parts = ["NeedRowsSummary"];
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
    wordBreak: "break-word",
    overflowWrap: "anywhere",
    textAlign: "left",
  };

  const compactCell = {
    padding: "6px 6px",
    fontSize: "12px",
    verticalAlign: "top",
    lineHeight: "1.2",
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
  const isLoading = loadingFilters || loadingSummary;

    if (!canViewNeedRowsSummary) {
      return (
        <div className="page-container">
          Сизда ушбу саҳифани кўриш ҳуқуқи йўқ.
        </div>
      );
    }

  return (
    <div className="page-container">
      <style>{printStyles}</style>

      <h2>Эҳтиёжлар сводкаси</h2>

      {!canManageNeedRowsSummary ? (
        <p style={{ color: "#475569" }}>
          Сизда ушбу саҳифада фақат кўриш ҳуқуқи бор.
        </p>
      ) : null}

      {error ? <p style={{ color: "#dc2626" }}>{error}</p> : null}

      <div className="form-card" style={{ marginBottom: "16px" }}>
        <div className="stats-row">
          <div className="stat-card">
            <div>Жами қаторлар</div>
            <div>{summaryStats.rowsCount}</div>
          </div>
          <div className="stat-card">
            <div>Жами йиллик сумма</div>
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

        {canPrintNeedRowsSummary ? (
          <button type="button" onClick={handlePrint}>
            Чоп этиш
          </button>
        ) : null}
      </div>

      <div className="table-wrap">
        <h3>Муассаса ва дори кесимида сводка</h3>
        <table
          className="grid-table"
          style={{
            width: "100%",
            tableLayout: "auto",
          }}
        >
          <thead>
            <tr>
              <th style={compactHeaderCell}>Йил</th>
              <th style={compactHeaderCell}>Муассаса</th>
              <th style={compactHeaderCell}>Дори</th>
              <th style={compactHeaderCell}>Йиллик эҳтиёж</th>
              <th style={compactHeaderCell}>Берилган миқдор</th>
              <th style={compactHeaderCell}>Қолдиқ</th>
              <th style={compactHeaderCell}>Амбулатор рецепт бўйича эҳтиёж</th>
              <th style={compactHeaderCell}>ДПМ бўйича эҳтиёж</th>
              <th style={compactHeaderCell}>Чораклик эҳтиёж</th>
              <th style={compactHeaderCell}>Нарх</th>
              <th style={compactHeaderCell}>Йиллик сумма</th>
              <th style={compactHeaderCell}>Берилган сумма</th>
              <th style={compactHeaderCell}>Қолдиқ сумма</th>
            </tr>
          </thead>
          <tbody>
            {!isLoading && rowsWithMoney.length > 0 ? (
              rowsWithMoney.map((row, index) => (
                <tr
                  key={`${row.year}-${row.institution_name}-${row.drug_name}-${index}`}
                >
                  <td style={nowrapCell}>{row.year}</td>
                  <td style={wrapCell}>{row.institution_name}</td>
                  <td style={wrapCell}>{row.drug_name}</td>
                  <td style={nowrapCell}>{formatNumber(row.total_yearly_need)}</td>
                  <td style={nowrapCell}>{formatNumber(row.total_given_dpm)}</td>
                  <td style={nowrapCell}>{formatNumber(row.total_remaining)}</td>
                  <td style={nowrapCell}>{formatNumber(row.total_amb_rec_need)}</td>
                  <td style={nowrapCell}>{formatNumber(row.total_dpm_need)}</td>
                  <td style={nowrapCell}>{formatNumber(row.total_quarterly_need)}</td>
                  <td style={nowrapCell}>{formatMoney(row.price_value)}</td>
                  <td style={nowrapCell}>{formatMoney(row.yearly_sum)}</td>
                  <td style={nowrapCell}>{formatMoney(row.given_sum)}</td>
                  <td style={nowrapCell}>{formatMoney(row.remaining_sum)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="13" style={compactCell}>
                  {isLoading ? "Юкланмоқда..." : "Маълумот топилмади"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="table-wrap" style={{ marginTop: "24px" }}>
        <h3>Дори кесимида жами</h3>
        <table
          className="grid-table"
          style={{
            width: "100%",
            tableLayout: "auto",
          }}
        >
          <thead>
            <tr>
              <th style={compactHeaderCell}>Дори</th>
              <th style={compactHeaderCell}>Йиллик эҳтиёж</th>
              <th style={compactHeaderCell}>Берилган миқдор</th>
              <th style={compactHeaderCell}>Қолдиқ</th>
              <th style={compactHeaderCell}>Амбулатор рецепт бўйича эҳтиёж</th>
              <th style={compactHeaderCell}>ДПМ бўйича эҳтиёж</th>
              <th style={compactHeaderCell}>Чораклик эҳтиёж</th>
              <th style={compactHeaderCell}>Нарх</th>
              <th style={compactHeaderCell}>Йиллик сумма</th>
              <th style={compactHeaderCell}>Берилган сумма</th>
              <th style={compactHeaderCell}>Қолдиқ сумма</th>
            </tr>
          </thead>
          <tbody>
            {!isLoading && drugTotals.length > 0 ? (
              drugTotals.map((row, index) => (
                <tr key={`${row.drug_name}-${index}`}>
                  <td style={wrapCell}>{row.drug_name}</td>
                  <td style={nowrapCell}>{formatNumber(row.total_yearly_need)}</td>
                  <td style={nowrapCell}>{formatNumber(row.total_given_dpm)}</td>
                  <td style={nowrapCell}>{formatNumber(row.total_remaining)}</td>
                  <td style={nowrapCell}>{formatNumber(row.total_amb_rec_need)}</td>
                  <td style={nowrapCell}>{formatNumber(row.total_dpm_need)}</td>
                  <td style={nowrapCell}>{formatNumber(row.total_quarterly_need)}</td>
                  <td style={nowrapCell}>{formatMoney(row.price)}</td>
                  <td style={nowrapCell}>{formatMoney(row.yearly_sum)}</td>
                  <td style={nowrapCell}>{formatMoney(row.given_sum)}</td>
                  <td style={nowrapCell}>{formatMoney(row.remaining_sum)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="11" style={compactCell}>
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