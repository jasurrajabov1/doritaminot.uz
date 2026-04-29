import { yesNo } from "./helpers";
import { PermissionCheckbox } from "./AccessUi";
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

export default function PermissionsSection({
  editingPermissionId,
  permissionForm,
  setPermissionForm,
  permissionSaving,
  resetPermissionForm,
  handlePermissionSubmit,
  roles,
  pages,
  pagePermissions,
  handlePermissionEdit,
  handlePermissionDelete,
  permissionDeletingId,
}) {
  return (
    <>
      <div className="form-card" style={{ marginBottom: "16px" }}>
        <h3 style={{ marginTop: 0 }}>
          {editingPermissionId
            ? "Саҳифа рухсатини таҳрирлаш"
            : "Янги саҳифа рухсати қўшиш"}
        </h3>

        <form onSubmit={handlePermissionSubmit}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "12px",
            }}
          >
            <div>
              <label style={labelStyle}>Роль</label>
              <select
                value={permissionForm.role}
                onChange={(e) =>
                  setPermissionForm((prev) => ({
                    ...prev,
                    role: e.target.value,
                  }))
                }
                style={inputStyle}
              >
                <option value="">Роль танланг</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                    {role.is_active ? "" : " (нофаол)"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Саҳифа</label>
              <select
                value={permissionForm.page_code}
                onChange={(e) =>
                  setPermissionForm((prev) => ({
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
            <PermissionCheckbox
              label="Кўриш"
              checked={permissionForm.can_view}
              onChange={(e) =>
                setPermissionForm((prev) => ({
                  ...prev,
                  can_view: e.target.checked,
                }))
              }
            />

            <PermissionCheckbox
              label="Қўшиш"
              checked={permissionForm.can_add}
              onChange={(e) =>
                setPermissionForm((prev) => ({
                  ...prev,
                  can_add: e.target.checked,
                }))
              }
            />

            <PermissionCheckbox
              label="Таҳрирлаш"
              checked={permissionForm.can_edit}
              onChange={(e) =>
                setPermissionForm((prev) => ({
                  ...prev,
                  can_edit: e.target.checked,
                }))
              }
            />

            <PermissionCheckbox
              label="Ўчириш"
              checked={permissionForm.can_delete}
              onChange={(e) =>
                setPermissionForm((prev) => ({
                  ...prev,
                  can_delete: e.target.checked,
                }))
              }
            />

            <PermissionCheckbox
              label="Экспорт"
              checked={permissionForm.can_export}
              onChange={(e) =>
                setPermissionForm((prev) => ({
                  ...prev,
                  can_export: e.target.checked,
                }))
              }
            />

            <PermissionCheckbox
              label="Чоп этиш"
              checked={permissionForm.can_print}
              onChange={(e) =>
                setPermissionForm((prev) => ({
                  ...prev,
                  can_print: e.target.checked,
                }))
              }
            />

            <PermissionCheckbox
              label="Доступни бошқариш"
              checked={permissionForm.can_manage_access}
              onChange={(e) =>
                setPermissionForm((prev) => ({
                  ...prev,
                  can_manage_access: e.target.checked,
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
              disabled={permissionSaving}
            >
              {permissionSaving
                ? "Сақланмоқда..."
                : editingPermissionId
                ? "Янгилаш"
                : "Рухсат қўшиш"}
            </button>

            <button
              type="button"
              onClick={resetPermissionForm}
              style={secondaryButtonStyle}
            >
              Тозалаш
            </button>
          </div>
        </form>
      </div>

      <div className="form-card">
        <h3 style={{ marginTop: 0 }}>Саҳифа рухсатлари</h3>

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
                <th style={thStyle}>Роль</th>
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
              {pagePermissions.map((item) => {
                const isDeleting = permissionDeletingId === item.id;


                return (
                  <tr key={item.id}>
                    <td style={tdStyle}>{item.id}</td>
                    <td style={tdStyle}>{item.role_name}</td>
                    <td style={tdStyle}>{item.page_label}</td>
                    <td style={tdStyle}>{yesNo(item.can_view)}</td>
                    <td style={tdStyle}>{yesNo(item.can_add)}</td>
                    <td style={tdStyle}>{yesNo(item.can_edit)}</td>
                    <td style={tdStyle}>{yesNo(item.can_delete)}</td>
                    <td style={tdStyle}>{yesNo(item.can_export)}</td>
                    <td style={tdStyle}>{yesNo(item.can_print)}</td>
                    <td style={tdStyle}>{yesNo(item.can_manage_access)}</td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => handlePermissionEdit(item)}
                          style={smallEditButtonStyle}
                          disabled={false}
                          title="Рухсатни таҳрирлаш"
                        >
                          Таҳрирлаш
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePermissionDelete(item)}
                          style={{
                            ...smallDeleteButtonStyle,
                            opacity: isDeleting ? 0.55 : 1,
                            cursor: isDeleting ? "not-allowed" : "pointer",
                          }}
                          disabled={isDeleting}
                          title="Рухсатни ўчириш"
                        >
                          {isDeleting ? "Ўчирилмоқда..." : "Ўчириш"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {pagePermissions.length === 0 ? (
                <tr>
                  <td style={tdStyle} colSpan="11">
                    Саҳифа рухсатлари топилмади.
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