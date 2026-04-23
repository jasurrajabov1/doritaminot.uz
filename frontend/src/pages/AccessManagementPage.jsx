import { canManageAccessPage, getCurrentUser } from "../utils/permission";
import RolesSection from "./access-management/RolesSection";
import UsersSection from "./access-management/UsersSection";
import PermissionsSection from "./access-management/PermissionsSection";
import OverridesSection from "./access-management/OverridesSection";
import AccessManagementTop from "./access-management/AccessManagementTop";
import useAccessManagementData from "./access-management/useAccessManagementData";
import useRoleActions from "./access-management/useRoleActions";
import useUserActions from "./access-management/useUserActions";
import usePermissionActions from "./access-management/usePermissionActions";
import useOverrideActions from "./access-management/useOverrideActions";

export default function AccessManagementPage() {
  const canViewAccessManagement = canManageAccessPage();
  const currentUser = getCurrentUser();
  const currentUserId = currentUser?.id || null;

  const {
    activeTab,
    setActiveTab,
    loading,
    error,
    setError,
    success,
    setSuccess,

    pages,
    roles,
    users,
    pagePermissions,
    overrides,

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
  } = useAccessManagementData(canViewAccessManagement);

  const { handleRoleSubmit, handleRoleEdit, handleRoleDelete } =
    useRoleActions({
      roleForm,
      editingRoleId,
      setRoleSaving,
      setError,
      setSuccess,
      resetRoleForm,
      loadAll,
      setActiveTab,
      setEditingRoleId,
      setRoleForm,
      setRoleDeletingId,
    });

  const {
    handleUserSubmit,
    handleUserEdit,
    handleOpenPassword,
    handlePasswordSubmit,
    handleUserDelete,
    handleToggleActive,
  } = useUserActions({
    editingUserId,
    userForm,
    setUserSaving,
    setError,
    setSuccess,
    resetUserForm,
    loadAll,
    setActiveTab,
    setEditingUserId,
    setPasswordTarget,
    setNewPassword,
    setUserForm,
    passwordTarget,
    newPassword,
    setPasswordSaving,
    setUserDeletingId,
    users,
    currentUserId,
  });

  const {
    handlePermissionSubmit,
    handlePermissionEdit,
    handlePermissionDelete,
  } = usePermissionActions({
    permissionForm,
    editingPermissionId,
    setPermissionSaving,
    setError,
    setSuccess,
    resetPermissionForm,
    loadAll,
    setActiveTab,
    setEditingPermissionId,
    setPermissionForm,
    setPermissionDeletingId,
  });

  const {
    handleOverrideSubmit,
    handleOverrideEdit,
    handleOverrideDelete,
  } = useOverrideActions({
    overrideForm,
    editingOverrideId,
    setOverrideSaving,
    setError,
    setSuccess,
    resetOverrideForm,
    loadAll,
    setActiveTab,
    setEditingOverrideId,
    setOverrideForm,
    setOverrideDeletingId,
  });
  
  if (!canViewAccessManagement) {
    return (
      <div className="page-container">
        Сизда ушбу саҳифани кўриш ҳуқуқи йўқ.
      </div>
    );
  }

  return (
    <div className="page-container">
      <AccessManagementTop
        error={error}
        success={success}
        stats={stats}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onRefresh={loadAll}
      />

      {loading ? <div className="form-card">Юкланмоқда...</div> : null}

      {!loading && activeTab === "roles" ? (
        <RolesSection
          editingRoleId={editingRoleId}
          roleForm={roleForm}
          setRoleForm={setRoleForm}
          roleSaving={roleSaving}
          resetRoleForm={resetRoleForm}
          handleRoleSubmit={handleRoleSubmit}
          roles={roles}
          handleRoleEdit={handleRoleEdit}
          handleRoleDelete={handleRoleDelete}
          roleDeletingId={roleDeletingId}
        />
      ) : null}

      {!loading && activeTab === "users" ? (
        <UsersSection
          editingUserId={editingUserId}
          userForm={userForm}
          setUserForm={setUserForm}
          userSaving={userSaving}
          resetUserForm={resetUserForm}
          handleUserSubmit={handleUserSubmit}
          activeRoles={activeRoles}
          passwordTarget={passwordTarget}
          newPassword={newPassword}
          setNewPassword={setNewPassword}
          handlePasswordSubmit={handlePasswordSubmit}
          passwordSaving={passwordSaving}
          setPasswordTarget={setPasswordTarget}
          users={users}
          currentUserId={currentUserId}
          handleUserEdit={handleUserEdit}
          handleOpenPassword={handleOpenPassword}
          handleUserDelete={handleUserDelete}
          handleToggleActive={handleToggleActive}
          userDeletingId={userDeletingId}
        />
      ) : null}

      {!loading && activeTab === "permissions" ? (
        <PermissionsSection
          editingPermissionId={editingPermissionId}
          permissionForm={permissionForm}
          setPermissionForm={setPermissionForm}
          permissionSaving={permissionSaving}
          resetPermissionForm={resetPermissionForm}
          handlePermissionSubmit={handlePermissionSubmit}
          roles={roles}
          pages={pages}
          pagePermissions={pagePermissions}
          handlePermissionEdit={handlePermissionEdit}
          handlePermissionDelete={handlePermissionDelete}
          permissionDeletingId={permissionDeletingId}
        />
      ) : null}

      {!loading && activeTab === "overrides" ? (
        <OverridesSection
          editingOverrideId={editingOverrideId}
          overrideForm={overrideForm}
          setOverrideForm={setOverrideForm}
          overrideSaving={overrideSaving}
          resetOverrideForm={resetOverrideForm}
          handleOverrideSubmit={handleOverrideSubmit}
          pages={pages}
          users={users}
          overrides={overrides}
          handleOverrideEdit={handleOverrideEdit}
          handleOverrideDelete={handleOverrideDelete}
          overrideDeletingId={overrideDeletingId}
        />
      ) : null}
     
    </div>
  );
}
