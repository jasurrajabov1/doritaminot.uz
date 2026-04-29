import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { setAuthToken } from "../api/client";
import { getDefaultPath } from "../routes/routeHelpers";

export default function MustChangePasswordPage() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await api.post("/auth/change-password/", {
        old_password: oldPassword,
        new_password: newPassword,
      });

      const token = response.data?.token;

      if (token) {
        setAuthToken(token);
      }

      const meResponse = await api.get("/auth/me/");
      const me = meResponse.data;

      sessionStorage.setItem("auth_me", JSON.stringify(me));

      const nextPath = getDefaultPath(me?.allowed_pages || []);
      navigate(nextPath, { replace: true });
    } catch (err) {
      setError(
        err?.response?.data?.old_password?.[0] ||
          err?.response?.data?.new_password?.[0] ||
          err?.response?.data?.detail ||
          "Паролни алмаштиришда хато юз берди."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrap">
      <div
        className="form-card"
        style={{ maxWidth: "520px", margin: "40px auto" }}
      >
        <h2>Паролни алмаштириш</h2>
        <p>Тизимга киришни давом эттириш учун янги парол ўрнатинг.</p>

        {error ? (
          <div className="error-box" style={{ marginBottom: "12px" }}>
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "12px" }}>
            <label>Жорий пароль</label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="Жорий пароль"
              autoComplete="current-password"
              required
            />
          </div>

          <div style={{ marginBottom: "12px" }}>
            <label>Янги пароль</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Янги пароль"
              autoComplete="new-password"
              required
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Сақланмоқда..." : "Паролни алмаштириш"}
          </button>
        </form>
      </div>
    </div>
  );
}