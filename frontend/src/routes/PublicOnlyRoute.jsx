import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { clearAuthToken, fetchCurrentUser } from "../api/client";
import { getDefaultPath, getStoredCurrentUser, hasToken } from "./routeHelpers";

export default function PublicOnlyRoute({ children }) {
  const location = useLocation();
  const [status, setStatus] = useState("checking");
  const [nextPath, setNextPath] = useState(null);

  useEffect(() => {
    let active = true;

    async function resolveAccess() {
      if (!hasToken()) {
        if (active) setStatus("guest");
        return;
      }

      const storedUser = getStoredCurrentUser();

      if (storedUser) {
        const allowedPages = storedUser.allowed_pages || [];
        const path = getDefaultPath(allowedPages);

        if (active) {
          setNextPath(path);
          setStatus("redirect");
        }
        return;
      }

      try {
        const currentUser = await fetchCurrentUser();
        const allowedPages = currentUser?.allowed_pages || [];
        const path = getDefaultPath(allowedPages);

        if (active) {
          setNextPath(path);
          setStatus("redirect");
        }
      } catch (error) {
        console.error(error);
        clearAuthToken();

        if (active) {
          setStatus("guest");
        }
      }
    }

    resolveAccess();

    return () => {
      active = false;
    };
  }, []);

  if (status === "checking") {
    return <div style={{ padding: "24px" }}>Юкланмоқда...</div>;
  }

  if (status === "redirect" && nextPath) {
    return <Navigate to={nextPath} replace state={{ from: location }} />;
  }

  return children;
}