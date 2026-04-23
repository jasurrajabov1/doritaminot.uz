const ACTION_KEYS = [
  "view",
  "add",
  "edit",
  "delete",
  "export",
  "print",
  "manage_access",
];

function emptyPermissions() {
  return {
    view: false,
    add: false,
    edit: false,
    delete: false,
    export: false,
    print: false,
    manage_access: false,
  };
}

function normalizeFlags(source = {}) {
  return {
    view: source.view ?? source.can_view ?? false,
    add: source.add ?? source.can_add ?? false,
    edit: source.edit ?? source.can_edit ?? false,
    delete: source.delete ?? source.can_delete ?? false,
    export: source.export ?? source.can_export ?? false,
    print: source.print ?? source.can_print ?? false,
    manage_access:
      source.manage_access ?? source.can_manage_access ?? false,
  };
}

function applyDefinedFlags(target, source = {}) {
  ACTION_KEYS.forEach((key) => {
    if (source[key] !== undefined && source[key] !== null) {
      target[key] = !!source[key];
    }
  });
  return target;
}

function getPageCodeFromRow(row) {
  if (!row) return null;
  return (
    row.page_code ||
    row.pageCode ||
    row.code ||
    row.page?.code ||
    row.page?.page_code ||
    null
  );
}

function getRowsFromUser(currentUser) {
  return {
    roleRows:
      currentUser?.page_permissions ||
      currentUser?.role_permissions ||
      currentUser?.permissions_list ||
      [],
    overrideRows:
      currentUser?.user_permission_overrides ||
      currentUser?.permission_overrides ||
      currentUser?.overrides ||
      [],
  };
}

function buildPermissionsFromRows(currentUser, pageCode) {
  const result = emptyPermissions();
  const { roleRows, overrideRows } = getRowsFromUser(currentUser);

  roleRows
    .filter((row) => getPageCodeFromRow(row) === pageCode)
    .forEach((row) => {
      applyDefinedFlags(result, normalizeFlags(row));
    });

  overrideRows
    .filter((row) => getPageCodeFromRow(row) === pageCode)
    .forEach((row) => {
      const normalized = {
        view: row.view ?? row.can_view,
        add: row.add ?? row.can_add,
        edit: row.edit ?? row.can_edit,
        delete: row.delete ?? row.can_delete,
        export: row.export ?? row.can_export,
        print: row.print ?? row.can_print,
        manage_access: row.manage_access ?? row.can_manage_access,
      };

      applyDefinedFlags(result, normalized);
    });

  return result;
}

export function getCurrentUser() {
  try {
    return JSON.parse(sessionStorage.getItem("auth_me") || "null");
  } catch {
    return null;
  }
}


export function getPagePermissions(pageCode) {
  const currentUser = getCurrentUser();

  if (!currentUser || !pageCode) {
    return emptyPermissions();
  }

  const directPermissions = currentUser?.permissions?.[pageCode];
  if (directPermissions) {
    return {
      ...emptyPermissions(),
      ...normalizeFlags(directPermissions),
    };
  }

  return buildPermissionsFromRows(currentUser, pageCode);
}

export function canViewPage(pageCode) {
  const currentUser = getCurrentUser();
  if (!currentUser || !pageCode) return false;

  if (pageCode === "access_management") {
    return canDo("access_management", "manage_access");
  }

  const directPermissions = currentUser?.permissions?.[pageCode];
  if (directPermissions) {
    return !!normalizeFlags(directPermissions).view;
  }

  const allowedPages = currentUser?.allowed_pages || [];
  if (allowedPages.includes(pageCode)) {
    return true;
  }

  return !!getPagePermissions(pageCode).view;
}

export function canDo(pageCode, action) {
  const permissions = getPagePermissions(pageCode);
  return !!permissions?.[action];
}

export function canManageAccessPage() {
  return canDo("access_management", "manage_access");
}