import { useNavigate } from "react-router-dom";
import { getDefaultPath, getStoredCurrentUser } from "../routes/routeHelpers";

export default function NotFoundPage() {
  const navigate = useNavigate();

  const currentUser = getStoredCurrentUser();
  const nextPath = getDefaultPath(currentUser?.allowed_pages || []);

  return (
    <div className="page-container">
      <div className="form-card empty-state-card">
        <h2>Саҳифа топилмади</h2>
        <p>Сиз очмоқчи бўлган манзил мавжуд эмас.</p>
        <p className="muted-text">
          URL нотўғри ёзилган бўлиши мумкин ёки бу саҳифа ўчирилган.
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