import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { canDo, canViewPage } from "../utils/permission";

const toArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const parseDecimal = (val) => {
  const s = String(val ?? "")
    .trim()
    .replaceAll(" ", "")
    .replace(",", ".");

  if (s === "") return null;

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

const formatMoney = (value) => {
  if (value === null || value === undefined || value === "") return "";

  return Number(value).toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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

const fetchPricesData = async () => {
  const [pricesRes, drugsRes] = await Promise.all([
    api.get("/prices/"),
    api.get("/drugs/"),
  ]);

  return {
    prices: toArray(pricesRes.data),
    drugs: toArray(drugsRes.data),
  };
};

export default function PricesPage() {
  const canViewPrices = canViewPage("prices");
  const canAddPrice = canDo("prices", "add");
  const canEditPrice = canDo("prices", "edit");
  const canDeletePrice = canDo("prices", "delete");

  const canManagePrices = canAddPrice || canEditPrice || canDeletePrice;
  const canShowPriceActions = canEditPrice || canDeletePrice;

  const [items, setItems] = useState([]);
  const [drugs, setDrugs] = useState([]);

  const [drug, setDrug] = useState("");
  const [price, setPrice] = useState("");
  const [startDate, setStartDate] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [searchText, setSearchText] = useState("");
  const [filterDrug, setFilterDrug] = useState("");
  const [filterActive, setFilterActive] = useState("");

  const canShowPriceForm = canAddPrice || (editingId !== null && canEditPrice);

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

const load = useCallback(async () => {
  if (!canViewPrices) return;

  try {
    const { prices, drugs } = await fetchPricesData();

    setItems(prices);
    setDrugs(drugs);
    setError("");
  } catch (e) {
    console.error(e);
    setError(getErrorMessage(e, "Рўйхатни юклашда хато бўлди."));
  }
}, [canViewPrices]);

useEffect(() => {
  if (!canViewPrices) return undefined;

  let cancelled = false;

  fetchPricesData()
    .then(({ prices, drugs }) => {
      if (cancelled) return;

      setItems(prices);
      setDrugs(drugs);
      setError("");
    })
    .catch((e) => {
      if (cancelled) return;

      console.error(e);
      setError(getErrorMessage(e, "Рўйхатни юклашда хато бўлди."));
    });

  return () => {
    cancelled = true;
  };
}, [canViewPrices]);

  const resetForm = () => {
    setDrug("");
    setPrice("");
    setStartDate("");
    setIsActive(true);
    setEditingId(null);
    setError("");
  };

  const startEdit = (x) => {
    if (!canEditPrice) {
      setSuccess("");
      setError("Сизда нархни таҳрирлаш ҳуқуқи йўқ.");
      return;
    }

    setError("");
    setSuccess("");
    setEditingId(x.id);
    setDrug(x.drug !== null && x.drug !== undefined ? String(x.drug) : "");
    setPrice(x.price !== null && x.price !== undefined ? String(x.price) : "");
    setStartDate(x.start_date ?? "");
    setIsActive(x.is_active ?? true);

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const buildPayload = () => {
    const parsedPrice = parseDecimal(price);

    if (!drug || !startDate || parsedPrice === null || parsedPrice <= 0) {
      return null;
    }

    return {
      drug: Number(drug),
      price: parsedPrice,
      start_date: startDate,
      is_active: isActive,
    };
  };

  const handleAdd = async () => {
    if (!canAddPrice) {
      setSuccess("");
      setError("Сизда нарх қўшиш ҳуқуқи йўқ.");
      return;
    }

    try {
      setError("");
      setSuccess("");

      const payload = buildPayload();

      if (!payload) {
        setError(
          "Дори, нарх ва бошланиш санаси мажбурий. Нарх 0 дан катта бўлиши керак."
        );
        return;
      }

      await api.post("/prices/", payload);

      resetForm();
      setSuccess("Нарх қўшилди.");
      await load();
    } catch (e) {
      console.error(e);
      setError(getErrorMessage(e, "Қўшишда хато бўлди."));
    }
  };

  const handleSave = async () => {
    if (!canEditPrice) {
      setSuccess("");
      setError("Сизда нархни таҳрирлаш ҳуқуқи йўқ.");
      return;
    }

    try {
      setError("");
      setSuccess("");

      if (!editingId) {
        setError("Таҳрирланаётган ёзув топилмади.");
        return;
      }

      const payload = buildPayload();

      if (!payload) {
        setError(
          "Дори, нарх ва бошланиш санаси мажбурий. Нарх 0 дан катта бўлиши керак."
        );
        return;
      }

      await api.patch(`/prices/${editingId}/`, payload);

      resetForm();
      setSuccess("Нарх янгиланди.");
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
    if (!canDeletePrice) {
      setSuccess("");
      setError("Сизда нархни ўчириш ҳуқуқи йўқ.");
      return;
    }

    const ok = window.confirm("Ростдан ҳам ўчирмоқчимисиз?");
    if (!ok) return;

    try {
      setError("");
      setSuccess("");

      await api.delete(`/prices/${id}/`);

      setSuccess("Нарх ўчирилди.");
      await load();
    } catch (e) {
      console.error(e);
      setError(getErrorMessage(e, "Нархни ўчиришда хатолик юз берди."));
    }
  };

  const drugName = useCallback(
    (id) => {
      const found = drugs.find((d) => Number(d.id) === Number(id));
      return found ? found.name : id;
    },
    [drugs]
  );

  const filteredItems = useMemo(() => {
    const q = searchText.trim().toLowerCase();

    return items
      .filter((x) => {
        const byDrug = filterDrug ? String(x.drug) === String(filterDrug) : true;

        const byActive =
          filterActive === ""
            ? true
            : filterActive === "true"
            ? x.is_active === true
            : x.is_active === false;

        const bySearch = q
          ? String(drugName(x.drug)).toLowerCase().includes(q)
          : true;

        return byDrug && byActive && bySearch;
      })
      .sort((a, b) => {
        const da = String(a.start_date ?? "");
        const db = String(b.start_date ?? "");

        if (da !== db) return db.localeCompare(da);

        return Number(b.id) - Number(a.id);
      });
  }, [items, filterDrug, filterActive, searchText, drugName]);

  if (!canViewPrices) {
    return (
      <div className="page-container">
        Сизда ушбу саҳифани кўриш ҳуқуқи йўқ.
      </div>
    );
  }

  return (
    <div className="page-container">
      <h2>Нархлар</h2>

      <p style={{ marginTop: "-6px", color: "#475569" }}>
        Бу саҳифада фақат битта асосий нарх юритилади.
      </p>

      {!canManagePrices ? (
        <p style={{ color: "#475569" }}>
          Сизда ушбу саҳифада фақат кўриш ҳуқуқи бор.
        </p>
      ) : null}

      {error ? <p style={{ color: "#dc2626" }}>{error}</p> : null}
      {success ? <p style={{ color: "#166534" }}>{success}</p> : null}

      {canShowPriceForm ? (
        <div className="form-card">
          <div className="form-row">
            <select value={drug} onChange={(e) => setDrug(e.target.value)}>
              <option value="">Дорини танланг</option>
              {drugs.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>

            <input
              type="text"
              inputMode="decimal"
              placeholder="Нарх"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />

            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />

            {editingId === null ? (
              <button className="primary" type="button" onClick={handleAdd}>
                Қўшиш
              </button>
            ) : (
              <>
                <button className="primary" type="button" onClick={handleSave}>
                  Сақлаш
                </button>
                <button type="button" onClick={handleCancel}>
                  Бекор қилиш
                </button>
              </>
            )}
          </div>

          <div className="checkbox-row">
            <input
              id="price-active"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            <label htmlFor="price-active">Фаол</label>
          </div>
        </div>
      ) : null}

      <div className="form-card" style={{ marginTop: "16px" }}>
        <div className="filter-row">
          <input
            type="text"
            placeholder="Қидириш: дори номи"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />

          <select
            value={filterDrug}
            onChange={(e) => setFilterDrug(e.target.value)}
          >
            <option value="">Барча дорилар</option>
            {drugs.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>

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
              setSearchText("");
              setFilterDrug("");
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
              <th style={compactHeaderCell}>Дори</th>
              <th style={compactHeaderCell}>Нарх</th>
              <th style={compactHeaderCell}>Нарх олинган сана</th>
              <th style={compactHeaderCell}>Фаол</th>
              {canShowPriceActions ? (
                <th style={compactHeaderCell}>Амал</th>
              ) : null}
            </tr>
          </thead>

          <tbody>
            {filteredItems.length > 0 ? (
              filteredItems.map((x) => (
                <tr key={x.id}>
                  <td style={nowrapCell}>{x.id}</td>
                  <td style={wrapCell}>{drugName(x.drug)}</td>
                  <td style={nowrapCell}>{formatMoney(x.price)}</td>
                  <td style={nowrapCell}>{x.start_date}</td>
                  <td style={nowrapCell}>{x.is_active ? "Ҳа" : "Йўқ"}</td>

                  {canShowPriceActions ? (
                    <td style={actionCellStyle}>
                      <div
                        className="actions-cell"
                        style={{ gap: "6px", flexWrap: "wrap" }}
                      >
                        {canEditPrice ? (
                          <button
                            type="button"
                            style={actionButtonStyle}
                            onClick={() => startEdit(x)}
                          >
                            Таҳрирлаш
                          </button>
                        ) : null}

                        {canDeletePrice ? (
                          <button
                            type="button"
                            style={actionButtonStyle}
                            onClick={() => handleDelete(x.id)}
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
                <td colSpan={canShowPriceActions ? 6 : 5} style={compactCell}>
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