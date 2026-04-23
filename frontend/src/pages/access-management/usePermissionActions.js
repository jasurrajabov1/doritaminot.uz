import api from "../../api/client";
import { extractError } from "./helpers";

export default function usePermissionActions({
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
}) {
  const handlePermissionSubmit = async (e) => {
    e.preventDefault();

    if (!permissionForm.role) {
      setSuccess("");
      setError("Роль танланиши керак.");
      return;
    }

    if (!permissionForm.page_code) {
      setSuccess("");
      setError("Саҳифа танланиши керак.");
      return;
    }

    const hasAnyPermission =
      permissionForm.can_view ||
      permissionForm.can_add ||
      permissionForm.can_edit ||
      permissionForm.can_delete ||
      permissionForm.can_export ||
      permissionForm.can_print ||
      permissionForm.can_manage_access;

    if (!hasAnyPermission) {
      setSuccess("");
      setError("Камида битта ҳуқуқ белгиланиши керак.");
      return;
    }

    try {
      setPermissionSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        role: Number(permissionForm.role),
        page_code: permissionForm.page_code,
        can_view: permissionForm.can_view,
        can_add: permissionForm.can_add,
        can_edit: permissionForm.can_edit,
        can_delete: permissionForm.can_delete,
        can_export: permissionForm.can_export,
        can_print: permissionForm.can_print,
        can_manage_access: permissionForm.can_manage_access,
      };

      if (editingPermissionId) {
        await api.patch(
          `/access/page-permissions/${editingPermissionId}/`,
          payload
        );
        setSuccess("Саҳифа рухсати муваффақиятли янгиланди.");
      } else {
        await api.post("/access/page-permissions/", payload);
        setSuccess("Саҳифа рухсати муваффақиятли қўшилди.");
      }

      resetPermissionForm();
      await loadAll();
      setActiveTab("permissions");
    } catch (e) {
      console.error(e);
      setSuccess("");
      setError(extractError(e, "Саҳифа рухсатини сақлашда хатолик юз берди."));
    } finally {
      setPermissionSaving(false);
    }
  };

  const handlePermissionEdit = (item) => {
    setSuccess("");
    setError("");
    setEditingPermissionId(item.id);
    setPermissionForm({
      role: item.role ? String(item.role) : "",
      page_code: item.page_code || "",
      can_view: !!item.can_view,
      can_add: !!item.can_add,
      can_edit: !!item.can_edit,
      can_delete: !!item.can_delete,
      can_export: !!item.can_export,
      can_print: !!item.can_print,
      can_manage_access: !!item.can_manage_access,
    });
    setActiveTab("permissions");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePermissionDelete = async (item) => {
    const ok = window.confirm(
      `"${item.role_name}" роли учун "${item.page_label}" рухсатини ўчирмоқчимисиз?`
    );
    if (!ok) return;

    try {
      setPermissionDeletingId(item.id);
      setError("");
      setSuccess("");

      await api.delete(`/access/page-permissions/${item.id}/`);
      setSuccess("Саҳифа рухсати ўчирилди.");

      if (editingPermissionId === item.id) {
        resetPermissionForm();
      }

      await loadAll();
    } catch (e) {
      console.error(e);
      setSuccess("");
      setError(extractError(e, "Саҳифа рухсатини ўчиришда хатолик юз берди."));
    } finally {
      setPermissionDeletingId(null);
    }
  };

  return {
    handlePermissionSubmit,
    handlePermissionEdit,
    handlePermissionDelete,
  };
}