export function SectionButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "10px 14px",
        borderRadius: "10px",
        border: active ? "1px solid #2563eb" : "1px solid #cbd5e1",
        background: active ? "#2563eb" : "#fff",
        color: active ? "#fff" : "#0f172a",
        cursor: "pointer",
        fontSize: "14px",
      }}
    >
      {children}
    </button>
  );
}

export function PermissionCheckbox({ label, checked, onChange }) {
  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        fontSize: "14px",
      }}
    >
      <input type="checkbox" checked={checked} onChange={onChange} />
      {label}
    </label>
  );
}

const labelStyle = {
  display: "block",
  fontSize: "14px",
  fontWeight: 600,
  marginBottom: "6px",
  color: "#0f172a",
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  fontSize: "14px",
  boxSizing: "border-box",
};

export function OverrideSelect({ label, value, onChange }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <select value={value} onChange={onChange} style={inputStyle}>
        <option value="">Мерос қолдириш</option>
        <option value="true">Ҳа</option>
        <option value="false">Йўқ</option>
      </select>
    </div>
  );
}