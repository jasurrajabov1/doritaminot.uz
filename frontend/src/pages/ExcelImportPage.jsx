import { useMemo, useState } from "react";
import api from "../api/client";

const IMPORT_TYPES = [
  ["need_matrix", "Дори + эҳтиёж матрицаси"],
  ["institutions", "Муассасалар"],
];

const DEFAULT_MAPPING = {
  sheet_name: "",
  year: "2026",
  start_row: "7",
  end_row: "",
  institution_name_col: "B",
  institution_inn_col: "C",
  unit_col: "D",
};

const DEFAULT_INSTITUTION_MAPPING = {
  mode: "manual",
  sheet_name: "",
  start_row: "7",
  end_row: "",
  name_col: "B",
  inn_col: "C",
  address_col: "",
  active_col: "",
};

function errorText(error) {
  const data = error?.response?.data;
  if (!data) return error?.message || "Хато";
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;
  return JSON.stringify(data, null, 2);
}

function cellValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default function ExcelImportPage() {
  const [importType, setImportType] = useState("need_matrix");
  const [file, setFile] = useState(null);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [mapping, setMapping] = useState(DEFAULT_MAPPING);
  const [institutionMapping, setInstitutionMapping] = useState(DEFAULT_INSTITUTION_MAPPING);
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const rows = useMemo(() => result?.rows || [], [result]);
  const errorRows = useMemo(() => result?.error_rows || rows.filter((row) => !row.ok), [result, rows]);
  const visibleRows = rows.slice(0, 400);
  const visibleErrorRows = errorRows.slice(0, 80);

  function updateMapping(key, value) {
    setMapping((prev) => ({ ...prev, [key]: value }));
  }

  function updateInstitutionMapping(key, value) {
    setInstitutionMapping((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(commit) {
    setMessage("");
    setResult(null);

    if (!file) {
      setMessage("Аввал Excel файл танланг.");
      return;
    }

    const form = new FormData();
    form.append("file", file);
    form.append("commit", commit ? "1" : "");
    form.append("update_existing", updateExisting ? "1" : "");

    let endpoint = "/import/need-matrix/";

    if (importType === "need_matrix") {
      Object.entries(mapping).forEach(([key, value]) => {
        form.append(key, value || "");
      });
    } else {
      endpoint = "/import/excel/";
      form.append("import_type", "institutions");
      Object.entries(institutionMapping).forEach(([key, value]) => {
        form.append(key, value || "");
      });
    }

    setLoading(true);

    try {
      const res = await api.post(endpoint, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setResult(res.data);
      setMessage(commit ? "Базага импорт қилиш текширилди." : "Excel текширилди.");
    } catch (error) {
      const data = error?.response?.data;
      setResult(data || null);
      setMessage(errorText(error));
    } finally {
      setLoading(false);
    }
  }

  function renderNeedMatrixMapping() {
    return (
      <div className="form-card" style={{ marginTop: 16 }}>
        <h3>Дори + эҳтиёж матрицаси учун устунлар</h3>

        <div className="form-row">
          <input
            placeholder="Варақ номи: Гиёҳ. преп. / бўш = ҳаммаси"
            value={mapping.sheet_name}
            onChange={(e) => updateMapping("sheet_name", e.target.value)}
          />

          <input
            placeholder="Йил"
            value={mapping.year}
            onChange={(e) => updateMapping("year", e.target.value)}
          />

          <input
            placeholder="Бошланиш қатори: 7"
            value={mapping.start_row}
            onChange={(e) => updateMapping("start_row", e.target.value)}
          />

          <input
            placeholder="Тугаш қатори: 80 / бўш = автомат"
            value={mapping.end_row}
            onChange={(e) => updateMapping("end_row", e.target.value)}
          />

          <input
            placeholder="Муассаса номи устуни: B"
            value={mapping.institution_name_col}
            onChange={(e) => updateMapping("institution_name_col", e.target.value)}
          />

          <input
            placeholder="ИНН устуни: C"
            value={mapping.institution_inn_col}
            onChange={(e) => updateMapping("institution_inn_col", e.target.value)}
          />

          <input
            placeholder="Ўлчов бирлиги устуни: D"
            value={mapping.unit_col}
            onChange={(e) => updateMapping("unit_col", e.target.value)}
          />
        </div>

        <p style={{ color: "#475569", margin: 0 }}>
          Сизнинг жадвал учун одатда: бошланиш қатори 7, муассаса номи B, ИНН C, ўлчов бирлиги D.
          Дори номлари юқоридаги бирлаштирилган сарлавҳалардан автомат аниқланади.
        </p>
      </div>
    );
  }

  function renderInstitutionMapping() {
    return (
      <div className="form-card" style={{ marginTop: 16 }}>
        <h3>Муассасалар учун қўлда устун белгилаш</h3>

        <div className="form-row">
          <input
            placeholder="Варақ номи / бўш = биринчи варақ"
            value={institutionMapping.sheet_name}
            onChange={(e) => updateInstitutionMapping("sheet_name", e.target.value)}
          />

          <input
            placeholder="Бошланиш қатори: 7"
            value={institutionMapping.start_row}
            onChange={(e) => updateInstitutionMapping("start_row", e.target.value)}
          />

          <input
            placeholder="Тугаш қатори / бўш = автомат"
            value={institutionMapping.end_row}
            onChange={(e) => updateInstitutionMapping("end_row", e.target.value)}
          />

          <input
            placeholder="Муассаса номи устуни: B"
            value={institutionMapping.name_col}
            onChange={(e) => updateInstitutionMapping("name_col", e.target.value)}
          />

          <input
            placeholder="ИНН устуни: C"
            value={institutionMapping.inn_col}
            onChange={(e) => updateInstitutionMapping("inn_col", e.target.value)}
          />

          <input
            placeholder="Манзил устуни, бўш бўлиши мумкин"
            value={institutionMapping.address_col}
            onChange={(e) => updateInstitutionMapping("address_col", e.target.value)}
          />

          <input
            placeholder="Фаол устуни, бўш = Ҳа"
            value={institutionMapping.active_col}
            onChange={(e) => updateInstitutionMapping("active_col", e.target.value)}
          />
        </div>
      </div>
    );
  }


  function renderErrorRows() {
    if (!errorRows.length) return null;

    return (
      <div className="form-card" style={{ marginTop: 16, borderColor: "#fecaca" }}>
        <h3 style={{ color: "#b91c1c" }}>
          Хатоли қаторлар: {errorRows.length} та
        </h3>

        <p style={{ color: "#475569", marginTop: -6 }}>
          Бу қаторлар базага сақланмайди. Қолган OK қаторларни импорт қилиш мумкин.
          Хатони тузатиш учун Excel қатори, муассаса номи, ИНН ва хато сабабини текширинг.
        </p>

        <div className="table-wrap">
          <table className="grid-table">
            <thead>
              <tr>
                <th>Варақ</th>
                <th>Excel қатор</th>
                <th>Муассаса</th>
                <th>ИНН</th>
                <th>Дори</th>
                <th>Асосий эҳтиёж</th>
                <th>Берилган</th>
                <th>Хато сабаби</th>
              </tr>
            </thead>

            <tbody>
              {visibleErrorRows.map((row, index) => (
                <tr key={`error-${row.sheet_name}-${row.row_number}-${index}`}>
                  <td>{cellValue(row.sheet_name)}</td>
                  <td>{cellValue(row.row_number)}</td>
                  <td>{cellValue(row.data?.institution_name)}</td>
                  <td>{cellValue(row.data?.institution_inn)}</td>
                  <td>{cellValue(row.data?.drug_title)}</td>
                  <td>{cellValue(row.data?.base_need)}</td>
                  <td>{cellValue(row.data?.issued_qty)}</td>
                  <td style={{ whiteSpace: "normal", maxWidth: 520, color: "#b91c1c" }}>
                    {cellValue(row.errors || row.message)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {errorRows.length > visibleErrorRows.length ? (
          <p style={{ color: "#475569" }}>
            Биринчи {visibleErrorRows.length} та хато кўрсатилди. Жами хато: {errorRows.length}.
          </p>
        ) : null}
      </div>
    );
  }

  function renderStats() {
    if (!result) return null;

    return (
      <div className="stats-row" style={{ marginTop: 16 }}>
        <div className="stat-card">
          <div>Жами</div>
          <b>{result.total ?? 0}</b>
        </div>

        <div className="stat-card">
          <div>Тўғри</div>
          <b>{result.ok_count ?? 0}</b>
        </div>

        <div className="stat-card">
          <div>Хато</div>
          <b>{result.errors_count ?? 0}</b>
        </div>

        <div className="stat-card">
          <div>Яратилди</div>
          <b>{result.created ?? 0}</b>
        </div>

        <div className="stat-card">
          <div>Янгиланди</div>
          <b>{result.updated ?? 0}</b>
        </div>
      </div>
    );
  }

  function renderDetectedBlocks() {
    const blocks = result?.meta?.blocks || [];
    if (!blocks.length || importType !== "need_matrix") return null;

    return (
      <div className="form-card" style={{ marginTop: 16 }}>
        <h3>Аниқланган Excel варақлари ва дорилар</h3>

        {blocks.map((block) => (
          <div key={block.sheet_name} style={{ marginBottom: 10 }}>
            <b>{block.sheet_name}</b>{" "}
            <span style={{ color: "#475569" }}>
              — {block.control_group_label}; {block.drug_count} та дори аниқланди
            </span>
          </div>
        ))}
      </div>
    );
  }

  function renderNeedMatrixRows() {
    return (
      <table className="grid-table">
        <thead>
          <tr>
            <th>Варақ</th>
            <th>Excel қатор</th>
            <th>Ҳолат</th>
            <th>Амал</th>
            <th>Муассаса</th>
            <th>ИНН</th>
            <th>Дори</th>
            <th>Гуруҳ</th>
            <th>Асосий эҳтиёж</th>
            <th>Қўшимча</th>
            <th>Берилган</th>
            <th>Хато</th>
          </tr>
        </thead>

        <tbody>
          {visibleRows.length ? (
            visibleRows.map((row, index) => (
              <tr key={`${row.sheet_name}-${row.row_number}-${index}`}>
                <td>{cellValue(row.sheet_name)}</td>
                <td>{cellValue(row.row_number)}</td>
                <td>
                  <span className={`status-badge ${row.ok ? "safe" : "danger"}`}>
                    {row.ok ? "OK" : "Хато"}
                  </span>
                </td>
                <td>{cellValue(row.action)}</td>
                <td>{cellValue(row.data?.institution_name)}</td>
                <td>{cellValue(row.data?.institution_inn)}</td>
                <td>{cellValue(row.data?.drug_title)}</td>
                <td>{cellValue(row.data?.control_group_label)}</td>
                <td>{cellValue(row.data?.base_need)}</td>
                <td>{cellValue(row.data?.additional_need)}</td>
                <td>{cellValue(row.data?.issued_qty)}</td>
                <td style={{ whiteSpace: "normal", maxWidth: 420 }}>
                  {cellValue(row.errors || row.message)}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="12">Маълумот йўқ.</td>
            </tr>
          )}
        </tbody>
      </table>
    );
  }

  function renderInstitutionRows() {
    return (
      <table className="grid-table">
        <thead>
          <tr>
            <th>Excel қатор</th>
            <th>Ҳолат</th>
            <th>Амал</th>
            <th>Маълумот</th>
            <th>Хато</th>
          </tr>
        </thead>

        <tbody>
          {visibleRows.length ? (
            visibleRows.map((row, index) => (
              <tr key={`${row.row_number}-${index}`}>
                <td>{cellValue(row.row_number)}</td>
                <td>
                  <span className={`status-badge ${row.ok ? "safe" : "danger"}`}>
                    {row.ok ? "OK" : "Хато"}
                  </span>
                </td>
                <td>{cellValue(row.action)}</td>
                <td style={{ whiteSpace: "normal", maxWidth: 620 }}>
                  {cellValue(row.data)}
                </td>
                <td style={{ whiteSpace: "normal", maxWidth: 420 }}>
                  {cellValue(row.errors || row.message)}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5">Маълумот йўқ.</td>
            </tr>
          )}
        </tbody>
      </table>
    );
  }

  return (
    <div className="page-container">
      <h1>Excel import</h1>

      <p>
        Аввал Excel текширилади. Хато бўлмаса кейин базага импорт қилинади.
        Дори + эҳтиёж режимида бўш устунлар ва 0 қийматли позициялар ўтказиб юборилади.
      </p>

      {message ? (
        <pre
          style={{
            whiteSpace: "pre-wrap",
            color:
              message.includes("Хато") ||
              message.includes("detail") ||
              result?.ok === false
                ? "#b91c1c"
                : "#166534",
          }}
        >
          {message}
        </pre>
      ) : null}

      <div className="form-card">
        <div className="form-row">
          <select
            value={importType}
            onChange={(e) => {
              setImportType(e.target.value);
              setResult(null);
              setMessage("");
            }}
          >
            {IMPORT_TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <input
            type="file"
            accept=".xlsx,.xlsm"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setResult(null);
              setMessage("");
            }}
          />

          <label className="checkbox-row" style={{ margin: 0 }}>
            <input
              type="checkbox"
              checked={updateExisting}
              onChange={(e) => setUpdateExisting(e.target.checked)}
            />
            Мавжуд ёзувларни янгилаш
          </label>

          <button type="button" disabled={loading || !file} onClick={() => submit(false)}>
            Аввал текшириш
          </button>

          <button
            type="button"
            className="primary"
            disabled={loading || !file || (result && (result.ok_count ?? 0) <= 0)}
            onClick={() => submit(true)}
          >
            Базага импорт қилиш
          </button>
        </div>
      </div>

      {importType === "need_matrix" ? renderNeedMatrixMapping() : renderInstitutionMapping()}

      {renderErrorRows()}
      {renderStats()}
      {renderDetectedBlocks()}

      {result ? (
        <div className="table-wrap">
          {importType === "need_matrix" ? renderNeedMatrixRows() : renderInstitutionRows()}
        </div>
      ) : null}

      {rows.length > visibleRows.length ? (
        <p style={{ color: "#475569" }}>
          Экранда биринчи {visibleRows.length} та қатор кўрсатилди. Жами: {rows.length}.
        </p>
      ) : null}
    </div>
  );
}
