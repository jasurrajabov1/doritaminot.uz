import { useNavigate } from "react-router-dom";
import { getDefaultPath, getStoredCurrentUser } from "../routes/routeHelpers";

export default function NotFoundPage() {
  const navigate = useNavigate();

  const currentUser = getStoredCurrentUser();
  const nextPath = getDefaultPath(currentUser?.allowed_pages || []);

  return (
    <div className="page-container">
      <div className="form-card" style={{ maxWidth: "760px", margin: "40px auto" }}>
        <h2>Саҳифа топилмади</h2>
        <p>Сиз очмоқчи бўлган манзил мавжуд эмас.</p>
        <p style={{ color: "#475569" }}>
          URL нотўғри ёзилган бўлиши мумкин ёки бу саҳифа ўчирилган.
        </p>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "16px" }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              padding: "10px 14px",
              borderRadius: "10px",
              border: "1px solid #cbd5e1",
              background: "#fff",
              color: "#0f172a",
              cursor: "pointer",
            }}
          >
            Орқага
          </button>

          <button
            type="button"
            onClick={() => navigate(nextPath)}
            style={{
              padding: "10px 14px",
              borderRadius: "10px",
              border: "1px solid #2563eb",
              background: "#2563eb",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Бош саҳифага ўтиш
          </button>
        </div>
      </div>
    </div>
  );
}