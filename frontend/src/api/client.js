import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem("auth_token");

    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export function setAuthToken(token) {
  if (token) {
    sessionStorage.setItem("auth_token", token);
  }
}

export function clearAuthToken() {
  sessionStorage.removeItem("auth_token");
  sessionStorage.removeItem("auth_me");
}

export async function fetchCurrentUser() {
  const res = await api.get("/auth/me/");
  sessionStorage.setItem("auth_me", JSON.stringify(res.data));
  return res.data;
}

export default api;