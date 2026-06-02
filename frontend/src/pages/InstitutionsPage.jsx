import { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { canDo } from "../utils/permission";

const PAGE_CODE = "institutions";

const emptyForm = {
  name: "",
  inn: "",
  address: "",
  is_active: true,
};

function toArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function normalizeText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function showValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  return value;
}

function flattenError(error, fallback = "Хато юз берди.") {
  const data = error?.response?.data;

  if (!data) return error?.message || fallback;
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;

  if (Array.isArray(data.non_field_errors) && data.non_field_errors[0]) {
    return data.non_field_errors[0];
  }

  if (typeof data === "object") {
    const parts = [];

    Object.entries(data).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        parts.push(`${key}: ${value.join(", ")}`);
      } else if (typeof value === "object" && value !== null) {
        parts.push(`${key}: ${JSON.stringify(value)}`);
      } else {
        parts.push(`${key}: ${value}`);
      }
    });

    if (parts.length) return parts.join("\n");
  }

  return fallback;
}


const CYRILLIC_TO_LATIN = {
  А: "A", а: "a",
  Б: "B", б: "b",
  В: "V", в: "v",
  Г: "G", г: "g",
  Д: "D", д: "d",
  Е: "E", е: "e",
  Ё: "Yo", ё: "yo",
  Ж: "J", ж: "j",
  З: "Z", з: "z",
  И: "I", и: "i",
  Й: "Y", й: "y",
  К: "K", к: "k",
  Л: "L", л: "l",
  М: "M", м: "m",
  Н: "N", н: "n",
  О: "O", о: "o",
  П: "P", п: "p",
  Р: "R", р: "r",
  С: "S", с: "s",
  Т: "T", т: "t",
  У: "U", у: "u",
  Ф: "F", ф: "f",
  Х: "X", х: "x",
  Ц: "Ts", ц: "ts",
  Ч: "Ch", ч: "ch",
  Ш: "Sh", ш: "sh",
  Щ: "Sh", щ: "sh",
  Ъ: "'", ъ: "'",
  Ь: "", ь: "",
  Э: "E", э: "e",
  Ю: "Yu", ю: "yu",
  Я: "Ya", я: "ya",
  Ў: "O‘", ў: "o‘",
  Қ: "Q", қ: "q",
  Ғ: "G‘", ғ: "g‘",
  Ҳ: "H", ҳ: "h",
};

const LATIN_TO_CYRILLIC = {
  a: "а",
  b: "б",
  c: "к",
  d: "д",
  e: "е",
  f: "ф",
  g: "г",
  h: "ҳ",
  i: "и",
  j: "ж",
  k: "к",
  l: "л",
  m: "м",
  n: "н",
  o: "о",
  p: "п",
  q: "қ",
  r: "р",
  s: "с",
  t: "т",
  u: "у",
  v: "в",
  w: "в",
  x: "х",
  y: "й",
  z: "з",
};

function cyrillicToLatin(value) {
  return String(value ?? "")
    .split("")
    .map((char) => CYRILLIC_TO_LATIN[char] ?? char)
    .join("");
}

function isUzApostrophe(char) {
  return ["'", "’", "‘", "ʼ", "ʻ", "`"].includes(char);
}

function isUpperLatin(value) {
  return value && value === value.toUpperCase() && value !== value.toLowerCase();
}

function pickCyrillicCase(lower, upper, source) {
  return isUpperLatin(source?.[0] || "") ? upper : lower;
}

function latinToCyrillic(value) {
  const textValue = String(value ?? "");
  let result = "";
  let index = 0;

  while (index < textValue.length) {
    const current = textValue[index];
    const next = textValue[index + 1] || "";
    const currentLower = current.toLowerCase();
    const two = `${current}${next}`.toLowerCase();

    if (currentLower === "o" && isUzApostrophe(next)) {
      result += pickCyrillicCase("ў", "Ў", current);
      index += 2;
      continue;
    }

    if (currentLower === "g" && isUzApostrophe(next)) {
      result += pickCyrillicCase("ғ", "Ғ", current);
      index += 2;
      continue;
    }

    const twoMap = {
      sh: ["ш", "Ш"],
      ch: ["ч", "Ч"],
      yo: ["ё", "Ё"],
      yu: ["ю", "Ю"],
      ya: ["я", "Я"],
      ye: ["е", "Е"],
      ts: ["ц", "Ц"],
    };

    if (twoMap[two]) {
      result += pickCyrillicCase(twoMap[two][0], twoMap[two][1], current);
      index += 2;
      continue;
    }

    const mapped = LATIN_TO_CYRILLIC[currentLower];

    if (mapped) {
      result += isUpperLatin(current) ? mapped.toUpperCase() : mapped;
    } else {
      result += current;
    }

    index += 1;
  }

  return result;
}

function convertInstitutionText(value, targetScript) {
  if (targetScript === "latin") return cyrillicToLatin(value);
  if (targetScript === "cyrillic") return latinToCyrillic(value);
  return String(value ?? "");
}

export default function InstitutionsPage() {
  const canAdd = canDo(PAGE_CODE, "add");
  const canEdit = canDo(PAGE_CODE, "edit");
  const canDelete = canDo(PAGE_CODE, "delete");

  const canSelectRows = canEdit || canDelete;
  const canShowActions = canEdit || canDelete;
  const canShowForm = canAdd || canEdit;

  const [institutions, setInstitutions] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const [filterName, setFilterName] = useState("");
  const [filterInn, setFilterInn] = useState("");
  const [filterActive, setFilterActive] = useState("");

  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isEditMode = editingId !== null;

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const res = await api.get("/institutions/");
      const rows = toArray(res.data);
      setInstitutions(rows);

      const existingIds = new Set(rows.map((item) => String(item.id)));
      setSelectedIds((prev) => prev.filter((id) => existingIds.has(String(id))));
    } catch (err) {
      setError(flattenError(err, "уассасаларни юклашда хато."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredInstitutions = useMemo(() => {
    const nameText = normalizeText(filterName);
    const innText = normalizeText(filterInn);

    return institutions.filter((item) => {
      const itemName = normalizeText(item.name);
      const itemInn = normalizeText(item.inn);
      const itemAddress = normalizeText(item.address);

      if (nameText && !`${itemName} ${itemAddress}`.includes(nameText)) {
        return false;
      }

      if (innText && !itemInn.includes(innText)) {
        return false;
      }

      if (filterActive === "true" && item.is_active !== true) {
        return false;
      }

      if (filterActive === "false" && item.is_active !== false) {
        return false;
      }

      return true;
    });
  }, [institutions, filterName, filterInn, filterActive]);

  const visibleIds = useMemo(
    () => filteredInstitutions.map((item) => String(item.id)),
    [filteredInstitutions]
  );

  const selectedSet = useMemo(() => new Set(selectedIds.map(String)), [selectedIds]);

  const selectedVisibleCount = visibleIds.filter((id) => selectedSet.has(id)).length;
  const allVisibleSelected =
    visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
  }

  function resetFilters() {
    setFilterName("");
    setFilterInn("");
    setFilterActive("");
  }

  function startEdit(item) {
    setEditingId(item.id);
    setForm({
      name: item.name || "",
      inn: item.inn || "",
      address: item.address || "",
      is_active: item.is_active !== false,
    });
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitForm(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    const payload = {
      name: form.name,
      inn: form.inn,
      address: form.address,
      is_active: form.is_active,
    };

    try {
      if (isEditMode) {
        await api.patch(`/institutions/${editingId}/`, payload);
        setMessage("Муассаса янгиланди.");
      } else {
        await api.post("/institutions/", payload);
        setMessage("Муассаса қўшилди.");
      }

      resetForm();
      await loadData();
    } catch (err) {
      setError(flattenError(err, "Сақлашда хато."));
    }
  }

  async function updateActive(item, isActive) {
    setMessage("");
    setError("");

    try {
      await api.patch(`/institutions/${item.id}/`, { is_active: isActive });
      setMessage(isActive ? "Муассаса фаол қилинди." : "Муассаса нофаол қилинди.");
      await loadData();
    } catch (err) {
      setError(flattenError(err, "Холатни ўзгартиришда хато."));
    }
  }

  async function deleteOne(item) {
    const label = `${item.name || "Муассаса"}${item.inn ? ` | : ${item.inn}` : ""}`;

    if (!window.confirm(`Ўчиришни тасдиқлайсизми?\n${label}`)) return;

    setMessage("");
    setError("");

    try {
      await api.delete(`/institutions/${item.id}/`);
      setMessage("Муассаса ўчирилди.");
      setSelectedIds((prev) => prev.filter((id) => String(id) !== String(item.id)));
      await loadData();
    } catch (err) {
      setError(flattenError(err, "Ўчиришда хато."));
    }
  }

  function toggleSelected(id) {
    const idText = String(id);

    setSelectedIds((prev) => {
      const set = new Set(prev.map(String));

      if (set.has(idText)) {
        set.delete(idText);
      } else {
        set.add(idText);
      }

      return Array.from(set);
    });
  }

  function toggleSelectAllVisible() {
    setSelectedIds((prev) => {
      const set = new Set(prev.map(String));

      if (allVisibleSelected) {
        visibleIds.forEach((id) => set.delete(id));
      } else {
        visibleIds.forEach((id) => set.add(id));
      }

      return Array.from(set);
    });
  }

  function clearSelection() {
    setSelectedIds([]);
  }


  async function bulkTransliterate(targetScript, scope = "selected") {
    if (!canEdit) {
      setError("Бу амал учун таҳрирлаш ҳуқуқи керак.");
      return;
    }

    const rowsForAction =
      scope === "visible"
        ? filteredInstitutions
        : institutions.filter((item) => selectedSet.has(String(item.id)));

    if (rowsForAction.length === 0) {
      setError("Аввал камида битта муассасани белгиланг.");
      return;
    }

    const targetLabel =
      targetScript === "latin" ? "лотин алифбосига" : "кирилл алифбосига";
    const scopeLabel = scope === "visible" ? "кўринаётган" : "танланган";

    if (
      !window.confirm(
        `${rowsForAction.length} та ${scopeLabel} муассаса номи ва манзилини ${targetLabel} ўтказишни тасдиқлайсизми?\n\n` +
          "Аввал кичик танловда текшириб олиш тавсия қилинади."
      )
    ) {
      return;
    }

    setLoading(true);
    setMessage("");
    setError("");

    const failed = [];
    let changedCount = 0;
    let skippedCount = 0;

    for (const item of rowsForAction) {
      const nextName = convertInstitutionText(item.name, targetScript);
      const nextAddress = convertInstitutionText(item.address, targetScript);

      const payload = {};

      if (String(item.name ?? "") !== nextName) {
        payload.name = nextName;
      }

      if (String(item.address ?? "") !== nextAddress) {
        payload.address = nextAddress;
      }

      if (Object.keys(payload).length === 0) {
        skippedCount += 1;
        continue;
      }

      try {
        await api.patch(`/institutions/${item.id}/`, payload);
        changedCount += 1;
      } catch (err) {
        failed.push({
          label: item.name || `ID ${item.id}`,
          error: flattenError(err, "Алифбога ўтказишда хато."),
        });
      }
    }

    await loadData();

    if (changedCount > 0) {
      setMessage(
        `${changedCount} та муассаса ${targetLabel} ўтказилди.` +
          (skippedCount ? ` ${skippedCount} та қатор ўзгаришсиз қолди.` : "")
      );
    } else if (skippedCount > 0 && failed.length === 0) {
      setMessage(`${skippedCount} та қаторда ўзгариш керак эмас.`);
    }

    if (failed.length > 0) {
      setError(
        `${failed.length} та муассасада хато:\n` +
          failed.map((item) => `- ${item.label}: ${item.error}`).join("\n")
      );
    }

    setLoading(false);
  }

  async function bulkDeleteSelected() {
    const ids = selectedIds.map(String);
    if (!ids.length) return;

    if (
      !window.confirm(
        `${ids.length} та танланган муассасани ўчиришни тасдиқлайсизми?\n\n` +
          "слатма: эҳтиёж ёки берилган миқдорда ишлатилган муассасалар backend томонидан ўчирилмайди."
      )
    ) {
      return;
    }

    setLoading(true);
    setMessage("");
    setError("");

    const failed = [];
    let okCount = 0;

    for (const id of ids) {
      const item = institutions.find((row) => String(row.id) === String(id));
      const label = item?.name || `ID ${id}`;

      try {
        await api.delete(`/institutions/${id}/`);
        okCount += 1;
      } catch (err) {
        failed.push({
          id,
          label,
          error: flattenError(err, "чиришда хато."),
        });
      }
    }

    setSelectedIds(failed.map((item) => String(item.id)));

    await loadData();

    if (okCount > 0) {
      setMessage(`${okCount} та муассаса ўчирилди.`);
    }

    if (failed.length > 0) {
      setError(
        `${failed.length} та муассаса ўчмади:\n` +
          failed.map((item) => `- ${item.label}: ${item.error}`).join("\n")
      );
    }

    setLoading(false);
  }

  async function bulkDeactivateSelected() {
    const ids = selectedIds.map(String);
    if (!ids.length) return;

    if (
      !window.confirm(
        `${ids.length} та танланган муассасани нофаол қилишни тасдиқлайсизми?`
      )
    ) {
      return;
    }

    setLoading(true);
    setMessage("");
    setError("");

    const failed = [];
    let okCount = 0;

    for (const id of ids) {
      const item = institutions.find((row) => String(row.id) === String(id));
      const label = item?.name || `ID ${id}`;

      try {
        await api.patch(`/institutions/${id}/`, { is_active: false });
        okCount += 1;
      } catch (err) {
        failed.push({
          id,
          label,
          error: flattenError(err, "Нофаол қилишда хато."),
        });
      }
    }

    setSelectedIds(failed.map((item) => String(item.id)));

    await loadData();

    if (okCount > 0) {
      setMessage(`${okCount} та муассаса нофаол қилинди.`);
    }

    if (failed.length > 0) {
      setError(
        `${failed.length} та муассаса нофаол қилинмади:\n` +
          failed.map((item) => `- ${item.label}: ${item.error}`).join("\n")
      );
    }

    setLoading(false);
  }

  return (
    <div className="page-container">
      <h1>Муассасалар</h1>

      {message && (
        <pre style={{ whiteSpace: "pre-wrap", color: "#166534" }}>
          {message}
        </pre>
      )}

      {error && (
        <pre style={{ whiteSpace: "pre-wrap", color: "#b91c1c" }}>
          {error}
        </pre>
      )}

      {canShowForm && (
        <form className="form-card" onSubmit={submitForm}>
          <div className="form-row">
            <input
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="Номи"
              disabled={!canAdd && !canEdit}
              required
            />

            <input
              value={form.inn}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, inn: event.target.value }))
              }
              placeholder=" ИНН:(9 рақам)"
              maxLength={9}
            />

            <input
              value={form.address}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, address: event.target.value }))
              }
              placeholder="Манзил"
            />

            <button
              className="primary"
              type="submit"
              disabled={loading || (isEditMode ? !canEdit : !canAdd)}
            >
              {isEditMode ? "Сақлаш" : "Қўшиш"}
            </button>

            {isEditMode && (
              <button type="button" onClick={resetForm}>
                екор қилиш
              </button>
            )}
          </div>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, is_active: event.target.checked }))
              }
            />
            Фаол
          </label>
        </form>
      )}

      <div className="form-card">
        <div className="filter-row">
          <input
            value={filterName}
            onChange={(event) => setFilterName(event.target.value)}
            placeholder="Фильтр: номи"
          />

          <input
            value={filterInn}
            onChange={(event) => setFilterInn(event.target.value)}
            placeholder="Фильтр: ИНН"
          />

          <select
            value={filterActive}
            onChange={(event) => setFilterActive(event.target.value)}
          >
            <option value="">Барчаси</option>
            <option value="true">ақат фаол</option>
            <option value="false">ақат нофаол</option>
          </select>

          <button type="button" onClick={resetFilters}>
            Тозалаш
          </button>

          <button type="button" onClick={loadData} disabled={loading}>
            Янгилаш
          </button>
        </div>

        {canSelectRows && (
          <div
            className="filter-row"
            style={{
              alignItems: "center",
              borderTop: "1px solid #e5e7eb",
              paddingTop: 12,
              marginBottom: 0,
            }}
          >
            <span>
              Танланган: <b>{selectedIds.length}</b> та
            </span>

            <button
              type="button"
              onClick={toggleSelectAllVisible}
              disabled={visibleIds.length === 0}
            >
              {allVisibleSelected
                ? "Кўринаётганларни бекор қилиш"
                : `Кўринаётганларни белгилаш (${visibleIds.length})`}
            </button>

            <button type="button" onClick={clearSelection} disabled={!selectedIds.length}>
              Танловни тозалаш
            </button>

            {canEdit && (
              <button
                type="button"
                onClick={bulkDeactivateSelected}
                disabled={loading || selectedIds.length === 0}
              >
                Танланганларни нофаол қилиш
              </button>
            )}


            {canEdit && (
              <>
                <button
                  type="button"
                  onClick={() => bulkTransliterate("latin", "selected")}
                  disabled={loading || selectedIds.length === 0}
                >
                  Танланганларни лотинга
                </button>

                <button
                  type="button"
                  onClick={() => bulkTransliterate("cyrillic", "selected")}
                  disabled={loading || selectedIds.length === 0}
                >
                  Танланганларни кириллга
                </button>

                <button
                  type="button"
                  onClick={() => bulkTransliterate("latin", "visible")}
                  disabled={loading || visibleIds.length === 0}
                >
                  Кўринаётганларни лотинга
                </button>

                <button
                  type="button"
                  onClick={() => bulkTransliterate("cyrillic", "visible")}
                  disabled={loading || visibleIds.length === 0}
                >
                  Кўринаётганларни кириллга
                </button>
              </>
            )}

            {canDelete && (
              <button
                type="button"
                onClick={bulkDeleteSelected}
                disabled={loading || selectedIds.length === 0}
                style={{
                  borderColor: "#ef4444",
                  color: "#b91c1c",
                }}
              >
                Танланганларни ўчириш
              </button>
            )}
          </div>
        )}
      </div>

      <div className="table-wrap">
        <table className="grid-table">
          <thead>
            <tr>
              {canSelectRows && (
                <th style={{ width: 42 }}>
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    disabled={visibleIds.length === 0}
                    title="ўринаётган қаторларни белгилаш"
                  />
                </th>
              )}
              <th></th>
              <th>Номи</th>
              <th>ИНН</th>
              <th>Манзил</th>
              <th>Фаол</th>
              {canShowActions && <th>Амал</th>}
            </tr>
          </thead>

          <tbody>
            {loading && institutions.length === 0 && (
              <tr>
                <td colSpan={canSelectRows ? 7 : 6}>кланмоқда...</td>
              </tr>
            )}

            {!loading && filteredInstitutions.length === 0 && (
              <tr>
                <td colSpan={canSelectRows ? 7 : 6}>аълумот йўқ.</td>
              </tr>
            )}

            {filteredInstitutions.map((item) => (
              <tr key={item.id}>
                {canSelectRows && (
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedSet.has(String(item.id))}
                      onChange={() => toggleSelected(item.id)}
                    />
                  </td>
                )}

                <td>{item.id}</td>
                <td>{showValue(item.name)}</td>
                <td>{showValue(item.inn)}</td>
                <td>{showValue(item.address)}</td>
                <td>
                  <span
                    className={`status-badge ${
                      item.is_active ? "safe" : "danger"
                    }`}
                  >
                    {item.is_active ? "Ҳа" : "Йўқ"}
                  </span>
                </td>

                {canShowActions && (
                  <td>
                    <div className="actions-cell">
                      {canEdit && (
                        <button type="button" onClick={() => startEdit(item)}>
                          Таҳрирлаш
                        </button>
                      )}

                      {canEdit && item.is_active && (
                        <button
                          type="button"
                          onClick={() => updateActive(item, false)}
                        >
                          Нофаол қилиш
                        </button>
                      )}

                      {canEdit && !item.is_active && (
                        <button
                          type="button"
                          onClick={() => updateActive(item, true)}
                        >
                          Фаол қилиш
                        </button>
                      )}

                      {canDelete && (
                        <button type="button" onClick={() => deleteOne(item)}>
                          Ўчириш
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
