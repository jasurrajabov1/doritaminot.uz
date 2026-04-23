import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";

import LoginPage from "./pages/LoginPage";
import AccessDeniedPage from "./pages/AccessDeniedPage";
import NotFoundPage from "./pages/NotFoundPage";
import { PAGE_REGISTRY } from "./pages/pageRegistry";

import { getStoredCurrentUser } from "./routes/routeHelpers";
import MenuLink from "./routes/MenuLink";
import ProtectedRoute from "./routes/ProtectedRoute";
import PublicOnlyRoute from "./routes/PublicOnlyRoute";

import { canViewPage } from "./utils/permission";

import api, { clearAuthToken, fetchCurrentUser } from "./api/client";

function AppLayout() {
  const [currentUser, setCurrentUser] = useState(getStoredCurrentUser());

  useEffect(() => {
    let isMounted = true;

    async function loadMe() {
      try {
        const data = await fetchCurrentUser();
        if (isMounted) {
          setCurrentUser(data);
        }
      } catch (error) {
        console.error(error);
        clearAuthToken();
        window.location.href = "/login";
      }
    }

    loadMe();

    return () => {
      isMounted = false;
    };
  }, []);

const handleLogout = async () => {
  try {
    await api.post("/auth/logout/");
  } catch (error) {
    console.error(error);
  } finally {
    clearAuthToken();
    window.location.href = "/login";
  }
};

  function canView(pageCode) {
    return canViewPage(pageCode);
  }

  return (
    <>
      <div className="topbar">
        {PAGE_REGISTRY.filter((item) => canView(item.code)).map((item) => (
          <MenuLink key={item.code} to={item.path}>
            {item.label}
          </MenuLink>
        ))}

        <span className="app-title">
          {currentUser?.username ? currentUser.username : "pharm_demand_system"}
        </span>

        <button
          type="button"
          onClick={handleLogout}
          style={{
            marginLeft: "8px",
            border: "1px solid #cbd5e1",
            background: "#fff",
            color: "#0f172a",
            padding: "8px 12px",
            borderRadius: "10px",
            cursor: "pointer",
          }}
        >
          Чиқиш
        </button>
      </div>

      <Routes>
        {PAGE_REGISTRY.map((item) => {
          const PageComponent = item.component;

          return (
            <Route
              key={item.code}
              path={item.path}
              element={
                <ProtectedRoute pageCode={item.code}>
                  <PageComponent />
                </ProtectedRoute>
              }
            />
          );
        })}


        <Route
          path="/access-denied"
          element={
            <ProtectedRoute>
              <AccessDeniedPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          }
        />
        <Route path="/*" element={<AppLayout />} />
      </Routes>
    </BrowserRouter>
  );
}