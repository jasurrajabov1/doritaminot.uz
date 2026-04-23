import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { canDo, canViewPage } from "../utils/permission";

export default function DrugsPage() {

  const canViewDrugs = canViewPage("drugs");
  const canAddDrug = canDo("drugs", "add");
  const canEditDrug = canDo("drugs", "edit");
  const canDeleteDrug = canDo("drugs", "delete");

  const canManageDrugs = canAddDrug || canEditDrug || canDeleteDrug;


  const [drugs, setDrugs] = useState([]);

  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const [filterName, setFilterName] = useState("");
  const [filterManufacturer, setFilterManufacturer] = useState("");
  const [filterActive, setFilterActive] = useState("");

  const isEditMode = editingId !== null;

  const toArray = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  };

  const getErrorMessage = (e, fallback) => {
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
    minWidth: "210px",
  };

  const actionButtonStyle = {
    padding: "6px 10px",
    fontSize: "12px",
    lineHeight: "1.1",
    borderRadius: "8px",
  };

const load = useCallback(async () => {
  try {
    setError("");
    setLoading(true);
    const res = await api.get("/drugs/");
    setDrugs(toArray(res.data));
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

  const resetForm = () => {
    setName("");
    setUnit("");
    setManufacturer("");
    setIsActive(true);
    setEditingId(null);
    setError("");
  };

  const startEdit = (d) => {
    setError("");
    setSuccess("");
    setEditingId(d.id);
    setName(d.name || "");
    setUnit(d.unit || "");
    setManufacturer(d.manufacturer || "");
    setIsActive(d.is_active ?? true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const buildPayload = () => {
    if (!name.trim() || !unit.trim()) {
      return null;
    }

    return {
      name: name.trim(),
      unit: unit.trim(),
      manufacturer: manufacturer.trim() ? manufacturer.trim() : null,
      is_active: isActive,
    };
  };

  const handleAdd = async () => {
    try {
      setError("");
      setSuccess("");

      const payload = buildPayload();
      if (!payload) {
        setError("Номи ва бирлик мажбурий.");
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
        setError("Номи ва бирлик мажбурий.");
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

  const handleCancel = () => {
    resetForm();
    setSuccess("");
  };

  const handleDelete = async (id) => {
    const ok = window.confirm("Ростдан ҳам ўчирмоқчимисиз?");
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

      await api.patch(`/drugs/${d.id}/`, {
        is_active: !(d.is_active ?? true),
      });

      setDrugs((prev) =>
        prev.map((x) =>
          Number(x.id) === Number(d.id)
            ? { ...x, is_active: !(d.is_active ?? true) }
            : x
        )
      );

      if (Number(editingId) === Number(d.id)) {
        setIsActive(!(d.is_active ?? true));
      }

      setSuccess(
        !(d.is_active ?? true) ? "Дори фаол қилинди." : "Дори нофаол қилинди."
      );
    } catch (e) {
      console.error(e);
      setError(getErrorMessage(e, "Фаолликни ўзгартиришда хато бўлди."));
    }
  };

  const filteredDrugs = useMemo(() => {
    return drugs
      .filter((d) => {
        const byName = filterName.trim()
          ? String(d.name || "")
              .toLowerCase()
              .includes(filterName.trim().toLowerCase())
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

        return byName && byManufacturer && byActive;
      })
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  }, [drugs, filterName, filterManufacturer, filterActive]);

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

      {error ? <p style={{ color: "#dc2626" }}>{error}</p> : null}
      {success ? <p style={{ color: "#166534" }}>{success}</p> : null}
      {loading ? <p>Юкланяпти...</p> : null}

      {canManageDrugs ? (
        <div className="form-card">
          <div className="form-row">
            <input
              placeholder="Номи"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <input
              placeholder="Бирлик"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />

            <input
              placeholder="Ишлаб чиқарувчи"
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
            />

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

                <button type="button" onClick={handleCancel}>
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
            placeholder="Фильтр: номи"
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
          />

          <input
            placeholder="Фильтр: ишлаб чиқарувчи"
            value={filterManufacturer}
            onChange={(e) => setFilterManufacturer(e.target.value)}
          />

          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
          >
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
              <th style={compactHeaderCell}>ИД</th>
              <th style={compactHeaderCell}>Номи</th>
              <th style={compactHeaderCell}>Бирлик</th>
              <th style={compactHeaderCell}>Ишлаб чиқарувчи</th>
              <th style={compactHeaderCell}>Фаол</th>
              {canManageDrugs ? <th style={compactHeaderCell}>Амал</th> : null}
            </tr>
          </thead>
          <tbody>
            {filteredDrugs.length > 0 ? (
              filteredDrugs.map((d) => (
                <tr key={d.id}>
                  <td style={nowrapCell}>{d.id}</td>
                  <td style={wrapCell}>{d.name}</td>
                  <td style={nowrapCell}>{d.unit}</td>
                  <td style={wrapCell}>{d.manufacturer || ""}</td>
                  <td style={nowrapCell}>{(d.is_active ?? true) ? "Ҳа" : "Йўқ"}</td>
                  
                  {canManageDrugs ? (
                    <td style={actionCellStyle}>
                      <div className="actions-cell" style={{ gap: "6px", flexWrap: "wrap" }}>
                        {canEditDrug ? (
                          <button
                            type="button"
                            style={actionButtonStyle}
                            onClick={() => startEdit(d)}
                          >
                            Таҳрирлаш
                          </button>
                        ) : null}

                        {canEditDrug ? (
                          <button
                            type="button"
                            style={actionButtonStyle}
                            onClick={() => handleToggleActiveRow(d)}
                          >
                            {(d.is_active ?? true) ? "Нофаол қилиш" : "Фаол қилиш"}
                          </button>
                        ) : null}

                        {canDeleteDrug ? (
                          <button
                            type="button"
                            style={actionButtonStyle}
                            onClick={() => handleDelete(d.id)}
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
                <td colSpan={canManageDrugs ? 6 : 5} style={compactCell}>
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
