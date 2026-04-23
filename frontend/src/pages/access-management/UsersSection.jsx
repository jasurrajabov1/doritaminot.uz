import { yesNo } from "./helpers";
import {
  labelStyle,
  inputStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  smallEditButtonStyle,
  smallPasswordButtonStyle,
  smallDeleteButtonStyle,
  thStyle,
  tdStyle,
} from "./styles";

export default function UsersSection({
  editingUserId,
  userForm,
  setUserForm,
  userSaving,
  resetUserForm,
  handleUserSubmit,
  activeRoles,
  passwordTarget,
  newPassword,
  setNewPassword,
  handlePasswordSubmit,
  passwordSaving,
  setPasswordTarget,
  users,
  currentUserId,
  handleUserEdit,
  handleOpenPassword,
  handleUserDelete,
  handleToggleActive,
  userDeletingId,
}) {

  const getToggleButtonStyle = (isActive) => ({
    padding: "7px 10px",
    borderRadius: "8px",
    border: isActive ? "1px solid #f59e0b" : "1px solid #16a34a",
    background: isActive ? "#fffbeb" : "#f0fdf4",
    color: isActive ? "#b45309" : "#15803d",
    cursor: "pointer",
    fontSize: "13px",
  });

  const getDisabledActionReason = (user) => {
    if (user.id === currentUserId) {
      return "Ўзингизни бу амал билан ўзгартириб бўлмайди.";
    }

    const activeSuperusersCount = users.filter(
      (item) => item.is_superuser && item.is_active
    ).length;

    const isLastActiveSuperuser =
      user.is_superuser && user.is_active && activeSuperusersCount <= 1;

    if (isLastActiveSuperuser) {
      return "Охирги фаол superuser'га бу амални бажариб бўлмайди.";
    }

    return "";
  };

  const isDeleteDisabled = (user) => Boolean(getDisabledActionReason(user));
  const isToggleDisabled = (user) => Boolean(getDisabledActionReason(user));

  return (
    <>
      <div className="form-card" style={{ marginBottom: "16px" }}>
        <h3 style={{ marginTop: 0 }}>
          {editingUserId ? "Фойдаланувчини таҳрирлаш" : "Янги фойдаланувчи қўшиш"}
        </h3>

        <form onSubmit={handleUserSubmit} autoComplete="off">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "12px",
            }}
          >
            <div>
              <label style={labelStyle}>Логин</label>
              <input
                type="text"
                value={userForm.username}
                onChange={(e) =>
                  setUserForm((prev) => ({
                    ...prev,
                    username: e.target.value,
                  }))
                }
                placeholder="Логин"
                style={inputStyle}
                disabled={!!editingUserId}
                autoComplete="off"
              />
            </div>

            {!editingUserId ? (
              <div>
                <label style={labelStyle}>Пароль</label>
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(e) =>
                    setUserForm((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  placeholder="Пароль"
                  style={inputStyle}
                  autoComplete="new-password"
                />
              </div>
            ) : (
              <div>
                <label style={labelStyle}>Изоҳ</label>
                <div
                  style={{
                    ...inputStyle,
                    background: "#f8fafc",
                    color: "#475569",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  Логин backend қоидаси бўйича бу ерда ўзгартирилмайди
                </div>
              </div>
            )}

            <div>
              <label style={labelStyle}>Исм</label>
              <input
                type="text"
                value={userForm.first_name}
                onChange={(e) =>
                  setUserForm((prev) => ({
                    ...prev,
                    first_name: e.target.value,
                  }))
                }
                placeholder="Исм"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Фамилия</label>
              <input
                type="text"
                value={userForm.last_name}
                onChange={(e) =>
                  setUserForm((prev) => ({
                    ...prev,
                    last_name: e.target.value,
                  }))
                }
                placeholder="Фамилия"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={userForm.email}
                onChange={(e) =>
                  setUserForm((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
                placeholder="email@example.com"
                style={inputStyle}
                autoComplete="off"
              />
            </div>

            <div>
              <label style={labelStyle}>Роль</label>
              <select
                value={userForm.role_id}
                onChange={(e) =>
                  setUserForm((prev) => ({
                    ...prev,
                    role_id: e.target.value,
                  }))
                }
                style={inputStyle}
              >
                <option value="">Ролсиз</option>
                {activeRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "16px",
              flexWrap: "wrap",
              marginTop: "12px",
            }}
          >
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
                checked={userForm.is_active}
                onChange={(e) =>
                  setUserForm((prev) => ({
                    ...prev,
                    is_active: e.target.checked,
                  }))
                }
              />
              Фаол
            </label>

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
                checked={userForm.is_staff}
                onChange={(e) =>
                  setUserForm((prev) => ({
                    ...prev,
                    is_staff: e.target.checked,
                  }))
                }
              />
              Staff
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
              disabled={userSaving}
            >
              {userSaving
                ? "Сақланмоқда..."
                : editingUserId
                ? "Янгилаш"
                : "Фойдаланувчи қўшиш"}
            </button>

            <button
              type="button"
              onClick={resetUserForm}
              style={secondaryButtonStyle}
            >
              Тозалаш
            </button>
          </div>
        </form>
      </div>

      {passwordTarget ? (
        <div className="form-card" style={{ marginBottom: "16px" }}>
          <h3 style={{ marginTop: 0 }}>
            Пароль янгилаш: {passwordTarget.username}
          </h3>

          <form onSubmit={handlePasswordSubmit}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(260px, 420px)",
                gap: "12px",
              }}
            >
              <div>
                <label style={labelStyle}>Янги пароль</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Янги пароль"
                  style={inputStyle}
                />
              </div>
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
                disabled={passwordSaving}
              >
                {passwordSaving ? "Янгиланмоқда..." : "Пароль янгилаш"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setPasswordTarget(null);
                  setNewPassword("");
                }}
                style={secondaryButtonStyle}
              >
                Ёпиш
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="form-card">
        <h3 style={{ marginTop: 0 }}>Фойдаланувчилар рўйхати</h3>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: "1200px",
            }}
          >
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Логин</th>
                <th style={thStyle}>ФИШ</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Роль</th>
                <th style={thStyle}>Фаол</th>
                <th style={thStyle}>Staff</th>
                <th style={thStyle}>Superuser</th>
                <th style={thStyle}>Амал</th>
              </tr>
            </thead>
            <tbody>
              {users.map((item) => {

                return (
                  <tr key={item.id}>
                    <td style={tdStyle}>{item.id}</td>
                    <td style={tdStyle}>{item.username}</td>
                    <td style={tdStyle}>{item.full_name || item.username}</td>
                    <td style={tdStyle}>{item.email || "—"}</td>
                    <td style={tdStyle}>{item.role?.name || "Ролсиз"}</td>
                    <td style={tdStyle}>{yesNo(item.is_active)}</td>
                    <td style={tdStyle}>{yesNo(item.is_staff)}</td>
                    <td style={tdStyle}>{yesNo(item.is_superuser)}</td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => handleUserEdit(item)}
                          style={smallEditButtonStyle}
                        >
                          Таҳрирлаш
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenPassword(item)}
                          style={smallPasswordButtonStyle}
                        >
                          Пароль
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(item)}
                          style={{
                            ...getToggleButtonStyle(item.is_active),
                            opacity:
                              userDeletingId === item.id || isToggleDisabled(item)
                                ? 0.55
                                : 1,
                            cursor:
                              userDeletingId === item.id || isToggleDisabled(item)
                                ? "not-allowed"
                                : "pointer",
                          }}
                          disabled={userDeletingId === item.id || isToggleDisabled(item)}
                          title={
                            getDisabledActionReason(item) ||
                            (item.is_active
                              ? "Фойдаланувчини нофаол қилиш"
                              : "Фойдаланувчини фаол қилиш")
                          }
                        >
                          {userDeletingId === item.id
                            ? "Кутилмоқда..."
                            : item.is_active
                            ? "Нофаол қилиш"
                            : "Фаол қилиш"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUserDelete(item)}
                          style={{
                            ...smallDeleteButtonStyle,
                            opacity:
                              userDeletingId === item.id || isDeleteDisabled(item)
                                ? 0.55
                                : 1,
                            cursor:
                              userDeletingId === item.id || isDeleteDisabled(item)
                                ? "not-allowed"
                                : "pointer",
                          }}
                          disabled={userDeletingId === item.id || isDeleteDisabled(item)}
                          title={getDisabledActionReason(item) || "Фойдаланувчини ўчириш"}
                        >
                          {userDeletingId === item.id
                            ? "Ўчирилмоқда..."
                            : "Ўчириш"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 ? (
                <tr>
                  <td style={tdStyle} colSpan="9">
                    Фойдаланувчилар топилмади.
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