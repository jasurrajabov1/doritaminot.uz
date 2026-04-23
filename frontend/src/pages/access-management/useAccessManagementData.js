import { useEffect, useMemo, useState } from "react";
import api from "../../api/client";
import { toArray, extractError } from "./helpers";

export default function useAccessManagementData(canViewAccessManagement) {
  const [activeTab, setActiveTab] = useState("roles");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [pages, setPages] = useState([]);
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [pagePermissions, setPagePermissions] = useState([]);
  const [overrides, setOverrides] = useState([]);

  const [roleForm, setRoleForm] = useState({
    name: "",
    description: "",
    is_active: true,
  });
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [roleSaving, setRoleSaving] = useState(false);
  const [roleDeletingId, setRoleDeletingId] = useState(null);

  const [userForm, setUserForm] = useState({
    username: "",
    password: "",
    first_name: "",
    last_name: "",
    email: "",
    role_id: "",
    is_active: true,
    is_staff: false,
  });
  const [editingUserId, setEditingUserId] = useState(null);
  const [userSaving, setUserSaving] = useState(false);
  const [userDeletingId, setUserDeletingId] = useState(null);

  const [passwordTarget, setPasswordTarget] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [permissionForm, setPermissionForm] = useState({
    role: "",
    page_code: "",
    can_view: false,
    can_add: false,
    can_edit: false,
    can_delete: false,
    can_export: false,
    can_print: false,
    can_manage_access: false,
  });
  const [editingPermissionId, setEditingPermissionId] = useState(null);
  const [permissionSaving, setPermissionSaving] = useState(false);
  const [permissionDeletingId, setPermissionDeletingId] = useState(null);

  const [overrideForm, setOverrideForm] = useState({
    user: "",
    page_code: "",
    can_view: "",
    can_add: "",
    can_edit: "",
    can_delete: "",
    can_export: "",
    can_print: "",
    can_manage_access: "",
  });
  const [editingOverrideId, setEditingOverrideId] = useState(null);
  const [overrideSaving, setOverrideSaving] = useState(false);
  const [overrideDeletingId, setOverrideDeletingId] = useState(null);

  const activeRoles = useMemo(
    () => roles.filter((item) => item.is_active),
    [roles]
  );

  const stats = useMemo(() => {
    return {
      pages: pages.length,
      roles: roles.length,
      users: users.length,
      permissions: pagePermissions.length,
      overrides: overrides.length,
    };
  }, [pages, roles, users, pagePermissions, overrides]);

  const resetRoleForm = () => {
    setRoleForm({
      name: "",
      description: "",
      is_active: true,
    });
    setEditingRoleId(null);
  };

  const resetUserForm = () => {
    setUserForm({
      username: "",
      password: "",
      first_name: "",
      last_name: "",
      email: "",
      role_id: "",
      is_active: true,
      is_staff: false,
    });
    setEditingUserId(null);
    setPasswordTarget(null);
    setNewPassword("");
  };

  const resetPermissionForm = () => {
    setPermissionForm({
      role: "",
      page_code: "",
      can_view: false,
      can_add: false,
      can_edit: false,
      can_delete: false,
      can_export: false,
      can_print: false,
      can_manage_access: false,
    });
    setEditingPermissionId(null);
  };

  const resetOverrideForm = () => {
    setOverrideForm({
      user: "",
      page_code: "",
      can_view: "",
      can_add: "",
      can_edit: "",
      can_delete: "",
      can_export: "",
      can_print: "",
      can_manage_access: "",
    });
    setEditingOverrideId(null);
  };

  const loadAll = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        metaRes,
        rolesRes,
        usersRes,
        pagePermissionsRes,
        overridesRes,
      ] = await Promise.all([
        api.get("/auth/meta/"),
        api.get("/access/roles/"),
        api.get("/access/users/"),
        api.get("/access/page-permissions/"),
        api.get("/access/user-permission-overrides/"),
      ]);

      setPages(toArray(metaRes.data?.pages || []));
      setRoles(toArray(rolesRes.data));
      setUsers(toArray(usersRes.data));
      setPagePermissions(toArray(pagePermissionsRes.data));
      setOverrides(toArray(overridesRes.data));
    } catch (e) {
      console.error(e);
      setError(extractError(e, "Access маълумотларини юклашда хатолик юз берди."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canViewAccessManagement) {
      loadAll();
    }
  }, [canViewAccessManagement]);

  return {
    activeTab,
    setActiveTab,
    loading,
    setLoading,
    error,
    setError,
    success,
    setSuccess,

    pages,
    setPages,
    roles,
    setRoles,
    users,
    setUsers,
    pagePermissions,
    setPagePermissions,
    overrides,
    setOverrides,

    roleForm,
    setRoleForm,
    editingRoleId,
    setEditingRoleId,
    roleSaving,
    setRoleSaving,
    roleDeletingId,
    setRoleDeletingId,

    userForm,
    setUserForm,
    editingUserId,
    setEditingUserId,
    userSaving,
    setUserSaving,
    userDeletingId,
    setUserDeletingId,

    passwordTarget,
    setPasswordTarget,
    newPassword,
    setNewPassword,
    passwordSaving,
    setPasswordSaving,

    permissionForm,
    setPermissionForm,
    editingPermissionId,
    setEditingPermissionId,
    permissionSaving,
    setPermissionSaving,
    permissionDeletingId,
    setPermissionDeletingId,

    overrideForm,
    setOverrideForm,
    editingOverrideId,
    setEditingOverrideId,
    overrideSaving,
    setOverrideSaving,
    overrideDeletingId,
    setOverrideDeletingId,

    activeRoles,
    stats,

    resetRoleForm,
    resetUserForm,
    resetPermissionForm,
    resetOverrideForm,
    loadAll,
  };
}