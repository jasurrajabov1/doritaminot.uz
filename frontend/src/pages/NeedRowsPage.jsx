import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { canDo } from "../utils/permission";

export default function NeedRowsPage() {
  const canAddNeedRow = canDo("need_rows", "add");
  const canEditNeedRow = canDo("need_rows", "edit");
  const canDeleteNeedRow = canDo("need_rows", "delete");

  const canManageNeedRows =
    canAddNeedRow || canEditNeedRow || canDeleteNeedRow;
  
  const [rows, setRows] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [drugs, setDrugs] = useState([]);

  const [institutionId, setInstitutionId] = useState("");
  const [drugId, setDrugId] = useState("");
  const [year, setYear] = useState("2026");
  const [dpmNeed, setDpmNeed] = useState("");
  const [ambRecNeed, setAmbRecNeed] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [filterYear, setFilterYear] = useState("");
  const [filterInstitution, setFilterInstitution] = useState("");
  const [filterDrug, setFilterDrug] = useState("");
  const [searchText, setSearchText] = useState("");

  const isEditMode = editingId !== null;

  const toArray = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  };

  const parseNumber = (value) => {
    const s = String(value ?? "").trim().replaceAll(" ", "").replace(",", ".");
    if (!s) return 0;
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };

  const round3 = (num) => Math.round(num * 1000) / 1000;

  const fmtQty = (value) => {
    if (value === null || value === undefined || value === "") return "";
    const n = Number(value);
    if (!Number.isFinite(n)) return "";
    return n.toLocaleString("ru-RU", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    });
  };

  const fmtMoney = (value) => {
    if (value === null || value === undefined || value === "") {
      return "Нарх йўқ";
    }
    const n = Number(value);
    if (!Number.isFinite(n)) return "Нарх йўқ";
    return n.toLocaleString("ru-RU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const fmtPercent = (value) => {
    if (value === null || value === undefined || value === "") return "";
    const n = Number(value);
    if (!Number.isFinite(n)) return "";
    return `${n.toLocaleString("ru-RU", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}%`;
  };

  const getErrorMessage = (e, fallback) => {
    const data = e?.response?.data;

    if (typeof data === "string" && data.trim()) {
      if (data.includes("must make a unique set")) {
        return "Бу муассаса, дори ва йил учун эҳтиёж қатори аллақачон мавжуд.";
      }
      return data;
    }

    if (data?.detail) return data.detail;

    if (Array.isArray(data?.non_field_errors) && data.non_field_errors[0]) {
      const msg = data.non_field_errors[0];
      if (String(msg).includes("must make a unique set")) {
        return "Бу муассаса, дори ва йил учун эҳтиёж қатори аллақачон мавжуд.";
      }
      return msg;
    }

    const firstField =
      data && typeof data === "object" ? Object.keys(data)[0] : null;

    if (firstField && Array.isArray(data[firstField]) && data[firstField][0]) {
      const msg = `${firstField}: ${data[firstField][0]}`;
      if (msg.includes("must make a unique set")) {
        return "Бу муассаса, дори ва йил учун эҳтиёж қатори аллақачон мавжуд.";
      }
      return msg;
    }

    if (firstField && typeof data[firstField] === "string") {
      const msg = `${firstField}: ${data[firstField]}`;
      if (msg.includes("must make a unique set")) {
        return "Бу муассаса, дори ва йил учун эҳтиёж қатори аллақачон мавжуд.";
      }
      return msg;
    }

    return fallback;
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

  const normalizeRow = (x) => {
    return {
      id: x.id,
      institution: x.institution ?? x.institution_id ?? "",
      institution_name: x.institution_name ?? x.institution?.name ?? "",
      drug: x.drug ?? x.drug_id ?? "",
      drug_name: x.drug_name ?? x.drug?.name ?? "",
      year: x.year ?? "",
      yearly_need: x.yearly_need ?? 0,
      quarterly_need: x.quarterly_need ?? 0,
      dpm_need: x.dpm_need ?? 0,
      amb_rec_need: x.amb_rec_need ?? 0,
      issued_qty: x.given_dpm ?? x.issued_qty ?? x.given_qty ?? 0,
      remaining_qty: x.remaining ?? x.remaining_qty ?? x.remainder_qty ?? 0,
      yearly_sum: x.yearly_sum,
      given_sum: x.given_sum,
      remaining_sum: x.remaining_sum,
      remaining_percent: x.remaining_percent ?? 0,
    };
  };

const load = async () => {
  try {
    const [rowsRes, institutionsRes, drugsRes] = await Promise.all([
      api.get("/need-rows/"),
      api.get("/institutions/"),
      api.get("/drugs/"),
    ]);

    setRows(toArray(rowsRes.data).map(normalizeRow));
    setInstitutions(toArray(institutionsRes.data));
    setDrugs(toArray(drugsRes.data));
    setError("");
  } catch (e) {
    console.error(e);
    setError(getErrorMessage(e, "Рўйхатни юклашда хато бўлди."));
  }
};

useEffect(() => {
  let active = true;

  Promise.all([
    api.get("/need-rows/"),
    api.get("/institutions/"),
    api.get("/drugs/"),
  ])
    .then(([rowsRes, institutionsRes, drugsRes]) => {
      if (!active) return;
      setRows(toArray(rowsRes.data).map(normalizeRow));
      setInstitutions(toArray(institutionsRes.data));
      setDrugs(toArray(drugsRes.data));
      setError("");
    })
    .catch((e) => {
      console.error(e);
      if (!active) return;
      setError(getErrorMessage(e, "Рўйхатни юклашда хато бўлди."));
    });

  return () => {
    active = false;
  };
}, []);

  const hasNeedInput =
    String(dpmNeed).trim() !== "" || String(ambRecNeed).trim() !== "";

  const computedYearlyNeed = hasNeedInput
    ? round3(parseNumber(dpmNeed) + parseNumber(ambRecNeed))
    : "";

  const computedQuarterlyNeed =
    computedYearlyNeed !== "" ? round3(Number(computedYearlyNeed) / 4) : "";

  const resetForm = () => {
    setInstitutionId("");
    setDrugId("");
    setYear("2026");
    setDpmNeed("");
    setAmbRecNeed("");
    setEditingId(null);
    setError("");
  };

  const startEdit = (row) => {
    setError("");
    setSuccess("");
    setEditingId(row.id);
    setInstitutionId(String(row.institution ?? ""));
    setDrugId(String(row.drug ?? ""));
    setYear(String(row.year ?? ""));
    setDpmNeed(String(row.dpm_need ?? ""));
    setAmbRecNeed(String(row.amb_rec_need ?? ""));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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

    const yearNum = Number(year);
    if (!Number.isInteger(yearNum) || yearNum < 2000 || yearNum > 2100) {
      setError("Йил тўғри киритилиши керак.");
      return false;
    }

    const dpm = parseNumber(dpmNeed);
    const amb = parseNumber(ambRecNeed);

    if (dpm < 0) {
      setError("ДПМ бўйича эҳтиёж манфий бўлиши мумкин эмас.");
      return false;
    }

    if (amb < 0) {
      setError("Амбулатор рецепт бўйича эҳтиёж манфий бўлиши мумкин эмас.");
      return false;
    }

    if (dpm <= 0 && amb <= 0) {
      setError("Камида битта эҳтиёж киритилиши керак.");
      return false;
    }

    const duplicateRow = rows.find((row) => {
      const sameInstitution = String(row.institution) === String(institutionId);
      const sameDrug = String(row.drug) === String(drugId);
      const sameYear = String(row.year) === String(year);
      const anotherRow = Number(row.id) !== Number(editingId);

      return sameInstitution && sameDrug && sameYear && anotherRow;
    });

    if (duplicateRow) {
      setError("Бу муассаса, дори ва йил учун эҳтиёж қатори аллақачон мавжуд.");
      return false;
    }

    return true;
  };

  const buildPayload = () => {
    const dpm = round3(parseNumber(dpmNeed));
    const amb = round3(parseNumber(ambRecNeed));
    const yearly = round3(dpm + amb);
    const quarterly = round3(yearly / 4);

    return {
      institution: Number(institutionId),
      drug: Number(drugId),
      year: Number(year),
      yearly_need: yearly,
      quarterly_need: quarterly,
      dpm_need: dpm,
      amb_rec_need: amb,
    };
  };

  const handleAdd = async () => {
    try {
      setError("");
      setSuccess("");

      if (!validate()) return;

      await api.post("/need-rows/", buildPayload());

      resetForm();
      setSuccess("Эҳтиёж қатори қўшилди.");
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

      if (editingId === null) {
        setError("Таҳрирланаётган ёзув топилмади.");
        return;
      }

      if (!validate()) return;

      await api.patch(`/need-rows/${editingId}/`, buildPayload());

      resetForm();
      setSuccess("Эҳтиёж қатори янгиланди.");
      await load();
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

      await api.delete(`/need-rows/${id}/`);

      if (Number(editingId) === Number(id)) {
        resetForm();
      }

      setSuccess("Эҳтиёж қатори ўчирилди.");
      await load();
    } catch (e) {
      console.error(e);
      setError(getErrorMessage(e, "Ўчиришда хато бўлди."));
    }
  };

  const handleCancel = () => {
    resetForm();
    setSuccess("");
  };

  const handleClearFilters = () => {
    setFilterYear("");
    setFilterInstitution("");
    setFilterDrug("");
    setSearchText("");
  };

  const getInstitutionName = useCallback(
    (row) => {
      if (row.institution_name) return row.institution_name;

      const found = institutions.find(
        (x) => String(x.id) === String(row.institution)
      );

      return found?.name || "";
    },
    [institutions]
  );

  const getDrugName = useCallback(
    (row) => {
      if (row.drug_name) return row.drug_name;

      const found = drugs.find((x) => String(x.id) === String(row.drug));

      return found?.name || "";
    },
    [drugs]
  );

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const byYear = filterYear
        ? String(row.year) === String(filterYear)
        : true;

      const byInstitution = filterInstitution
        ? String(row.institution) === String(filterInstitution)
        : true;

      const byDrug = filterDrug
        ? String(row.drug) === String(filterDrug)
        : true;

      const text = searchText.trim().toLowerCase();
      const institutionName = getInstitutionName(row).toLowerCase();
      const drugName = getDrugName(row).toLowerCase();

      const bySearch = text
        ? institutionName.includes(text) || drugName.includes(text)
        : true;

      return byYear && byInstitution && byDrug && bySearch;
    });
  }, [
    rows,
    filterYear,
    filterInstitution,
    filterDrug,
    searchText,
    getInstitutionName,
    getDrugName,
  ]);

  const getPercentClass = (value) => {
    const n = Number(value);

    if (!Number.isFinite(n)) return "percent-badge percent-normal";
    if (n < 20) return "percent-badge percent-critical";
    if (n < 30) return "percent-badge percent-low";
    if (n < 50) return "percent-badge percent-warning";
    return "percent-badge percent-normal";
  };

  return (
    <div className="page-container">
      <h2>Эҳтиёж қаторлари</h2>
      {!canManageNeedRows ? (
        <p style={{ color: "#475569" }}>
          Сизда ушбу саҳифада фақат кўриш ҳуқуқи бор.
        </p>
      ) : null}
      

      {error ? <p style={{ color: "#dc2626" }}>{error}</p> : null}
      {success ? <p style={{ color: "#166534" }}>{success}</p> : null}

      {canManageNeedRows ? (
        <div className="form-card">
          <div className="form-row">
            <select
              value={institutionId}
              onChange={(e) => setInstitutionId(e.target.value)}
            >
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

            <input
              placeholder="Йил"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />

            <input
              placeholder="Йиллик эҳтиёж"
              value={computedYearlyNeed}
              readOnly
            />

            <input
              placeholder="Чораклик эҳтиёж"
              value={computedQuarterlyNeed}
              readOnly
            />

            <input
              placeholder="ДПМ бўйича эҳтиёж"
              value={dpmNeed}
              onChange={(e) => setDpmNeed(e.target.value)}
              inputMode="decimal"
            />

            <input
              placeholder="Амбулатор рецепт бўйича эҳтиёж"
              value={ambRecNeed}
              onChange={(e) => setAmbRecNeed(e.target.value)}
              inputMode="decimal"
            />

            {!isEditMode ? (
              canAddNeedRow ? (
                <button className="primary" type="button" onClick={handleAdd}>
                  Қўшиш
                </button>
              ) : null
            ) : (
              <>
                {canEditNeedRow ? (
                  <button className="primary" type="button" onClick={handleSave}>
                    Сақлаш
                  </button>
                ) : null}

                <button type="button" onClick={handleCancel}>
                  Бекор қилиш
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}

      <div className="form-card" style={{ marginTop: "16px" }}>
        <div className="filter-row">
          <input
            placeholder="Қидириш: муассаса ёки дори"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />

          <input
            placeholder="Фильтр: йил"
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
          />

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

          <select
            value={filterDrug}
            onChange={(e) => setFilterDrug(e.target.value)}
          >
            <option value="">Барча дорилар</option>
            {drugs.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>

          <button type="button" onClick={handleClearFilters}>
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
              <th style={compactHeaderCell}>Муассаса</th>
              <th style={compactHeaderCell}>Дори</th>
              <th style={compactHeaderCell}>Йил</th>
              <th style={compactHeaderCell}>Йиллик эҳтиёж</th>
              <th style={compactHeaderCell}>Чораклик эҳтиёж</th>
              <th style={compactHeaderCell}>ДПМ бўйича эҳтиёж</th>
              <th style={compactHeaderCell}>Амбулатор рецепт бўйича эҳтиёж</th>
              <th style={compactHeaderCell}>Берилган миқдор</th>
              <th style={compactHeaderCell}>Қолдиқ</th>
              <th style={compactHeaderCell}>Йиллик сумма</th>
              <th style={compactHeaderCell}>Берилган сумма</th>
              <th style={compactHeaderCell}>Қолдиқ сумма</th>
              <th style={compactHeaderCell}>Қолдиқ %</th>
              {canManageNeedRows ? <th style={compactHeaderCell}>Амал</th> : null}
            </tr>
          </thead>
          <tbody>
            {filteredRows.length > 0 ? (
              filteredRows.map((row) => (
                <tr key={row.id}>
                  <td style={wrapCell}>{getInstitutionName(row)}</td>
                  <td style={wrapCell}>{getDrugName(row)}</td>
                  <td style={nowrapCell}>{row.year}</td>
                  <td style={nowrapCell}>{fmtQty(row.yearly_need)}</td>
                  <td style={nowrapCell}>{fmtQty(row.quarterly_need)}</td>
                  <td style={nowrapCell}>{fmtQty(row.dpm_need)}</td>
                  <td style={nowrapCell}>{fmtQty(row.amb_rec_need)}</td>
                  <td style={nowrapCell}>{fmtQty(row.issued_qty)}</td>
                  <td style={nowrapCell}>{fmtQty(row.remaining_qty)}</td>
                  <td style={nowrapCell}>{fmtMoney(row.yearly_sum)}</td>
                  <td style={nowrapCell}>{fmtMoney(row.given_sum)}</td>
                  <td style={nowrapCell}>{fmtMoney(row.remaining_sum)}</td>
                  <td style={nowrapCell}>
                    <span className={getPercentClass(row.remaining_percent)}>
                      {fmtPercent(row.remaining_percent)}
                    </span>
                  </td>

                  {canManageNeedRows ? (
                    <td style={actionCellStyle}>
                      <div className="actions-cell" style={{ gap: "6px", flexWrap: "wrap" }}>
                        {canEditNeedRow ? (
                          <button
                            type="button"
                            style={actionButtonStyle}
                            onClick={() => startEdit(row)}
                          >
                            Таҳрирлаш
                          </button>
                        ) : null}

                        {canDeleteNeedRow ? (
                          <button
                            type="button"
                            style={actionButtonStyle}
                            onClick={() => handleDelete(row.id)}
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
                <td colSpan={canManageNeedRows ? 14 : 13} style={compactCell}>
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
