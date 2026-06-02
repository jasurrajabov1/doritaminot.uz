/*
  Global resizable table columns.
  - Header right edge'идан суриб устун кенгайтирилади/кичрайтирилади.
  - Width localStorage'да route + table + column бўйича сақланади.
  - 2 марта босиш: шу устун width'ини reset қилади.
  - Shift + 2 марта босиш: шу table'нинг ҳамма width'ларини reset қилади.
*/

(function installPharmResizableColumns() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__pharmResizableColumnsInstalled) return;
  window.__pharmResizableColumnsInstalled = true;

  const STORAGE_PREFIX = "pharm:resizable-columns:v3:";
  const TABLE_SELECTOR = [
    "table.grid-table",
    ".table-wrap table",
    ".page-container table",
    ".app table",
  ].join(", ");

  const MIN_WIDTH = 44;
  const MAX_WIDTH = 1200;

  let scheduled = false;

  function normalizeText(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);
  }

  function safeKey(value) {
    return normalizeText(value)
      .toLowerCase()
      .replace(/[^\p{L}\p{N}_-]+/gu, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 80) || "col";
  }

  function getHeaderRow(table) {
    if (!table) return null;
    if (table.tHead && table.tHead.rows && table.tHead.rows.length) {
      return table.tHead.rows[0];
    }
    return table.querySelector("thead tr");
  }

  function getHeaderCells(table) {
    const row = getHeaderRow(table);
    if (!row) return [];
    return Array.from(row.cells || []).filter((cell) => cell && cell.tagName === "TH");
  }

  function getAllTables() {
    return Array.from(document.querySelectorAll(TABLE_SELECTOR)).filter((table) => {
      if (!table || table.dataset.noResizeColumns === "1") return false;
      return getHeaderCells(table).length > 1;
    });
  }

  function getNearestTitle(table) {
    const container =
      table.closest(".page-container") ||
      table.closest("section") ||
      table.closest("main") ||
      document.body;

    if (!container) return "table";

    const headings = Array.from(container.querySelectorAll("h1,h2,h3,h4"));
    let best = "";

    for (const heading of headings) {
      if (heading.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING) {
        best = normalizeText(heading.textContent);
      }
    }

    return best || normalizeText(document.title) || "table";
  }

  function getTableStorageKey(table) {
    if (table.dataset.resizableStorageKey) {
      return STORAGE_PREFIX + table.dataset.resizableStorageKey;
    }

    const route = window.location.pathname || "root";
    const tables = getAllTables();
    const index = Math.max(0, tables.indexOf(table));
    const title = getNearestTitle(table);

    return STORAGE_PREFIX + safeKey(route) + ":" + index + ":" + safeKey(title);
  }

  function getColumnKey(th, index) {
    return "c:" + index + ":" + safeKey(th ? th.textContent : "");
  }

  function loadWidths(table) {
    try {
      const raw = window.localStorage.getItem(getTableStorageKey(table));
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function saveWidths(table, widths) {
    try {
      window.localStorage.setItem(getTableStorageKey(table), JSON.stringify(widths || {}));
    } catch {
      // localStorage unavailable бўлса, silently ignore.
    }
  }

  function resetTableWidths(table) {
    const headers = getHeaderCells(table);
    headers.forEach((th) => {
      th.style.width = "";
      th.style.minWidth = "";
      th.style.maxWidth = "";
    });

    const colgroup = table.querySelector("colgroup.pharm-resize-colgroup");
    if (colgroup) colgroup.remove();

    table.style.tableLayout = "";
    table.style.minWidth = "";
    table.style.width = "";

    try {
      window.localStorage.removeItem(getTableStorageKey(table));
    } catch {
      // ignore
    }
  }

  function ensureColgroup(table, count) {
    let colgroup = table.querySelector("colgroup.pharm-resize-colgroup");

    if (!colgroup) {
      colgroup = document.createElement("colgroup");
      colgroup.className = "pharm-resize-colgroup";
      table.insertBefore(colgroup, table.firstElementChild || null);
    }

    while (colgroup.children.length < count) {
      colgroup.appendChild(document.createElement("col"));
    }

    while (colgroup.children.length > count) {
      colgroup.removeChild(colgroup.lastElementChild);
    }

    return Array.from(colgroup.children);
  }

  function getColumnWidth(table, index) {
    const headers = getHeaderCells(table);
    const th = headers[index];
    if (!th) return 80;

    const width = th.getBoundingClientRect().width;
    if (Number.isFinite(width) && width > 0) return Math.round(width);

    const cssWidth = Number.parseFloat(window.getComputedStyle(th).width);
    if (Number.isFinite(cssWidth) && cssWidth > 0) return Math.round(cssWidth);

    return 80;
  }


  function isFirstCheckboxColumn(table, index) {
    if (index !== 0 || !table) return false;

    return Array.from(table.rows || [])
      .slice(0, 12)
      .some((row) => {
        const cell = row.cells && row.cells[0];
        return Boolean(cell && cell.querySelector('input[type="checkbox"]'));
      });
  }

  function updateTableMinWidth(table) {
    const headers = getHeaderCells(table);
    if (!headers.length) return;

    const colgroup = table.querySelector("colgroup.pharm-resize-colgroup");
    let total = 0;

    headers.forEach((th, index) => {
      const col = colgroup ? colgroup.children[index] : null;
      const colWidth = col ? Number.parseFloat(col.style.width) : 0;
      const width = colWidth || th.getBoundingClientRect().width || 80;
      total += Math.max(MIN_WIDTH, Math.round(width));
    });

    if (total > 0) {
      table.style.tableLayout = "fixed";
      table.style.minWidth = total + "px";
    }
  }

  function setColumnWidth(table, index, widthPx) {
    const headers = getHeaderCells(table);
    if (!headers[index]) return;
    if (isFirstCheckboxColumn(table, index)) return;

    const width = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Math.round(widthPx)));
    const cols = ensureColgroup(table, headers.length);
    const col = cols[index];

    col.style.width = width + "px";

    const th = headers[index];
    th.style.width = width + "px";
    th.style.minWidth = width + "px";
    th.style.maxWidth = width + "px";

    updateTableMinWidth(table);
  }

  function freezeCurrentWidths(table) {
    const headers = getHeaderCells(table);
    const cols = ensureColgroup(table, headers.length);

    headers.forEach((th, index) => {
      if (isFirstCheckboxColumn(table, index)) {
        th.classList.add("needrows-checkbox-first-col");
        return;
      }

      if (!cols[index].style.width) {
        const width = getColumnWidth(table, index);
        cols[index].style.width = width + "px";
        th.style.width = width + "px";
        th.style.minWidth = width + "px";
        th.style.maxWidth = width + "px";
      }
    });

    updateTableMinWidth(table);
  }

  function applyStoredWidths(table) {
    const headers = getHeaderCells(table);
    if (!headers.length) return;

    const stored = loadWidths(table);
    let applied = false;

    headers.forEach((th, index) => {
      if (isFirstCheckboxColumn(table, index)) {
        th.classList.add("needrows-checkbox-first-col");
        return;
      }

      const key = getColumnKey(th, index);
      const idxKey = "idx:" + index;
      const value = stored[key] || stored[idxKey];

      if (value) {
        setColumnWidth(table, index, value);
        applied = true;
      }
    });

    if (applied) updateTableMinWidth(table);
  }

  function saveCurrentWidths(table) {
    const headers = getHeaderCells(table);
    const widths = loadWidths(table);

    headers.forEach((th, index) => {
      if (isFirstCheckboxColumn(table, index)) return;

      const width = getColumnWidth(table, index);
      widths[getColumnKey(th, index)] = width;
      widths["idx:" + index] = width;
    });

    saveWidths(table, widths);
  }

  function removeColumnWidth(table, index) {
    const headers = getHeaderCells(table);
    const th = headers[index];
    if (!th) return;

    const widths = loadWidths(table);
    delete widths[getColumnKey(th, index)];
    delete widths["idx:" + index];
    saveWidths(table, widths);

    const colgroup = table.querySelector("colgroup.pharm-resize-colgroup");
    const col = colgroup ? colgroup.children[index] : null;
    if (col) col.style.width = "";

    th.style.width = "";
    th.style.minWidth = "";
    th.style.maxWidth = "";

    applyStoredWidths(table);
  }

  function startResize(event, table, index) {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth = getColumnWidth(table, index);

    freezeCurrentWidths(table);

    document.body.classList.add("column-resizing");

    const onMove = (moveEvent) => {
      const nextWidth = startWidth + (moveEvent.clientX - startX);
      setColumnWidth(table, index, nextWidth);
    };

    const onUp = () => {
      saveCurrentWidths(table);
      document.body.classList.remove("column-resizing");
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  function ensureHandles(table) {
    const headers = getHeaderCells(table);
    if (!headers.length) return;

    table.classList.add("resizable-columns-table");

    headers.forEach((th, index) => {
      if (isFirstCheckboxColumn(table, index)) {
        th.dataset.resizeColumnReady = "1";
        th.classList.add("needrows-checkbox-first-col");
        return;
      }

      if (th.dataset.resizeColumnReady === "1") return;

      th.dataset.resizeColumnReady = "1";
      th.classList.add("resizable-column-header");

      const handle = document.createElement("span");
      handle.className = "column-resize-handle";
      handle.setAttribute("role", "separator");
      handle.setAttribute("aria-hidden", "true");
      handle.title =
        "Устун кенглигини ўзгартириш. 2 марта босиш: устунни тиклаш. Shift + 2 марта босиш: жадвални тиклаш.";

      handle.addEventListener("mousedown", (event) => startResize(event, table, index));

      handle.addEventListener("dblclick", (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (event.shiftKey) {
          resetTableWidths(table);
        } else {
          removeColumnWidth(table, index);
        }
      });

      th.appendChild(handle);
    });
  }

  function initTables() {
    getAllTables().forEach((table) => {
      ensureHandles(table);
      applyStoredWidths(table);
    });
  }

  function scheduleInit() {
    if (scheduled) return;
    scheduled = true;

    window.requestAnimationFrame(() => {
      scheduled = false;
      initTables();
    });
  }

  function patchHistory() {
    ["pushState", "replaceState"].forEach((name) => {
      const original = window.history[name];
      if (typeof original !== "function" || original.__pharmResizePatched) return;

      const patched = function patchedHistoryMethod(...args) {
        const result = original.apply(this, args);
        setTimeout(scheduleInit, 0);
        return result;
      };

      patched.__pharmResizePatched = true;
      window.history[name] = patched;
    });

    window.addEventListener("popstate", () => setTimeout(scheduleInit, 0));
  }

  patchHistory();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleInit);
  } else {
    scheduleInit();
  }

  const observer = new MutationObserver(() => scheduleInit());
  observer.observe(document.body, { childList: true, subtree: true });
})();
