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

const fmtPercent = (value) => {
  return toNumber(value).toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

const normalizeStatusLabel = (status) => {
  if (status === "Эҳтиёждан ошган") return "Эҳтиёждан ошган";
  if (status === "Критик") return "Критик";
  if (status === "Паст") return "Паст";
  if (status === "Огоҳлантириш") return "Огоҳлантириш";
  if (status === "Норма") return "Норма";
  return "";
};

const getStatusLabel = (x) => {
  const yearlyNeed = toNumber(x.yearly_need);
  const givenQty = toNumber(x.given_qty);
  const remainingQty = toNumber(x.remaining_qty);
  const percent = toNumber(x.remaining_percent);

  if (yearlyNeed <= 0) return "Номаълум";
  if (remainingQty < 0 || givenQty > yearlyNeed) return "Эҳтиёждан ошган";
  if (percent < 20) return "Критик";
  if (percent < 30) return "Паст";
  if (percent < 50) return "Огоҳлантириш";
  return "Норма";
};

const getStatusStyle = (x) => {
  const status = getStatusLabel(x);

  if (status === "Эҳтиёждан ошган") {
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

  if (status === "Эҳтиёждан ошган") {
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

export default function StockSummaryPage() {
  const canViewStockSummary = canViewPage("stock_summary");
  const canExportStockSummary = canDo("stock_summary", "export");
  const canPrintStockSummary = canDo("stock_summary", "print");

  const canManageStockSummary =
    canExportStockSummary || canPrintStockSummary;


  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [searchText, setSearchText] = useState("");
  const [filterInstitution, setFilterInstitution] = useState("");
  const [filterDrug, setFilterDrug] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const normalizeRow = (x, index) => {
    const yearlyNeed = toNumber(x.yearly_need);
    const givenQty = toNumber(x.issued_qty);

    const remainingQty =
      x.remaining_qty !== undefined && x.remaining_qty !== null
        ? toNumber(x.remaining_qty)
        : yearlyNeed - givenQty;

    const remainingPercent =
      x.remaining_percent !== undefined && x.remaining_percent !== null
        ? toNumber(x.remaining_percent)
        : yearlyNeed > 0
        ? (remainingQty / yearlyNeed) * 100
        : 0;

    return {
      id:
        x.id ??
        `${x.institution_name || "inst"}-${x.drug_name || "drug"}-${x.year || "year"}-${index}`,
      institution_name: x.institution_name ?? "",
      drug_name: x.drug_name ?? "",
      year: x.year ?? "",
      yearly_need: yearlyNeed,
      given_qty: givenQty,
      remaining_qty: remainingQty,
      remaining_percent: remainingPercent,
      status: normalizeStatusLabel(x.status),
    };
  };

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

    return items
      .filter((x) => {
        const byInstitution = filterInstitution
          ? x.institution_name === filterInstitution
          : true;

        const byDrug = filterDrug ? x.drug_name === filterDrug : true;
        const byYear = filterYear ? String(x.year) === String(filterYear) : true;
        const byStatus = filterStatus ? getStatusLabel(x) === filterStatus : true;

        const text = `${x.institution_name} ${x.drug_name} ${x.year}`.toLowerCase();
        const bySearch = q ? text.includes(q) : true;

        return byInstitution && byDrug && byYear && byStatus && bySearch;
      })
      .sort((a, b) => {
        if (Number(a.year) !== Number(b.year)) return Number(b.year) - Number(a.year);
        if (String(a.institution_name) !== String(b.institution_name)) {
          return String(a.institution_name).localeCompare(String(b.institution_name));
        }
        return String(a.drug_name).localeCompare(String(b.drug_name));
      });
  }, [items, searchText, filterInstitution, filterDrug, filterYear, filterStatus]);

  const stats = useMemo(() => {
    return {
      totalCount: filteredItems.length,
      overNeedCount: filteredItems.filter(
        (x) => getStatusLabel(x) === "Эҳтиёждан ошган"
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
    setFilterDrug("");
    setFilterYear("");
    setFilterStatus("");
  };

  const exportToExcel = () => {
    const detailSheetData = filteredItems.map((x) => ({
      "Муассаса": x.institution_name,
      "Дори": x.drug_name,
      "Йил": x.year,
      "Йиллик эҳтиёж": toNumber(x.yearly_need),
      "Берилган миқдор": toNumber(x.given_qty),
      "Қолдиқ": toNumber(x.remaining_qty),
      "Қолдиқ %": toNumber(x.remaining_percent),
      "Статус": getStatusLabel(x),
    }));

    const statsSheetData = [
      { "Кўрсаткич": "Жами", "Қиймат": stats.totalCount },
      { "Кўрсаткич": "Эҳтиёждан ошган", "Қиймат": stats.overNeedCount },
      { "Кўрсаткич": "Критик", "Қиймат": stats.criticalCount },
      { "Кўрсаткич": "Паст", "Қиймат": stats.lowCount },
      { "Кўрсаткич": "Огоҳлантириш", "Қиймат": stats.warningCount },
      { "Кўрсаткич": "Норма", "Қиймат": stats.normalCount },
    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(detailSheetData),
      "StockSummary"
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(statsSheetData),
      "Jami"
    );

    const parts = ["StockSummary"];
    if (filterYear) parts.push(`year_${filterYear}`);
    if (filterInstitution) parts.push(`inst_${filterInstitution}`);
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

  if (!canViewStockSummary) {
    return <div className="page-container">Сизда ушбу саҳифани кўриш ҳуқуқи йўқ.</div>;
  }

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
            <div>Эҳтиёждан ошган</div>
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
            <option value="Эҳтиёждан ошган">Эҳтиёждан ошган</option>
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

          {canPrintStockSummary ? (
            <button type="button" onClick={handlePrint}>
              Чоп этиш
            </button>
          ) : null}
        </div>
      </div>

      <div className="table-wrap">
        <table
          className="grid-table"
          style={{
            width: "100%",
            tableLayout: "auto",
          }}
        >
          <thead>
            <tr>
              <th style={compactHeaderCell}>Муассаса</th>
              <th style={compactHeaderCell}>Дори</th>
              <th style={compactHeaderCell}>Йил</th>
              <th style={compactHeaderCell}>Йиллик эҳтиёж</th>
              <th style={compactHeaderCell}>Берилган миқдор</th>
              <th style={compactHeaderCell}>Қолдиқ</th>
              <th style={compactHeaderCell}>Қолдиқ %</th>
              <th style={compactHeaderCell}>Статус</th>
            </tr>
          </thead>
          <tbody>
            {!loading && filteredItems.length > 0 ? (
              filteredItems.map((x) => (
                <tr key={x.id} style={getRowStyle(x)}>
                  <td style={wrapCell}>{x.institution_name}</td>
                  <td style={wrapCell}>{x.drug_name}</td>
                  <td style={nowrapCell}>{x.year}</td>
                  <td style={nowrapCell}>{fmt(x.yearly_need)}</td>
                  <td style={nowrapCell}>{fmt(x.given_qty)}</td>
                  <td style={nowrapCell}>{fmt(x.remaining_qty)}</td>
                  <td style={nowrapCell}>{fmtPercent(x.remaining_percent)}%</td>
                  <td style={nowrapCell}>
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
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" style={compactCell}>
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
