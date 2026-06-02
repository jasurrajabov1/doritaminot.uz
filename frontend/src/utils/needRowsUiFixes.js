/*
  NeedRows UI fixes V12:
  - no DOM click interception (React state handles panels and checkbox selection)
  - only keeps route body class and marks checkbox-first tables for compact CSS
*/
(function installNeedRowsUiFixesV12() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__pharmNeedRowsUiFixesV12Installed) return;
  window.__pharmNeedRowsUiFixesV12Installed = true;

  const ROUTE = "/need-rows";
  let scheduled = false;

  function isNeedRowsRoute() {
    return window.location.pathname === ROUTE;
  }

  function tableHasFirstColumnCheckbox(table) {
    if (!table) return false;

    return Array.from(table.rows || [])
      .slice(0, 12)
      .some((row) => {
        const cell = row.cells && row.cells[0];
        return Boolean(cell && cell.querySelector('input[type="checkbox"]'));
      });
  }

  function sync() {
    scheduled = false;
    const onNeedRows = isNeedRowsRoute();
    document.body.classList.toggle("route-need-rows", onNeedRows);

    if (!onNeedRows) return;

    for (const table of document.querySelectorAll("table")) {
      if (tableHasFirstColumnCheckbox(table)) {
        table.classList.add("needrows-checkbox-first-col-table");
      }
    }
  }

  function scheduleSync() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(sync);
  }

  for (const methodName of ["pushState", "replaceState"]) {
    const original = window.history[methodName];
    if (typeof original !== "function" || original.__needRowsUiFixesV12) continue;

    const patched = function patchedHistoryMethod(...args) {
      const result = original.apply(this, args);
      setTimeout(scheduleSync, 0);
      return result;
    };

    patched.__needRowsUiFixesV12 = true;
    window.history[methodName] = patched;
  }

  window.addEventListener("popstate", () => setTimeout(scheduleSync, 0));
  window.addEventListener("resize", scheduleSync);

  const observer = new MutationObserver(() => {
    if (isNeedRowsRoute()) scheduleSync();
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleSync, { once: true });
  } else {
    scheduleSync();
  }
})();

export {};
