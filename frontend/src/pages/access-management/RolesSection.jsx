import { yesNo } from "./helpers";
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

const PROTECTED_ROLE_NAMES = ["Админ", "Оператор", "Кузатувчи"];

function isProtectedRole(role) {
  return PROTECTED_ROLE_NAMES.includes(String(role?.name || "").trim());
}

function getProtectedRoleReason(role) {
  return `"${role?.name || "Бу роль"}" стандарт роль. Уни бу ердан таҳрирлаш ёки ўчириш мумкин эмас.`;
}

export default function RolesSection({
  editingRoleId,
  roleForm,
  setRoleForm,
  roleSaving,
  resetRoleForm,
  handleRoleSubmit,
  roles,
  handleRoleEdit,
  handleRoleDelete,
  roleDeletingId,
}) {
  return (
    <>
      <div className="form-card" style={{ marginBottom: "16px" }}>
        <h3 style={{ marginTop: 0 }}>
          {editingRoleId ? "Рольни таҳрирлаш" : "Янги роль қўшиш"}
        </h3>

        <form onSubmit={handleRoleSubmit}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "12px",
            }}
          >
            <div>
              <label style={labelStyle}>Роль номи</label>
              <input
                type="text"
                value={roleForm.name}
                onChange={(e) =>
                  setRoleForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Масалан: Оператор"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Тавсиф</label>
              <input
                type="text"
                value={roleForm.description}
                onChange={(e) =>
                  setRoleForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Қисқа изоҳ"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ marginTop: "12px" }}>
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "14px",
              }}
            >
              <input
                type="checkbox"
                checked={roleForm.is_active}
                onChange={(e) =>
                  setRoleForm((prev) => ({
                    ...prev,
                    is_active: e.target.checked,
                  }))
                }
              />
              Фаол
            </label>
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
              disabled={roleSaving}
            >
              {roleSaving
                ? "Сақланмоқда..."
                : editingRoleId
                ? "Янгилаш"
                : "Роль қўшиш"}
            </button>

            <button
              type="button"
              onClick={resetRoleForm}
              style={secondaryButtonStyle}
            >
              Тозалаш
            </button>
          </div>
        </form>
      </div>

      <div className="form-card">
        <h3 style={{ marginTop: 0 }}>Роллар рўйхати</h3>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: "900px",
            }}
          >
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Номи</th>
                <th style={thStyle}>Тавсиф</th>
                <th style={thStyle}>Фаол</th>
                <th style={thStyle}>Яратилган</th>
                <th style={thStyle}>Амал</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((item) => {
                const isProtected = isProtectedRole(item);
                const isDeleting = roleDeletingId === item.id;

                return (
                  <tr key={item.id}>
                    <td style={tdStyle}>{item.id}</td>
                    <td style={tdStyle}>{item.name}</td>
                    <td style={tdStyle}>{item.description || "—"}</td>
                    <td style={tdStyle}>{yesNo(item.is_active)}</td>
                    <td style={tdStyle}>{item.created_at || "—"}</td>
                    <td style={tdStyle}>
                      <div
                        style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}
                      >
                        <button
                          type="button"
                          onClick={() => handleRoleEdit(item)}
                          style={{
                            ...smallEditButtonStyle,
                            opacity: isProtected ? 0.55 : 1,
                            cursor: isProtected ? "not-allowed" : "pointer",
                          }}
                          disabled={isProtected}
                          title={
                            isProtected
                              ? getProtectedRoleReason(item)
                              : "Рольни таҳрирлаш"
                          }
                        >
                          Таҳрирлаш
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRoleDelete(item)}
                          style={{
                            ...smallDeleteButtonStyle,
                            opacity: isProtected || isDeleting ? 0.55 : 1,
                            cursor:
                              isProtected || isDeleting
                                ? "not-allowed"
                                : "pointer",
                          }}
                          disabled={isProtected || isDeleting}
                          title={
                            isProtected
                              ? getProtectedRoleReason(item)
                              : "Рольни ўчириш"
                          }
                        >
                          {isDeleting ? "Ўчирилмоқда..." : "Ўчириш"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {roles.length === 0 ? (
                <tr>
                  <td style={tdStyle} colSpan="6">
                    Роллар топилмади.
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