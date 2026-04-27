import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { canDo, canViewPage } from "../utils/permission";

export default function InstitutionsPage() {
  const canViewInstitutions = canViewPage("institutions");
  const canCreateInstitution = canDo("institutions", "add");
  const canUpdateInstitution = canDo("institutions", "edit");
  const canDeleteInstitution = canDo("institutions", "delete");

  const canManageInstitutions =
    canCreateInstitution || canUpdateInstitution || canDeleteInstitution;

  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [inn, setInn] = useState("");
  const [address, setAddress] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [filterName, setFilterName] = useState("");
  const [filterInn, setFilterInn] = useState("");
  const [filterActive, setFilterActive] = useState("");

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
    const firstField = data && typeof data === "object" ? Object.keys(data)[0] : null;
    if (firstField && Array.isArray(data[firstField]) && data[firstField][0]) {
      return `${firstField}: ${data[firstField][0]}`;
    }
    return fallback;
  };

  const load = useCallback(async () => {
    try {
      const res = await api.get("/institutions/");
      setItems(toArray(res.data));
      setError("");
    } catch (e) {
      console.error(e);
      setError(getErrorMessage(e, "Рўйхатни юклашда хато бўлди."));
    }
  }, []);

  useEffect(() => {
    let active = true;
    api.get("/institutions/")
      .then((res) => {
        if (!active) return;
        setItems(toArray(res.data));
        setError("");
      })
      .catch((e) => {
        console.error(e);
        if (!active) return;
        setError(getErrorMessage(e, "Рўйхатни юклашда хато бўлди."));
      });
    return () => { active = false; };
  }, []);

  const resetForm = () => {
    setName("");
    setInn("");
    setAddress("");
    setIsActive(true);
    setEditingId(null);
    setError("");
  };

  const startEdit = (item) => {
    setError("");
    setSuccess("");
    setEditingId(item.id);
    setName(item.name || "");
    setInn(item.inn || "");
    setAddress(item.address || "");
    setIsActive(Boolean(item.is_active));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const buildPayload = () => {
    if (!name.trim() || !inn.trim()) return null;
    return {
      name: name.trim(),
      inn: inn.trim(),
      address: address.trim(),
      is_active: isActive,
    };
  };

  const handleAdd = async () => {
    try {
      setError("");
      setSuccess("");
      const payload = buildPayload();
      if (!payload) {
        setError("Номи ва СТИР мажбурий.");
        return;
      }
      await api.post("/institutions/", payload);
      resetForm();
      setSuccess("Муассаса қўшилди.");
      await load();
    } catch (e) {
      setError(getErrorMessage(e, "Қўшишда хато бўлди."));
    }
  };

  const handleSave = async () => {
    try {
      setError("");
      setSuccess("");
      if (!editingId) return;
      const payload = buildPayload();
      if (!payload) {
        setError("Номи ва СТИР мажбурий.");
        return;
      }
      await api.patch(`/institutions/${editingId}/`, payload);
      resetForm();
      setSuccess("Муассаса янгиланди.");
      await load();
    } catch (e) {
      setError(getErrorMessage(e, "Сақлашда хато бўлди."));
    }
  };

  const handleCancel = () => {
    resetForm();
    setSuccess("");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Ростдан ҳам ўчирмоқчимисиз?")) return;
    try {
      setError("");
      setSuccess("");
      await api.delete(`/institutions/${id}/`);
      setSuccess("Муассаса ўчирилди.");
      await load();
    } catch (e) {
      setError(getErrorMessage(e, "Ўчиришда хатолик юз берди."));
    }
  };

  const toggleActive = async (item) => {
    try {
      setError("");
      setSuccess("");
      await api.patch(`/institutions/${item.id}/`, { is_active: !item.is_active });
      setItems((prev) => prev.map((x) => Number(x.id) === Number(item.id) ? { ...x, is_active: !x.is_active } : x));
      if (Number(editingId) === Number(item.id)) setIsActive(!item.is_active);
      setSuccess(!item.is_active ? "Муассаса фаол қилинди." : "Муассаса нофаол қилинди.");
    } catch (e) {
      setError(getErrorMessage(e, "Хатолик юз берди."));
    }
  };

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        const byName = filterName.trim() ? String(item.name || "").toLowerCase().includes(filterName.trim().toLowerCase()) : true;
        const byInn = filterInn.trim() ? String(item.inn || "").includes(filterInn.trim()) : true;
        const byActive = filterActive === "" ? true : filterActive === "true" ? item.is_active === true : item.is_active === false;
        return byName && byInn && byActive;
      })
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  }, [items, filterName, filterInn, filterActive]);

  if (!canViewInstitutions) return <div className="page-container">Рухсат йўқ.</div>;

  return (
    <div className="page-container">
      <h2>Муассасалар</h2>
      {!canManageInstitutions && <p style={{ color: "#475569" }}>Фақат кўриш ҳуқуқи.</p>}
      {error && <p style={{ color: "#dc2626" }}>{error}</p>}
      {success && <p style={{ color: "#166534" }}>{success}</p>}

      {canManageInstitutions && (
        <div className="form-card">
          <div className="form-row">
            <input placeholder="Номи" value={name} onChange={(e) => setName(e.target.value)} />
            <input placeholder="СТИР (ИНН)" value={inn} onChange={(e) => setInn(e.target.value)} />
            <input placeholder="Манзил" value={address} onChange={(e) => setAddress(e.target.value)} />
            {!editingId ? (
              canCreateInstitution && <button className="primary" onClick={handleAdd}>Қўшиш</button>
            ) : (
              <>
                {canUpdateInstitution && <button className="primary" onClick={handleSave}>Сақлаш</button>}
                <button onClick={handleCancel}>Бекор қилиш</button>
              </>
            )}
          </div>
          <div className="checkbox-row">
            <input id="inst-active" type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <label htmlFor="inst-active">Фаол</label>
          </div>
        </div>
      )}

      <div className="form-card" style={{ marginTop: "16px" }}>
        <div className="filter-row">
          <input placeholder="Фильтр: номи" value={filterName} onChange={(e) => setFilterName(e.target.value)} />
          <input placeholder="Фильтр: СТИР" value={filterInn} onChange={(e) => setFilterInn(e.target.value)} />
          <select value={filterActive} onChange={(e) => setFilterActive(e.target.value)}>
            <option value="">Барчаси</option>
            <option value="true">Фаол</option>
            <option value="false">Нофаол</option>
          </select>
          <button onClick={() => { setFilterName(""); setFilterInn(""); setFilterActive(""); }}>Тозалаш</button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="grid-table" style={{ width: "100%" }}>
          <thead>
            <tr>
              <th style={compactHeaderCell}>ИД</th>
              <th style={compactHeaderCell}>СТИР</th>
              <th style={compactHeaderCell}>Номи</th>
              <th style={compactHeaderCell}>Манзил</th>
              <th style={compactHeaderCell}>Фаол</th>
              {canManageInstitutions && <th style={compactHeaderCell}>Амал</th>}
            </tr>
          </thead>
          <tbody>
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <tr key={item.id}>
                  <td style={nowrapCell}>{item.id}</td>
                  <td style={nowrapCell}>{item.inn}</td>
                  <td style={wrapCell}>{item.name}</td>
                  <td style={wrapCell}>{item.address || ""}</td>
                  <td style={nowrapCell}>{item.is_active ? "Ҳа" : "Йўқ"}</td>
                  {canManageInstitutions && (
                    <td style={actionCellStyle}>
                      <div className="actions-cell" style={{ gap: "6px", display: "flex" }}>
                        {canUpdateInstitution && <button style={actionButtonStyle} onClick={() => startEdit(item)}>Таҳрир</button>}
                        {canUpdateInstitution && <button style={actionButtonStyle} onClick={() => toggleActive(item)}>{item.is_active ? "Нофаол" : "Фаол"}</button>}
                        {canDeleteInstitution && <button style={actionButtonStyle} onClick={() => handleDelete(item.id)}>Ўчириш</button>}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr><td colSpan="6" style={compactCell}>Маълумот йўқ</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}