import { useNavigate } from "react-router-dom";
import { getDefaultPath, getStoredCurrentUser } from "../routes/routeHelpers";

export default function AccessDeniedPage() {
  const navigate = useNavigate();

  const currentUser = getStoredCurrentUser();
  const nextPath = getDefaultPath(currentUser?.allowed_pages || []);

  return (
    <div className="page-container">
      <div className="form-card empty-state-card">
        <h2>Доступ йўқ</h2>
        <p>Сизда ушбу саҳифани очиш ҳуқуқи йўқ.</p>
        <p className="muted-text">
          Бу саҳифа ролиңиз ёки индивидуал рухсатларингизга кирмаган.
        </p>

        <div className="empty-state-actions">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary"
          >
            Орқага
          </button>

          <button
            type="button"
            onClick={() => navigate(nextPath)}
            className="btn-primary"
          >
            Бош саҳифага ўтиш
          </button>
        </div>
      </div>
    </div>
  );
}