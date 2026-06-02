import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import LoginPage from "./pages/LoginPage";
import AccessDeniedPage from "./pages/AccessDeniedPage";
import NotFoundPage from "./pages/NotFoundPage";
import DrugOptionsPage from "./pages/DrugOptionsPage.jsx";
import ExcelImportPage from "./pages/ExcelImportPage.jsx";
import { PAGE_REGISTRY } from "./pages/pageRegistry";

import { getStoredCurrentUser, getDefaultPath } from "./routes/routeHelpers";
import MenuLink from "./routes/MenuLink";
import ProtectedRoute from "./routes/ProtectedRoute";
import PublicOnlyRoute from "./routes/PublicOnlyRoute";
import MustChangePasswordPage from "./pages/MustChangePasswordPage";
import { canViewPage } from "./utils/permission";
import { LanguageSwitcher, UiLanguageProvider, useUiLanguage } from "./i18n/UiLanguageProvider.jsx";
import { translateText } from "./i18n/uiTranslations";

import api, { clearAuthToken, fetchCurrentUser } from "./api/client";

function AppLayout() {
  const [currentUser, setCurrentUser] = useState(getStoredCurrentUser());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { language } = useUiLanguage();
  const isChangePasswordPage = window.location.pathname === "/change-password";
  
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

  useEffect(() => {
    const closeSidebar = () => setSidebarOpen(false);
    window.addEventListener("resize", closeSidebar);
    window.addEventListener("popstate", closeSidebar);
    return () => {
      window.removeEventListener("resize", closeSidebar);
      window.removeEventListener("popstate", closeSidebar);
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

  const defaultPath = getDefaultPath(currentUser?.allowed_pages || []);

  const visibleMenuItems = PAGE_REGISTRY.filter((item) => item.path !== "/drug-options")
    .filter((item) => canView(item.code));

  const closeMenu = () => setSidebarOpen(false);

  const appRoutes = (
    <>
      <GlobalRouteModeToolbar />
      <Routes>
        <Route index element={<Navigate to={defaultPath} replace />} />

        {PAGE_REGISTRY.filter((item) => item.path !== "/drug-options").map((item) => {
          const PageComponent = item.component;

          return (
            <Route
              key={`${item.code}-${item.path}`}
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
          path="/drug-options"
          element={
            <ProtectedRoute pageCode="access_management">
              <DrugOptionsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/excel-import"
          element={
            <ProtectedRoute pageCode="access_management">
              <ExcelImportPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/access-denied"
          element={
            <ProtectedRoute>
              <AccessDeniedPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/change-password"
          element={
            <ProtectedRoute>
              <MustChangePasswordPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );

  if (isChangePasswordPage) {
    return <main className="auth-main">{appRoutes}</main>;
  }

  return (
    <div className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      {sidebarCollapsed && (
        <button
          type="button"
          className="sidebar-floating-open-btn"
          onClick={() => setSidebarCollapsed(false)}
          aria-label="Менюни очиш"
        >
          ☰
        </button>
      )}
      <button
        type="button"
        className="app-mobile-menu-button"
        onClick={() => setSidebarOpen(true)}
        aria-label="Меню"
      >
        ☰
      </button>

      <aside className={`app-sidebar ${sidebarOpen ? "is-open" : ""}`}>
        <button
          className="sidebar-toggle-btn"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          {sidebarCollapsed ? "☰" : "←"}
        </button>
        <div className="app-brand">
          <div className="app-brand-mark">P</div>
          <div>
            <strong>Потребност</strong>
            <span>Дори эҳтиёжи назорати</span>
          </div>
        </div>

        <nav className="app-menu" aria-label="Меню">
          {visibleMenuItems.map((item) => (
            <MenuLink
              key={`${item.code}-${item.path}`}
              to={item.path}
              onClick={closeMenu}
            >
              {translateText(item.label, language)}
            </MenuLink>
          ))}

          {canView("access_management") && (
            <MenuLink to="/drug-options" onClick={closeMenu}>
              {translateText("Дори справочниклари", language)}
            </MenuLink>
          )}

          {canView("access_management") && (
            <MenuLink to="/excel-import" onClick={closeMenu}>
              {translateText("Excel import", language)}
            </MenuLink>
          )}
        </nav>

        <div className="app-sidebar-footer">
          <LanguageSwitcher />

          <div className="app-user-card">
            <span className="app-user-label">User</span>
            <strong>{currentUser?.username ? currentUser.username : "pharm_demand_system"}</strong>
          </div>

          <button type="button" onClick={handleLogout} className="app-logout-button">
            {translateText("Чиқиш", language)}
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          type="button"
          className="app-sidebar-backdrop"
          aria-label="Менюни ёпиш"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="app-main">
        <div className="app-mobile-topbar">
          <div className="app-mobile-title">
            <strong>Потребност</strong>
            <span>{currentUser?.username || "pharm_demand_system"}</span>
          </div>
          <LanguageSwitcher />
        </div>

        {appRoutes}
      </main>
    </div>
  );
}

function getGlobalRouteModePath() {
  return typeof window !== "undefined" ? window.location.pathname : "";
}

function GlobalRouteModeToolbar() {
  const [path, setPath] = useState(() => getGlobalRouteModePath());
  const [mode, setMode] = useState("normal");

  const routeConfig = useMemo(() => {
    if (path.startsWith("/need-rows")) {
      return {
        key: "needRows",
        bodyClass: "route-need-rows",
        title: "Эҳтиёж",
      };
    }

    if (path.startsWith("/monthly-issues")) {
      return {
        key: "monthlyIssues",
        bodyClass: "route-monthly-issues",
        title: "Берилган миқдор",
      };
    }

    if (path.startsWith("/stock-summary")) {
      return {
        key: "stockSummary",
        bodyClass: "route-stock-summary",
        title: "Омбор қолдиғи",
      };
    }

    if (path.startsWith("/institutions")) {
      return {
        key: "institutions",
        bodyClass: "route-institutions",
        title: "Муассасалар",
      };
    }

    if (path.startsWith("/drugs")) {
      return {
        key: "drugs",
        bodyClass: "route-drugs",
        title: "Дорилар",
      };
    }

    if (path.startsWith("/prices")) {
      return {
        key: "prices",
        bodyClass: "route-prices",
        title: "Нархлар",
      };
    }

    if (path.startsWith("/need-rows-summary")) {
      return {
        key: "needRowsSummary",
        bodyClass: "route-need-rows-summary",
        title: "Эҳтиёжлар сводкаси",
      };
    }

    return null;
  }, [path]);

  const routeKey = routeConfig?.key || "";
  const routeBodyClass = routeConfig?.bodyClass || "";
  const routeTitle = routeConfig?.title || "";
  const storageKey = routeKey ? `route-ui-mode-${routeKey}` : "route-ui-mode-none";

  useEffect(() => {
    const updatePath = () => setPath(getGlobalRouteModePath());

    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function patchedPushState(...args) {
      const result = originalPushState.apply(this, args);
      window.dispatchEvent(new Event("route-mode-location-change"));
      return result;
    };

    window.history.replaceState = function patchedReplaceState(...args) {
      const result = originalReplaceState.apply(this, args);
      window.dispatchEvent(new Event("route-mode-location-change"));
      return result;
    };

    window.addEventListener("popstate", updatePath);
    window.addEventListener("route-mode-location-change", updatePath);

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener("popstate", updatePath);
      window.removeEventListener("route-mode-location-change", updatePath);
    };
  }, []);

  useEffect(() => {
    if (!routeKey) {
      setMode("normal");
      return;
    }

    try {
      setMode(localStorage.getItem(storageKey) || "normal");
    } catch {
      setMode("normal");
    }
  }, [routeKey, storageKey]);

  useEffect(() => {
    const routeClasses = [
      "route-need-rows",
      "route-monthly-issues",
      "route-stock-summary",
      "route-institutions",
      "route-drugs",
      "route-prices",
      "route-need-rows-summary",
    ];
    const modeClasses = ["page-mode-compact", "page-mode-table"];

    document.body.classList.remove(...routeClasses, ...modeClasses);

    if (!routeBodyClass) return;

    document.body.classList.add(routeBodyClass);

    if (mode !== "normal") {
      document.body.classList.add(`page-mode-${mode}`);
    }

    return () => {
      document.body.classList.remove(...routeClasses, ...modeClasses);
    };
  }, [routeBodyClass, mode]);

  if (!routeConfig) return null;

  const changeMode = (nextMode) => {
    setMode(nextMode);

    try {
      localStorage.setItem(storageKey, nextMode);
    } catch {
      // localStorage ishlamasa ham sahifa ishlayveradi
    }
  };

  return (
    <div className="global-route-mode-toolbar">
      <div className="global-route-mode-title">
        <strong>{routeTitle}</strong>
        <span>режим: юқори блокларни очиб/яшириш</span>
      </div>

      <div className="global-route-mode-actions">
        <button
          type="button"
          className={mode === "normal" ? "primary" : ""}
          onClick={() => changeMode("normal")}
        >
          Одатий
        </button>

        <button
          type="button"
          className={mode === "compact" ? "primary" : ""}
          onClick={() => changeMode("compact")}
        >
          Ихчам
        </button>

        <button
          type="button"
          className={mode === "table" ? "primary" : ""}
          onClick={() => changeMode("table")}
        >
          Жадвал режими
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <UiLanguageProvider>
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
    </UiLanguageProvider>
  );
}
