import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import AccessDeniedPage from "../pages/AccessDeniedPage";
import { clearAuthToken, fetchCurrentUser } from "../api/client";
import { canViewPage } from "../utils/permission";
import { getStoredCurrentUser, hasToken, getDefaultPath } from "./routeHelpers";

export default function ProtectedRoute({ children, pageCode }) {
  const [status, setStatus] = useState("checking");
  const [currentUser, setCurrentUser] = useState(getStoredCurrentUser());
  const location = useLocation();

  useEffect(() => {
    let active = true;

    async function checkAuth() {
      if (!hasToken()) {
        if (active) setStatus("no-token");
        return;
      }

      const storedUser = getStoredCurrentUser();

      if (storedUser) {
        if (active) {
          setCurrentUser(storedUser);
          setStatus("ready");
        }
        return;
      }

      try {
        const user = await fetchCurrentUser();

        if (active) {
          setCurrentUser(user);
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

  if (
    currentUser?.must_change_password &&
    location.pathname !== "/change-password"
  ) {
    return <Navigate to="/change-password" replace />;
  }

if (
  !currentUser?.must_change_password &&
  location.pathname === "/change-password"
) {
  const nextPath = getDefaultPath(currentUser?.allowed_pages || []);
  return <Navigate to={nextPath} replace />;
}

  if (pageCode && !canViewPage(pageCode)) {
    return <AccessDeniedPage />;
  }

  return children;
}