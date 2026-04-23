import { overrideText } from "./helpers";
import { OverrideSelect } from "./AccessUi";
import {
  labelStyle,
  inputStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  smallEditButtonStyle,
  smallDeleteButtonStyle,
  thStyle,
  tdStyle,
} from "./styles";

export default function OverridesSection({
  editingOverrideId,
  overrideForm,
  setOverrideForm,
  overrideSaving,
  resetOverrideForm,
  handleOverrideSubmit,
  pages,
  users,
  overrides,
  handleOverrideEdit,
  handleOverrideDelete,
  overrideDeletingId,
}) {
  const isOverrideFormInvalid =
    !overrideForm.user || !overrideForm.page_code;

  return (
    <>
      <div className="form-card" style={{ marginBottom: "16px" }}>
        <h3 style={{ marginTop: 0 }}>
          {editingOverrideId
            ? "Индивидуал override'ни таҳрирлаш"
            : "Янги индивидуал override қўшиш"}
        </h3>

        <form onSubmit={handleOverrideSubmit}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "12px",
            }}
          >
            <div>
              <label style={labelStyle}>Фойдаланувчи</label>
              <select
                value={overrideForm.user}
                onChange={(e) =>
                  setOverrideForm((prev) => ({
                    ...prev,
                    user: e.target.value,
                  }))
                }
                style={inputStyle}
              >
                <option value="">Фойдаланувчи танланг</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.username}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Саҳифа</label>
              <select
                value={overrideForm.page_code}
                onChange={(e) =>
                  setOverrideForm((prev) => ({
                    ...prev,
                    page_code: e.target.value,
                  }))
                }
                style={inputStyle}
              >
                <option value="">Саҳифа танланг</option>
                {pages.map((page) => (
                  <option key={page.code} value={page.code}>
                    {page.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "12px",
              marginTop: "16px",
            }}
          >
            <OverrideSelect
              label="Кўриш"
              value={overrideForm.can_view}
              onChange={(e) =>
                setOverrideForm((prev) => ({
                  ...prev,
                  can_view: e.target.value,
                }))
              }
            />

            <OverrideSelect
              label="Қўшиш"
              value={overrideForm.can_add}
              onChange={(e) =>
                setOverrideForm((prev) => ({
                  ...prev,
                  can_add: e.target.value,
                }))
              }
            />

            <OverrideSelect
              label="Таҳрирлаш"
              value={overrideForm.can_edit}
              onChange={(e) =>
                setOverrideForm((prev) => ({
                  ...prev,
                  can_edit: e.target.value,
                }))
              }
            />

            <OverrideSelect
              label="Ўчириш"
              value={overrideForm.can_delete}
              onChange={(e) =>
                setOverrideForm((prev) => ({
                  ...prev,
                  can_delete: e.target.value,
                }))
              }
            />

            <OverrideSelect
              label="Экспорт"
              value={overrideForm.can_export}
              onChange={(e) =>
                setOverrideForm((prev) => ({
                  ...prev,
                  can_export: e.target.value,
                }))
              }
            />

            <OverrideSelect
              label="Чоп этиш"
              value={overrideForm.can_print}
              onChange={(e) =>
                setOverrideForm((prev) => ({
                  ...prev,
                  can_print: e.target.value,
                }))
              }
            />

            <OverrideSelect
              label="Доступни бошқариш"
              value={overrideForm.can_manage_access}
              onChange={(e) =>
                setOverrideForm((prev) => ({
                  ...prev,
                  can_manage_access: e.target.value,
                }))
              }
            />
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              marginTop: "16px",
            }}
          >
            <button
              type="submit"
              style={primaryButtonStyle}
              disabled={overrideSaving || isOverrideFormInvalid}
            >
              {overrideSaving
                ? "Сақланмоқда..."
                : editingOverrideId
                ? "Янгилаш"
                : "Override қўшиш"}
            </button>

            <button
              type="button"
              onClick={resetOverrideForm}
              style={secondaryButtonStyle}
              disabled={overrideSaving}
            >
              Тозалаш
            </button>
          </div>
        </form>
      </div>

      <div className="form-card">
        <h3 style={{ marginTop: 0 }}>Индивидуал override’лар</h3>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: "1600px",
            }}
          >
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Фойдаланувчи</th>
                <th style={thStyle}>Саҳифа</th>
                <th style={thStyle}>Кўриш</th>
                <th style={thStyle}>Қўшиш</th>
                <th style={thStyle}>Таҳрирлаш</th>
                <th style={thStyle}>Ўчириш</th>
                <th style={thStyle}>Экспорт</th>
                <th style={thStyle}>Чоп этиш</th>
                <th style={thStyle}>Доступни бошқариш</th>
                <th style={thStyle}>Амал</th>
              </tr>
            </thead>
            <tbody>
              {overrides.map((item) => {
                const isDeletingThisRow = overrideDeletingId === item.id;
                const isEditingThisRow = editingOverrideId === item.id;

                return (
                  <tr key={item.id}>
                    <td style={tdStyle}>{item.id}</td>
                    <td style={tdStyle}>{item.username}</td>
                    <td style={tdStyle}>{item.page_label}</td>
                    <td style={tdStyle}>{overrideText(item.can_view)}</td>
                    <td style={tdStyle}>{overrideText(item.can_add)}</td>
                    <td style={tdStyle}>{overrideText(item.can_edit)}</td>
                    <td style={tdStyle}>{overrideText(item.can_delete)}</td>
                    <td style={tdStyle}>{overrideText(item.can_export)}</td>
                    <td style={tdStyle}>{overrideText(item.can_print)}</td>
                    <td style={tdStyle}>{overrideText(item.can_manage_access)}</td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => handleOverrideEdit(item)}
                          style={smallEditButtonStyle}
                          disabled={isDeletingThisRow}
                        >
                          {isEditingThisRow ? "Таҳрирланмоқда..." : "Таҳрирлаш"}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOverrideDelete(item)}
                          style={smallDeleteButtonStyle}
                          disabled={isDeletingThisRow}
                        >
                          {isDeletingThisRow ? "Ўчирилмоқда..." : "Ўчириш"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {overrides.length === 0 ? (
                <tr>
                  <td style={tdStyle} colSpan="11">
                    Override’лар топилмади.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}