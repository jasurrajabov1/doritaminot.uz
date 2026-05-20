import { useEffect, useMemo, useState } from "react";

import { canManageAccessPage } from "../utils/permission";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api"
).replace(/\/+$/, "");

const KIND_LABELS = {
  dosage_unit: "Доза бирлиги",
  dosage_form: "Дори тури",
  measure_unit: "Ўлчов бирлиги",
};

const KIND_ORDER = ["dosage_unit", "dosage_form", "measure_unit"];

const EMPTY_FORM = {
  kind: "dosage_form",
  name: "",
  aliases: "",
  sort_order: 0,
  is_active: true,
};

function getToken() {
  return sessionStorage.getItem("auth_token") || "";
}

function getRows(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function formatError(data, fallback) {
  if (!data) return fallback || "Хатолик юз берди.";

  if (typeof data === "string") return data;

  if (data.detail) return String(data.detail);

  if (typeof data === "object") {
    return Object.entries(data)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `${key}: ${value.join("; ")}`;
        }
        if (value && typeof value === "object") {
          return `${key}: ${JSON.stringify(value)}`;
        }
        return `${key}: ${value}`;
      })
      .join(" | ");
  }

  return fallback || "Хатолик юз берди.";
}

async function apiRequest(path, options = {}) {
  const token = getToken();

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Token ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const rawText = await res.text();

  let data = null;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    data = rawText;
  }

  if (!res.ok) {
    throw new Error(formatError(data, `HTTP ${res.status}`));
  }

  return data;
}

export default function DrugOptionsPage() {
  const canManage = canManageAccessPage();

  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);

  const [kindFilter, setKindFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [searchText, setSearchText] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadItems = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/drug-options/?include_inactive=1");
      setItems(getRows(data));
    } catch (err) {
      setError(err.message || "Справочник юкланмади.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const filteredItems = useMemo(() => {
    const q = searchText.trim().toLowerCase();

    return items.filter((item) => {
      if (kindFilter && item.kind !== kindFilter) return false;

      if (activeFilter === "true" && !item.is_active) return false;
      if (activeFilter === "false" && item.is_active) return false;

      if (q) {
        const haystack = [
          item.kind_display,
          item.kind,
          item.name,
          item.aliases,
          ...(item.aliases_list || []),
        ]
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [items, kindFilter, activeFilter, searchText]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError("");
    setSuccess("");
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setForm({
      kind: item.kind || "dosage_form",
      name: item.name || "",
      aliases: item.aliases || "",
      sort_order: item.sort_order ?? 0,
      is_active: item.is_active !== false,
    });
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!canManage) {
      setError("Справочникни ўзгартириш учун manage_access ҳуқуқи керак.");
      return;
    }

    setError("");
    setSuccess("");

    const payload = {
      kind: form.kind,
      name: form.name.trim(),
      aliases: form.aliases.trim(),
      sort_order: Number(form.sort_order || 0),
      is_active: !!form.is_active,
    };

    try {
      if (editingId) {
        await apiRequest(`/drug-options/${editingId}/`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setSuccess("Справочник қиймати янгиланди.");
      } else {
        await apiRequest("/drug-options/", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setSuccess("Справочник қиймати қўшилди.");
      }

      resetForm();
      await loadItems();
    } catch (err) {
      setError(err.message || "Сақлашда хатолик юз берди.");
    }
  };

  const handleToggleActive = async (item) => {
    if (!canManage) {
      setError("Справочникни ўзгартириш учун manage_access ҳуқуқи керак.");
      return;
    }

    setError("");
    setSuccess("");

    try {
      await apiRequest(`/drug-options/${item.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !item.is_active }),
      });

      setSuccess(item.is_active ? "Қиймат нофаол қилинди." : "Қиймат фаол қилинди.");
      await loadItems();
    } catch (err) {
      setError(err.message || "Ҳолатни ўзгартиришда хатолик юз берди.");
    }
  };

  const handleDelete = async (item) => {
    if (!canManage) {
      setError("Справочникни ўзгартириш учун manage_access ҳуқуқи керак.");
      return;
    }

    const ok = window.confirm(
      `"${item.name}" қийматини нофаол қилишни тасдиқлайсизми?`
    );

    if (!ok) return;

    setError("");
    setSuccess("");

    try {
      await apiRequest(`/drug-options/${item.id}/`, {
        method: "DELETE",
      });

      setSuccess("Қиймат нофаол қилинди.");
      await loadItems();
    } catch (err) {
      setError(err.message || "Ўчиришда хатолик юз берди.");
    }
  };

  return (
    <div className="page-card">
      <h1>Дори справочниклари</h1>
      <p>
        Доза бирлиги, дори тури ва ўлчов бирликлари шу ерда бошқарилади.
        Нотўғри вариантлар дори паспортида сақланмайди.
      </p>

      {!canManage ? (
        <p style={{ color: "#dc2626" }}>
          Сизда ушбу справочникни бошқариш ҳуқуқи йўқ.
        </p>
      ) : null}

      {error ? <p style={{ color: "#dc2626" }}>{error}</p> : null}
      {success ? <p style={{ color: "#166534" }}>{success}</p> : null}

      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-row">
          <select
            value={form.kind}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, kind: event.target.value }))
            }
            disabled={!canManage}
          >
            {KIND_ORDER.map((kind) => (
              <option key={kind} value={kind}>
                {KIND_LABELS[kind]}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Тўғри вариант номи: гель / табл / уп"
            value={form.name}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, name: event.target.value }))
            }
            disabled={!canManage}
            required
          />

          <input
            type="text"
            placeholder="Алиаслар: гел; gel; упаковка"
            value={form.aliases}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, aliases: event.target.value }))
            }
            disabled={!canManage}
          />

          <input
            type="number"
            placeholder="Тартиб"
            value={form.sort_order}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, sort_order: event.target.value }))
            }
            disabled={!canManage}
          />

          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, is_active: event.target.checked }))
              }
              disabled={!canManage}
            />
            Фаол
          </label>

          <button type="submit" disabled={!canManage}>
            {editingId ? "Сақлаш" : "Қўшиш"}
          </button>

          {editingId ? (
            <button type="button" onClick={resetForm}>
              Бекор қилиш
            </button>
          ) : null}
        </div>
      </form>

      <div className="form-card" style={{ marginTop: 16 }}>
        <div className="filter-row">
          <input
            type="text"
            placeholder="Қидириш: ном ёки алиас"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />

          <select
            value={kindFilter}
            onChange={(event) => setKindFilter(event.target.value)}
          >
            <option value="">Барча турлар</option>
            {KIND_ORDER.map((kind) => (
              <option key={kind} value={kind}>
                {KIND_LABELS[kind]}
              </option>
            ))}
          </select>

          <select
            value={activeFilter}
            onChange={(event) => setActiveFilter(event.target.value)}
          >
            <option value="">Барчаси</option>
            <option value="true">Фаол</option>
            <option value="false">Нофаол</option>
          </select>

          <button type="button" onClick={loadItems}>
            Янгилаш
          </button>

          <button
            type="button"
            onClick={() => {
              setSearchText("");
              setKindFilter("");
              setActiveFilter("");
            }}
          >
            Тозалаш
          </button>
        </div>
      </div>

      <div className="table-wrap" style={{ marginTop: 16 }}>
        {loading ? <p>Юкланмоқда...</p> : null}

        <table>
          <thead>
            <tr>
              <th>ИД</th>
              <th>Тури</th>
              <th>Тўғри номи</th>
              <th>Алиаслар</th>
              <th>Тартиб</th>
              <th>Фаол</th>
              <th>Амал</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.kind_display || KIND_LABELS[item.kind] || item.kind}</td>
                <td>{item.name}</td>
                <td>
                  {Array.isArray(item.aliases_list) && item.aliases_list.length
                    ? item.aliases_list.join("; ")
                    : item.aliases || "—"}
                </td>
                <td>{item.sort_order ?? 0}</td>
                <td>{item.is_active ? "Ҳа" : "Йўқ"}</td>
                <td>
                  <button type="button" onClick={() => handleEdit(item)}>
                    Таҳрирлаш
                  </button>{" "}
                  <button type="button" onClick={() => handleToggleActive(item)}>
                    {item.is_active ? "Нофаол қилиш" : "Фаол қилиш"}
                  </button>{" "}
                  <button type="button" onClick={() => handleDelete(item)}>
                    Ўчириш
                  </button>
                </td>
              </tr>
            ))}

            {!loading && filteredItems.length === 0 ? (
              <tr>
                <td colSpan="7">Маълумот топилмади.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
