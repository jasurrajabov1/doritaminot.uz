import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import api from "../api/client";
import { canDo, canViewPage } from "../utils/permission";

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function firstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null) return value;
  }
  return null;
}

function formatNumber(value) {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function normalizeStatus(status) {
  if (status === "Эҳтиёждан ошган") return "Эҳтиёждан ошган";
  if (status === "Критик") return "Критик";
  if (status === "Паст") return "Паст";
  if (status === "Огоҳлантириш") return "Огоҳлантириш";
  return "Норма";
}

function getStatusMeta(status) {
  const normalized = normalizeStatus(status);

  if (normalized === "Эҳтиёждан ошган") {
    return {
      bg: "#7f1d1d",
      color: "#ffffff",
      text: "Эҳтиёждан ошган",
    };
  }

  if (normalized === "Критик") {
    return {
      bg: "#dc2626",
      color: "#ffffff",
      text: "Критик",
    };
  }

  if (normalized === "Паст") {
    return {
      bg: "#fecaca",
      color: "#7f1d1d",
      text: "Паст",
    };
  }

  if (normalized === "Огоҳлантириш") {
    return {
      bg: "#fef3c7",
      color: "#92400e",
      text: "Огоҳлантириш",
    };
  }

  return {
    bg: "#dcfce7",
    color: "#166534",
    text: "Норма",
  };
}

function DashboardCard({ title, value, hint, onClick }) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
      style={styles.card}
    >
      <div style={styles.cardTitle}>{title}</div>
      <div style={styles.cardValue}>{value}</div>
      <div style={styles.cardHint}>{hint}</div>
    </div>
  );
}

function normalizeInstitutionChart(items) {
  if (!Array.isArray(items)) return [];

  return items.map((row, index) => ({
    id: row?.id ?? index,
    name: firstDefined(row?.name, row?.institution_name, ""),
    yearly_need: toNumber(row?.yearly_need),
    issued: toNumber(row?.issued),
    remaining: toNumber(row?.remaining),
  }));
}

function normalizeTopCritical(items) {
  if (!Array.isArray(items)) return [];

  return items.map((row, index) => ({
    id: row?.id ?? index,
    institution: firstDefined(row?.institution, ""),
    drug: firstDefined(row?.drug, ""),
    year: firstDefined(row?.year, ""),
    yearly_need: toNumber(row?.yearly_need),
    issued_qty: toNumber(row?.issued_qty),
    remaining_qty: toNumber(row?.remaining_qty),
    remaining_percent: toNumber(row?.remaining_percent),
    status: normalizeStatus(row?.status),
  }));
}

export default function DashboardPage() {
  const navigate = useNavigate();

  const canViewStockSummary = canViewPage("stock_summary");
  const canViewNeedRows = canViewPage("need_rows");
  const canExportDashboard = canDo("dashboard", "export");
  const canPrintDashboard = canDo("dashboard", "print");

  const canManageDashboard = canExportDashboard || canPrintDashboard;


  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedYear, setSelectedYear] = useState("");
  const [selectedInstitution, setSelectedInstitution] = useState("");

  const [years, setYears] = useState([]);
  const [institutions, setInstitutions] = useState([]);

  const [cards, setCards] = useState({
    institutions: 0,
    drugs: 0,
    need_rows: 0,
    issued_rows: 0,
    critical_positions: 0,
    over_need: 0,
  });

  const [institutionChart, setInstitutionChart] = useState([]);
  const [topCriticalDrugs, setTopCriticalDrugs] = useState([]);

  const compactHeaderCell = {
    padding: "6px 6px",
    fontSize: "12px",
    lineHeight: "1.15",
    verticalAlign: "top",
    whiteSpace: "normal",
    wordBreak: "break-word",
    overflowWrap: "anywhere",
    textAlign: "left",
    background: "#f1f5f9",
    color: "#334155",
    borderBottom: "1px solid #cbd5e1",
  };

  const compactCell = {
    padding: "6px 6px",
    fontSize: "12px",
    verticalAlign: "top",
    lineHeight: "1.15",
    color: "#0f172a",
    borderBottom: "1px solid #e2e8f0",
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

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = {};
      if (selectedYear) params.year = selectedYear;
      if (selectedInstitution) params.institution = selectedInstitution;

      const res = await api.get("/dashboard-summary/", { params });
      const data = res.data || {};
      const serverCards = data?.cards || {};

      setCards({
        institutions: toNumber(serverCards.institutions),
        drugs: toNumber(serverCards.drugs),
        need_rows: toNumber(serverCards.need_rows),
        issued_rows: toNumber(serverCards.issued_rows),
        critical_positions: toNumber(serverCards.critical_positions),
        over_need: toNumber(serverCards.over_need),
      });

      setInstitutionChart(
        normalizeInstitutionChart(firstDefined(data?.institution_chart, []))
      );

      setTopCriticalDrugs(
        normalizeTopCritical(firstDefined(data?.top_critical_drugs, []))
      );

      setYears(Array.isArray(data?.filters?.years) ? data.filters.years : []);
      setInstitutions(
        Array.isArray(data?.filters?.institutions) ? data.filters.institutions : []
      );
    } catch (err) {
      console.error(err);
      setError("Dashboard маълумотларини олишда хатолик бўлди.");
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedInstitution]);

  useEffect(() => {
    load();
  }, [load]);

  const dashboardCards = useMemo(() => {
    const items = [
      {
        title: "Муассасалар",
        value: formatNumber(cards.institutions),
        hint: "Маълумотнома",
        path: "/institutions",
        visible: canViewPage("institutions"),
      },
      {
        title: "Дорилар",
        value: formatNumber(cards.drugs),
        hint: "Маълумотнома",
        path: "/drugs",
        visible: canViewPage("drugs"),
      },
      {
        title: "Эҳтиёж қаторлари",
        value: formatNumber(cards.need_rows),
        hint: "Муассаса + дори + йил",
        path: "/need-rows",
        visible: canViewPage("need_rows"),
      },
      {
        title: "Берилган миқдор қаторлари",
        value: formatNumber(cards.issued_rows),
        hint: "Жами берилган",
        path: "/monthly-issues",
        visible: canViewPage("monthly_issues"),
      },
      {
        title: "Критик позициялар",
        value: formatNumber(cards.critical_positions),
        hint: "Назорат талаб қилади",
        path: "/stock-summary",
        visible: canViewPage("stock_summary"),
      },
      {
        title: "Эҳтиёждан ошган",
        value: formatNumber(cards.over_need),
        hint: "Шошилинч текшириш",
        path: "/stock-summary",
        visible: canViewPage("stock_summary"),
      },
    ];

    return items.filter((item) => item.visible);
  }, [cards]);

  const exportToExcel = () => {
    const cardsSheet = [
      { "Кўрсаткич": "Муассасалар", "Қиймат": cards.institutions },
      { "Кўрсаткич": "Дорилар", "Қиймат": cards.drugs },
      { "Кўрсаткич": "Эҳтиёж қаторлари", "Қиймат": cards.need_rows },
      { "Кўрсаткич": "Берилган миқдор қаторлари", "Қиймат": cards.issued_rows },
      { "Кўрсаткич": "Критик позициялар", "Қиймат": cards.critical_positions },
      { "Кўрсаткич": "Эҳтиёждан ошган", "Қиймат": cards.over_need },
    ];

    const institutionSheet = institutionChart.map((row) => ({
      "Муассаса": row.name,
      "Жами йиллик эҳтиёж": row.yearly_need,
      "Жами берилган": row.issued,
      "Қолдиқ": row.remaining,
    }));

    const criticalSheet = topCriticalDrugs.map((row, index) => ({
      "№": index + 1,
      "Муассаса": row.institution,
      "Дори": row.drug,
      "Йил": row.year,
      "Эҳтиёж": row.yearly_need,
      "Берилган": row.issued_qty,
      "Қолдиқ": row.remaining_qty,
      "Қолдиқ %": row.remaining_percent,
      "Статус": row.status,
    }));

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(cardsSheet),
      "Dashboard"
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(institutionSheet),
      "Muassasa_jami"
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(criticalSheet),
      "Top_critical"
    );

    const parts = ["DashboardSummary"];
    if (selectedYear) parts.push(`year_${selectedYear}`);
    if (selectedInstitution) parts.push(`inst_${selectedInstitution}`);

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

      .dashboard-page {
        padding: 0 !important;
        margin: 0 !important;
        background: #ffffff !important;
      }

      nav,
      button,
      .app-nav,
      .menu-link,
      .top-nav,
      .header,
      .navbar {
        display: none !important;
      }

      .dashboard-print-hide {
        display: none !important;
      }

      .dashboard-panel,
      .dashboard-table-wrap,
      .dashboard-grid {
        box-shadow: none !important;
        border: 1px solid #d1d5db !important;
        page-break-inside: avoid;
      }

      .dashboard-table {
        width: 100% !important;
        border-collapse: collapse !important;
        min-width: 100% !important;
        font-size: 10px !important;
        table-layout: fixed !important;
      }

      .dashboard-table th,
      .dashboard-table td {
        border: 1px solid #999 !important;
        padding: 4px !important;
        white-space: normal !important;
        word-break: break-word !important;
        overflow-wrap: anywhere !important;
      }

      h1,
      h2,
      h3 {
        margin-top: 0 !important;
        margin-bottom: 8px !important;
      }
    }
  `;

  return (
    <div style={styles.page} className="dashboard-page">
      <style>{printStyles}</style>

      <div style={styles.header} className="dashboard-print-hide">
        <div>
          <h1 style={styles.title}>Бош саҳифа</h1>
          <p style={styles.subtitle}>
            Эҳтиёж, берилган миқдор ва қолдиқлар бўйича умумий назорат панели
          </p>
        </div>

        <div style={styles.headerButtons}>
          <button style={styles.secondaryButton} onClick={load}>
            Янгилаш
          </button>

          {canExportDashboard ? (
            <button style={styles.secondaryButton} onClick={exportToExcel}>
              Excel юклаб олиш
            </button>
          ) : null}

          {canPrintDashboard ? (
            <button style={styles.secondaryButton} onClick={handlePrint}>
              Чоп этиш
            </button>
          ) : null}

          {canViewNeedRows ? (
            <button
              style={styles.primaryButton}
              onClick={() => navigate("/need-rows")}
            >
              Эҳтиёжга ўтиш
            </button>
          ) : null}
        </div>
      </div>

      {!canManageDashboard ? (
        <div style={styles.infoBox}>
          Сизда ушбу саҳифада фақат кўриш ҳуқуқи бор.
        </div>
      ) : null}

      {error ? <div style={styles.errorBox}>{error}</div> : null}

      <div style={styles.panel} className="dashboard-panel dashboard-print-hide">
        <div style={styles.panelTitle}>Фильтр</div>

        <div style={styles.filterRow}>
          <select
            style={styles.filterControl}
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            <option value="">Барча йиллар</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          <select
            style={styles.filterControl}
            value={selectedInstitution}
            onChange={(e) => setSelectedInstitution(e.target.value)}
          >
            <option value="">Барча муассасалар</option>
            {institutions.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.name}
              </option>
            ))}
          </select>
          <button
            style={styles.smallButton}
            onClick={() => {
              setSelectedYear("");
              setSelectedInstitution("");
            }}
          >
            Тозалаш
          </button>
        </div>
      </div>

      {loading ? (
        <div style={styles.loadingBox}>Юкланмоқда...</div>
      ) : (
        <>
          <div style={styles.grid} className="dashboard-grid">
            {dashboardCards.map((card) => (
              <DashboardCard
                key={card.title}
                title={card.title}
                value={card.value}
                hint={card.hint}
                onClick={() => navigate(card.path)}
              />
            ))}
          </div>

          <div style={styles.panel} className="dashboard-panel">
            <div style={styles.tableHeader}>
              <div style={styles.panelTitle}>Муассаса бўйича умумий ҳолат</div>
            </div>

            {institutionChart.length === 0 ? (
              <div style={styles.emptyBox}>Маълумот йўқ</div>
            ) : (
              <div style={styles.tableWrap} className="dashboard-table-wrap">
                <table
                  style={{ ...styles.table, minWidth: 0, tableLayout: "auto" }}
                  className="dashboard-table"
                >
                  <thead>
                    <tr>
                      <th style={compactHeaderCell}>Муассаса</th>
                      <th style={compactHeaderCell}>Жами йиллик эҳтиёж</th>
                      <th style={compactHeaderCell}>Жами берилган</th>
                      <th style={compactHeaderCell}>Қолдиқ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {institutionChart.map((row) => (
                      <tr key={row.id} style={styles.tr}>
                        <td style={wrapCell}>{row.name}</td>
                        <td style={nowrapCell}>{formatNumber(row.yearly_need)}</td>
                        <td style={nowrapCell}>{formatNumber(row.issued)}</td>
                        <td style={nowrapCell}>{formatNumber(row.remaining)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div style={styles.panel} className="dashboard-panel">
            <div style={styles.tableHeader}>
              <div style={styles.panelTitle}>Энг критик 10 та позиция</div>
              {canViewStockSummary ? (
                <button
                  style={styles.secondaryButton}
                  className="dashboard-print-hide"
                  onClick={() => navigate("/stock-summary")}
                >
                  Тўлиқ рўйхат
                </button>
              ) : null}
            </div>

            {topCriticalDrugs.length === 0 ? (
              <div style={styles.emptyBox}>Критик позициялар ҳозирча йўқ.</div>
            ) : (
              <div style={styles.tableWrap} className="dashboard-table-wrap">
                <table
                  style={{ ...styles.table, minWidth: 0, tableLayout: "auto" }}
                  className="dashboard-table"
                >
                  <thead>
                    <tr>
                      <th style={compactHeaderCell}>№</th>
                      <th style={compactHeaderCell}>Муассаса</th>
                      <th style={compactHeaderCell}>Дори</th>
                      <th style={compactHeaderCell}>Йил</th>
                      <th style={compactHeaderCell}>Эҳтиёж</th>
                      <th style={compactHeaderCell}>Берилган</th>
                      <th style={compactHeaderCell}>Қолдиқ</th>
                      <th style={compactHeaderCell}>Қолдиқ %</th>
                      <th style={compactHeaderCell}>Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCriticalDrugs.map((row, index) => {
                      const statusMeta = getStatusMeta(row.status);

                      return (
                        <tr
                          key={`${row.institution}-${row.drug}-${row.year}-${index}`}
                          style={styles.tr}
                        >
                          <td style={nowrapCell}>{index + 1}</td>
                          <td style={wrapCell}>{row.institution}</td>
                          <td style={wrapCell}>{row.drug}</td>
                          <td style={nowrapCell}>{row.year}</td>
                          <td style={nowrapCell}>{formatNumber(row.yearly_need)}</td>
                          <td style={nowrapCell}>{formatNumber(row.issued_qty)}</td>
                          <td style={nowrapCell}>{formatNumber(row.remaining_qty)}</td>
                          <td style={nowrapCell}>{formatNumber(row.remaining_percent)}%</td>
                          <td style={nowrapCell}>
                            <span
                              style={{
                                ...styles.badge,
                                backgroundColor: statusMeta.bg,
                                color: statusMeta.color,
                              }}
                            >
                              {statusMeta.text}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  page: {
    padding: "20px",
    background: "#f8fafc",
    minHeight: "100vh",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    flexWrap: "wrap",
    marginBottom: "20px",
  },
  title: {
    margin: 0,
    fontSize: "28px",
    color: "#0f172a",
  },
  subtitle: {
    margin: "8px 0 0 0",
    color: "#475569",
    fontSize: "14px",
  },
  headerButtons: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
  },
  primaryButton: {
    border: "none",
    background: "#2563eb",
    color: "#fff",
    padding: "6px 9px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "12px",
    lineHeight: 1.1,
  },

  secondaryButton: {
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#0f172a",
    padding: "6px 9px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "12px",
    lineHeight: 1.1,
  },

  smallButton: {
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#0f172a",
    padding: "5px 8px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "11px",
    lineHeight: 1.1,
  },
  loadingBox: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "24px",
    color: "#334155",
  },
  errorBox: {
    background: "#fee2e2",
    color: "#991b1b",
    border: "1px solid #fecaca",
    borderRadius: "12px",
    padding: "14px 16px",
    marginBottom: "16px",
  },
  infoBox: {
    background: "#f8fafc",
    color: "#475569",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "14px 16px",
    marginBottom: "16px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: "6px",
    marginBottom: "10px",
  },

  card: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "7px 8px",
    cursor: "pointer",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  },

  cardTitle: {
    fontSize: "11px",
    color: "#475569",
    marginBottom: "2px",
  },

  cardValue: {
    fontSize: "18px",
    color: "#0f172a",
    lineHeight: 1.05,
    marginBottom: "1px",
  },

  cardHint: {
    fontSize: "10px",
    color: "#64748b",
    lineHeight: 1.05,
  },

  panel: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "10px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    marginBottom: "12px",
  },

  panelTitle: {
    fontSize: "14px",
    color: "#0f172a",
    marginBottom: "6px",
  },

  filterRow: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
  },

  filterControl: {
    height: "34px",
    padding: "5px 8px",
    fontSize: "12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#0f172a",
    minWidth: "140px",
  },
  tableHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    marginBottom: "10px",
  },
  tableWrap: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  tr: {
    borderBottom: "1px solid #e2e8f0",
  },
  badge: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    whiteSpace: "nowrap",
  },
  emptyBox: {
    padding: "18px",
    borderRadius: "12px",
    background: "#f8fafc",
    color: "#475569",
    border: "1px dashed #cbd5e1",
  },
};
