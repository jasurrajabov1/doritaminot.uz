import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import AccessDeniedPage from "../pages/AccessDeniedPage";
import { clearAuthToken, fetchCurrentUser } from "../api/client";
import { getStoredCurrentUser, hasToken } from "./routeHelpers";
import { canViewPage } from "../utils/permission";

export default function ProtectedRoute({ children, pageCode }) {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    let active = true;

    async function checkAuth() {
      if (!hasToken()) {
        if (active) setStatus("no-token");
        return;
      }

      const storedUser = getStoredCurrentUser();

      if (storedUser) {
        if (active) setStatus("ready");
        return;
      }

      try {
        await fetchCurrentUser();

        if (active) {
          setStatus("ready");
        }
      } catch (error) {
        console.error(error);
        clearAuthToken();

        if (active) {
          setStatus("no-token");
        }
      }
    }

    checkAuth();

    return () => {
      active = false;
    };
  }, []);

  if (status === "checking") {
    return <div style={{ padding: "24px" }}>Юкланмоқда...</div>;
  }

  if (status === "no-token") {
    return <Navigate to="/login" replace />;
  }

  if (pageCode && !canViewPage(pageCode)) {
    return <AccessDeniedPage />;
  }

  return children;
}