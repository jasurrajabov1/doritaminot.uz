import { SectionButton } from "./AccessUi";

export default function AccessManagementTop({
  error,
  success,
  stats,
  activeTab,
  onTabChange,
  onRefresh,
}) {
  return (
    <>
      <h2>Фойдаланувчилар ва доступ</h2>
      <p>Бу саҳифа backend access API’лардан live маълумотларни олади.</p>
      <p style={{ color: "#475569", marginTop: "-4px" }}>
        Ҳозир бешинчи босқичда User Override CRUD frontend’га чиқарилди.
      </p>

      {error ? (
        <div
          className="form-card"
          style={{
            marginTop: "16px",
            marginBottom: "16px",
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#991b1b",
          }}
        >
          {error}
        </div>
      ) : null}

      {success ? (
        <div
          className="form-card"
          style={{
            marginTop: "16px",
            marginBottom: "16px",
            border: "1px solid #bbf7d0",
            background: "#f0fdf4",
            color: "#166534",
          }}
        >
          {success}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
          marginTop: "16px",
          marginBottom: "16px",
        }}
      >
        <div className="form-card">
          <div style={{ fontSize: "13px", color: "#475569" }}>Саҳифалар</div>
          <div style={{ fontSize: "28px", fontWeight: 700 }}>{stats.pages}</div>
        </div>
        <div className="form-card">
          <div style={{ fontSize: "13px", color: "#475569" }}>Роллар</div>
          <div style={{ fontSize: "28px", fontWeight: 700 }}>{stats.roles}</div>
        </div>
        <div className="form-card">
          <div style={{ fontSize: "13px", color: "#475569" }}>Фойдаланувчилар</div>
          <div style={{ fontSize: "28px", fontWeight: 700 }}>{stats.users}</div>
        </div>
        <div className="form-card">
          <div style={{ fontSize: "13px", color: "#475569" }}>Саҳифа рухсатлари</div>
          <div style={{ fontSize: "28px", fontWeight: 700 }}>{stats.permissions}</div>
        </div>
        <div className="form-card">
          <div style={{ fontSize: "13px", color: "#475569" }}>Override’лар</div>
          <div style={{ fontSize: "28px", fontWeight: 700 }}>{stats.overrides}</div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "10px",
          marginBottom: "16px",
        }}
      >
        <SectionButton
          active={activeTab === "roles"}
          onClick={() => onTabChange("roles")}
        >
          Роллар
        </SectionButton>

        <SectionButton
          active={activeTab === "users"}
          onClick={() => onTabChange("users")}
        >
          Фойдаланувчилар
        </SectionButton>

        <SectionButton
          active={activeTab === "permissions"}
          onClick={() => onTabChange("permissions")}
        >
          Саҳифа рухсатлари
        </SectionButton>

        <SectionButton
          active={activeTab === "overrides"}
          onClick={() => onTabChange("overrides")}
        >
          Индивидуал override
        </SectionButton>

        <button
          type="button"
          onClick={onRefresh}
          style={{
            marginLeft: "auto",
            padding: "10px 14px",
            borderRadius: "10px",
            border: "1px solid #cbd5e1",
            background: "#fff",
            color: "#0f172a",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          Янгилаш
        </button>
      </div>
    </>
  );
}