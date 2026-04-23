import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { canDo, canViewPage } from "../utils/permission";

function toArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function parseNumber(value) {
  const normalized = String(value ?? "")
    .replace(/\s+/g, "")
    .replace(",", ".");

  const num = Number(normalized);
  return Number.isFinite(num) ? num : 0;
}

function fmtQty(value) {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 3,
  }).format(Number(value || 0));
}

function getErrorMessage(error, fallback) {
  const data = error?.response?.data;

  if (!data) return fallback;
  if (typeof data === "string") return data;

  if (Array.isArray(data)) {
    return data[0] || fallback;
  }

  if (typeof data === "object") {
    if (Array.isArray(data.non_field_errors) && data.non_field_errors.length > 0) {
      return data.non_field_errors[0];
    }

    const firstField = Object.keys(data)[0];

    if (firstField && Array.isArray(data[firstField])) {
      return `${firstField}: ${data[firstField][0]}`;
    }

    if (firstField && typeof data[firstField] === "string") {
      return `${firstField}: ${data[firstField]}`;
    }
  }

  return fallback;
}

function getStatusMeta(yearlyNeed, givenQty) {
  const need = Number(yearlyNeed || 0);
  const given = Number(givenQty || 0);
  const remaining = need - given;
  const remainingPercent = need > 0 ? (remaining / need) * 100 : 0;

  if (remaining < 0 || given > need) {
    return {
      text: "Эҳтиёждан ошган",
      bg: "#7f1d1d",
      color: "#ffffff",
    };
  }

  if (remainingPercent < 20) {
    return {
      text: "Критик",
      bg: "#dc2626",
      color: "#ffffff",
    };
  }

  if (remainingPercent < 30) {
    return {
      text: "Паст",
      bg: "#fecaca",
      color: "#7f1d1d",
    };
  }

  if (remainingPercent < 50) {
    return {
      text: "Огоҳлантириш",
      bg: "#fef3c7",
      color: "#92400e",
    };
  }

  return {
    text: "Норма",
    bg: "#dcfce7",
    color: "#166534",
  };
}

export default function MonthlyIssuesPage() {
  const canViewMonthlyIssues = canViewPage("monthly_issues");
  const canAddMonthlyIssue = canDo("monthly_issues", "add");
  const canEditMonthlyIssue = canDo("monthly_issues", "edit");
  const canDeleteMonthlyIssue = canDo("monthly_issues", "delete");

  const canManageMonthlyIssues =
    canAddMonthlyIssue || canEditMonthlyIssue || canDeleteMonthlyIssue;

  const currentYear = String(new Date().getFullYear());

  const [items, setItems] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [drugs, setDrugs] = useState([]);
  const [needRows, setNeedRows] = useState([]);

  const [institutionId, setInstitutionId] = useState("");
  const [drugId, setDrugId] = useState("");
  const [year, setYear] = useState(currentYear);
  const [issuedQty, setIssuedQty] = useState("");
  const [editingId, setEditingId] = useState(null);

  const [filterInstitution, setFilterInstitution] = useState("");
  const [filterDrug, setFilterDrug] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [searchText, setSearchText] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  const isEditMode = editingId !== null;

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

  const compactNowrapHeaderCell = {
    ...compactHeaderCell,
    whiteSpace: "nowrap",
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

  const actionCellStyle = {
    ...compactCell,
    whiteSpace: "normal",
    minWidth: "160px",
  };

  const actionButtonStyle = {
    padding: "6px 10px",
    fontSize: "12px",
    lineHeight: "1.1",
    borderRadius: "8px",
  };

  const normalizeIssue = (x) => ({
    id: x.id,
    institution: x.institution ?? x.institution_id ?? "",
    institution_name: x.institution_name ?? x.institution?.name ?? "",
    drug: x.drug ?? x.drug_id ?? "",
    drug_name: x.drug_name ?? x.drug?.name ?? "",
    year: x.year ?? "",
    issued_qty: x.issued_qty ?? x.given_qty ?? 0,
  });

  const normalizeNeedRow = (x) => ({
    id: x.id,
    institution: x.institution ?? x.institution_id ?? "",
    drug: x.drug ?? x.drug_id ?? "",
    year: x.year ?? "",
    yearly_need: x.yearly_need ?? 0,
    given_dpm: x.given_dpm ?? 0,
    remaining: x.remaining ?? 0,
    remaining_percent: x.remaining_percent ?? 0,
  });

  const load = useCallback(async () => {
    try {
      const [issuesRes, institutionsRes, drugsRes, needRowsRes] = await Promise.all([
        api.get("/monthly-issues/"),
        api.get("/institutions/"),
        api.get("/drugs/"),
        api.get("/need-rows/"),
      ]);

      setItems(toArray(issuesRes.data).map(normalizeIssue));
      setInstitutions(toArray(institutionsRes.data));
      setDrugs(toArray(drugsRes.data));
      setNeedRows(toArray(needRowsRes.data).map(normalizeNeedRow));
      setError("");
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

  const institutionMap = useMemo(() => {
    const map = {};
    institutions.forEach((item) => {
      map[String(item.id)] = item.name;
    });
    return map;
  }, [institutions]);

  const drugMap = useMemo(() => {
    const map = {};
    drugs.forEach((item) => {
      map[String(item.id)] = item.name;
    });
    return map;
  }, [drugs]);

  const yearOptions = useMemo(() => {
    const values = new Set();

    items.forEach((item) => {
      if (item.year) values.add(String(item.year));
    });

    needRows.forEach((row) => {
      if (row.year) values.add(String(row.year));
    });

    if (year) values.add(String(year));
    values.add(currentYear);

    return [...values].sort((a, b) => Number(b) - Number(a));
  }, [items, needRows, year, currentYear]);

  const resetForm = () => {
    setInstitutionId("");
    setDrugId("");
    setYear(currentYear);
    setIssuedQty("");
    setEditingId(null);
    setError("");
  };

  const startEdit = (item) => {
    setError("");
    setSuccess("");
    setEditingId(item.id);
    setInstitutionId(String(item.institution ?? ""));
    setDrugId(String(item.drug ?? ""));
    setYear(String(item.year ?? currentYear));
    setIssuedQty(String(item.issued_qty ?? ""));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const selectedNeedRow = useMemo(() => {
    if (!institutionId || !drugId || !year) return null;

    return (
      needRows.find(
        (row) =>
          String(row.institution) === String(institutionId) &&
          String(row.drug) === String(drugId) &&
          String(row.year) === String(year)
      ) || null
    );
  }, [needRows, institutionId, drugId, year]);

  const currentSavedIssue = useMemo(() => {
    if (!institutionId || !drugId || !year) return null;

    return (
      items.find(
        (item) =>
          String(item.institution) === String(institutionId) &&
          String(item.drug) === String(drugId) &&
          String(item.year) === String(year)
      ) || null
    );
  }, [items, institutionId, drugId, year]);

  const preview = useMemo(() => {
    const inputQty = parseNumber(issuedQty);
    const needQty = Number(selectedNeedRow?.yearly_need || 0);
    const existingQty = Number(currentSavedIssue?.issued_qty || 0);

    let newTotal = inputQty;

    if (!isEditMode) {
      newTotal = existingQty + inputQty;
    }

    const remainingAfter = needQty - newTotal;
    const remainingPercentAfter = needQty > 0 ? (remainingAfter / needQty) * 100 : 0;

    return {
      inputQty,
      needQty,
      existingQty,
      newTotal,
      remainingAfter,
      remainingPercentAfter,
    };
  }, [issuedQty, selectedNeedRow, currentSavedIssue, isEditMode]);

  const validate = () => {
    if (!institutionId) {
      setError("Муассаса танланиши шарт.");
      return false;
    }

    if (!drugId) {
      setError("Дори танланиши шарт.");
      return false;
    }

    if (!year) {
      setError("Йил мажбурий.");
      return false;
    }

    if (String(issuedQty).trim() === "") {
      setError("Берилган миқдор мажбурий.");
      return false;
    }

    if (parseNumber(issuedQty) <= 0) {
      setError("Берилган миқдор 0 дан катта бўлиши керак.");
      return false;
    }

    if (!selectedNeedRow) {
      setError("Аввал шу муассаса, дори ва йил учун Эҳтиёж қатори киритилиши керак.");
      return false;
    }

    return true;
  };

  const buildPayload = () => ({
    institution: Number(institutionId),
    drug: Number(drugId),
    year: Number(year),
    issued_qty: parseNumber(issuedQty),
  });

  const handleAdd = async () => {
    try {
      setError("");
      setSuccess("");

      if (!validate()) return;

      const alreadyExists = items.some(
        (item) =>
          String(item.institution) === String(institutionId) &&
          String(item.drug) === String(drugId) &&
          String(item.year) === String(year)
      );

      await api.post("/monthly-issues/", buildPayload());

      resetForm();
      await load();
      setSuccess(
        alreadyExists
          ? "Миқдор мавжуд жамига қўшилди."
          : "Жами берилган миқдор сақланди."
      );
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

      if (!validate()) return;

      await api.patch(`/monthly-issues/${editingId}/`, buildPayload());

      resetForm();
      await load();
      setSuccess("Жами берилган миқдор янгиланди.");
    } catch (e) {
      console.error(e);
      setError(getErrorMessage(e, "Сақлашда хато бўлди."));
    }
  };

  const handleDelete = async (id) => {
    const ok = window.confirm("Ростдан ҳам ўчирмоқчимисиз?");
    if (!ok) return;

    try {
      setError("");
      setSuccess("");
      await api.delete(`/monthly-issues/${id}/`);
      setItems((prev) => prev.filter((x) => Number(x.id) !== Number(id)));

      if (Number(editingId) === Number(id)) {
        resetForm();
      }

      setSuccess("Ёзув ўчирилди.");
    } catch (e) {
      console.error(e);
      setError(getErrorMessage(e, "Ўчиришда хато бўлди."));
    }
  };

  const getInstitutionName = useCallback(
    (item) => {
      if (item.institution_name) return item.institution_name;
      return institutionMap[String(item.institution)] || "";
    },
    [institutionMap]
  );

  const getDrugName = useCallback(
    (item) => {
      if (item.drug_name) return item.drug_name;
      return drugMap[String(item.drug)] || "";
    },
    [drugMap]
  );

  const filteredItems = useMemo(() => {
    const q = searchText.trim().toLowerCase();

    return items
      .filter((item) => {
        const byInstitution = filterInstitution
          ? String(item.institution) === String(filterInstitution)
          : true;

        const byDrug = filterDrug
          ? String(item.drug) === String(filterDrug)
          : true;

        const byYear = filterYear ? String(item.year) === String(filterYear) : true;

        const text = `${getInstitutionName(item)} ${getDrugName(item)} ${item.year}`.toLowerCase();
        const bySearch = q ? text.includes(q) : true;

        return byInstitution && byDrug && byYear && bySearch;
      })
      .sort((a, b) => {
        if (Number(a.year) !== Number(b.year)) {
          return Number(b.year) - Number(a.year);
        }

        const instA = getInstitutionName(a);
        const instB = getInstitutionName(b);
        if (instA !== instB) {
          return instA.localeCompare(instB);
        }

        const drugA = getDrugName(a);
        const drugB = getDrugName(b);
        return drugA.localeCompare(drugB);
      });
  }, [
    items,
    filterInstitution,
    filterDrug,
    filterYear,
    searchText,
    getInstitutionName,
    getDrugName,
  ]);

  const rowsForTable = useMemo(() => {
    return filteredItems.map((item) => {
      const matchedNeedRow = needRows.find(
        (row) =>
          String(row.institution) === String(item.institution) &&
          String(row.drug) === String(item.drug) &&
          String(row.year) === String(item.year)
      );

      const yearlyNeed = Number(matchedNeedRow?.yearly_need || 0);
      const givenQty = Number(item.issued_qty || 0);
      const remainingQty = yearlyNeed - givenQty;
      const remainingPercent = yearlyNeed > 0 ? (remainingQty / yearlyNeed) * 100 : 0;
      const status = getStatusMeta(yearlyNeed, givenQty);

      return {
        ...item,
        yearlyNeed,
        remainingQty,
        remainingPercent,
        status,
      };
    });
  }, [filteredItems, needRows]);

  if (!canViewMonthlyIssues) {
    return <div className="page-container">Сизда ушбу саҳифани кўриш ҳуқуқи йўқ.</div>;
  }

  return (
    <div className="page-container">
      <h2>Берилган миқдор</h2>
      <p style={{ marginTop: -8, color: "#475569" }}>
        Бу саҳифа операция журнали эмас. Бу ерда муассаса + дори + йил бўйича жами
        берилган миқдор юритилади.
      </p>

      {!canManageMonthlyIssues ? (
        <p style={{ color: "#475569" }}>Сизда ушбу саҳифада фақат кўриш ҳуқуқи бор.</p>
      ) : null}

      {error ? <p style={{ color: "#dc2626" }}>{error}</p> : null}
      {success ? <p style={{ color: "#166534" }}>{success}</p> : null}

      {canManageMonthlyIssues ? (
        <div className="form-card">
          <div className="form-row">
            <select value={institutionId} onChange={(e) => setInstitutionId(e.target.value)}>
              <option value="">Муассасани танланг</option>
              {institutions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>

            <select value={drugId} onChange={(e) => setDrugId(e.target.value)}>
              <option value="">Дорини танланг</option>
              {drugs.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>

            <select value={year} onChange={(e) => setYear(e.target.value)}>
              {yearOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <input
              placeholder="Қўшиладиган миқдор"
              value={issuedQty}
              onChange={(e) => setIssuedQty(e.target.value)}
            />

            {!isEditMode ? (
              canAddMonthlyIssue ? (
                <button className="primary" type="button" onClick={handleAdd}>
                  Жамига қўшиш
                </button>
              ) : null
            ) : (
              <>
                {canEditMonthlyIssue ? (
                  <button className="primary" type="button" onClick={handleSave}>
                    Жами миқдорни сақлаш
                  </button>
                ) : null}
                <button type="button" onClick={resetForm}>
                  Бекор қилиш
                </button>
              </>
            )}
          </div>

          <div className="stats-row" style={{ marginTop: 12 }}>
            <div className="stat-card">
              <div>Йиллик эҳтиёж</div>
              <div>{fmtQty(preview.needQty)}</div>
            </div>
            <div className="stat-card">
              <div>Ҳозирги жами берилган</div>
              <div>{fmtQty(preview.existingQty)}</div>
            </div>
            <div className="stat-card">
              <div>{isEditMode ? "Янги жами берилган" : "Қўшилгандан кейин жами"}</div>
              <div>{fmtQty(preview.newTotal)}</div>
            </div>
            <div className="stat-card">
              <div>Қолдиқ</div>
              <div>{fmtQty(preview.remainingAfter)}</div>
            </div>
            <div className="stat-card">
              <div>Қолдиқ %</div>
              <div>{fmtQty(preview.remainingPercentAfter)}</div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="form-card" style={{ marginTop: 16 }}>
        <div className="filter-row">
          <select
            value={filterInstitution}
            onChange={(e) => setFilterInstitution(e.target.value)}
          >
            <option value="">Барча муассасалар</option>
            {institutions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>

          <select value={filterDrug} onChange={(e) => setFilterDrug(e.target.value)}>
            <option value="">Барча дорилар</option>
            {drugs.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>

          <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
            <option value="">Барча йиллар</option>
            {yearOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <input
            placeholder="Қидириш: муассаса ёки дори"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />

          <button
            type="button"
            onClick={() => {
              setFilterInstitution("");
              setFilterDrug("");
              setFilterYear("");
              setSearchText("");
            }}
          >
            Тозалаш
          </button>
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
              <th style={compactNowrapHeaderCell}>ИД</th>
              <th style={compactHeaderCell}>Муассаса</th>
              <th style={compactHeaderCell}>Дори</th>
              <th style={compactNowrapHeaderCell}>Йил</th>
              <th style={compactHeaderCell}>Йиллик эҳтиёж</th>
              <th style={compactHeaderCell}>Жами берилган</th>
              <th style={compactHeaderCell}>Қолдиқ</th>
              <th style={compactHeaderCell}>Қолдиқ %</th>
              <th style={compactHeaderCell}>Статус</th>
              {canManageMonthlyIssues ? <th style={compactHeaderCell}>Амал</th> : null}
            </tr>
          </thead>
          <tbody>
            {!loading && rowsForTable.length > 0 ? (
              rowsForTable.map((item) => (
                <tr key={item.id}>
                  <td style={nowrapCell}>{item.id}</td>
                  <td style={wrapCell}>{getInstitutionName(item)}</td>
                  <td style={wrapCell}>{getDrugName(item)}</td>
                  <td style={nowrapCell}>{item.year}</td>
                  <td style={nowrapCell}>{fmtQty(item.yearlyNeed)}</td>
                  <td style={nowrapCell}>{fmtQty(item.issued_qty)}</td>
                  <td style={nowrapCell}>{fmtQty(item.remainingQty)}</td>
                  <td style={nowrapCell}>{fmtQty(item.remainingPercent)}</td>
                  <td style={nowrapCell}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "4px 8px",
                        borderRadius: 999,
                        background: item.status.bg,
                        color: item.status.color,
                        fontSize: 12,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.status.text}
                    </span>
                  </td>

                  {canManageMonthlyIssues ? (
                    <td style={actionCellStyle}>
                      <div className="actions-cell" style={{ gap: "6px", flexWrap: "wrap" }}>
                        {canEditMonthlyIssue ? (
                          <button
                            type="button"
                            style={actionButtonStyle}
                            onClick={() => startEdit(item)}
                          >
                            Таҳрирлаш
                          </button>
                        ) : null}

                        {canDeleteMonthlyIssue ? (
                          <button
                            type="button"
                            style={actionButtonStyle}
                            onClick={() => handleDelete(item.id)}
                          >
                            Ўчириш
                          </button>
                        ) : null}
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={canManageMonthlyIssues ? 10 : 9} style={compactCell}>
                  Маълумот йўқ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}