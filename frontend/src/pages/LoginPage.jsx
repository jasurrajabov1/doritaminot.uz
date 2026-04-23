import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api, {
  setAuthToken,
  clearAuthToken,
  fetchCurrentUser,
} from "../api/client";
import { getDefaultPath } from "../routes/routeHelpers";

export default function LoginPage() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("Логин киритинг.");
      return;
    }

    if (!password.trim()) {
      setError("Парол киритинг.");
      return;
    }

    try {
      setLoading(true);

      const res = await api.post("/auth/login/", {
        username: username.trim(),
        password,
      });

      const token = res?.data?.token;

      if (!token) {
        setError("Token келмади.");
        return;
      }

      setAuthToken(token);

      const currentUser = await fetchCurrentUser();
      const allowedPages = currentUser?.allowed_pages || [];
      const nextPath = getDefaultPath(allowedPages);

      navigate(nextPath, { replace: true });
    } catch (err) {
      console.error(err);
      clearAuthToken();
      setError("Логин ёки парол нотўғри.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Тизимга кириш</h1>
        <p style={styles.subtitle}>Логин ва паролингизни киритинг</p>

        {error ? <div style={styles.error}>{error}</div> : null}

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="text"
            placeholder="Логин"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={styles.input}
          />

          <input
            type="password"
            placeholder="Парол"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
          />

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Кириляпти..." : "Кириш"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f8fafc",
    padding: "20px",
  },
  card: {
    width: "100%",
    maxWidth: "420px",
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
  },
  title: {
    margin: 0,
    marginBottom: "8px",
    fontSize: "28px",
    color: "#0f172a",
  },
  subtitle: {
    margin: 0,
    marginBottom: "16px",
    color: "#475569",
    fontSize: "14px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  input: {
    height: "42px",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    padding: "0 12px",
    fontSize: "14px",
  },
  button: {
    height: "42px",
    borderRadius: "10px",
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    fontSize: "14px",
    cursor: "pointer",
  },
  error: {
    marginBottom: "12px",
    background: "#fee2e2",
    color: "#991b1b",
    border: "1px solid #fecaca",
    borderRadius: "10px",
    padding: "10px 12px",
    fontSize: "14px",
  },
};