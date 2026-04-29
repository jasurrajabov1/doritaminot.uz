import api from "../../api/client";
import { extractError } from "./helpers";

export default function useRoleActions({
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
}) {
  const handleRoleSubmit = async (e) => {
    e.preventDefault();

    if (!roleForm.name.trim()) {
      setSuccess("");
      setError("Роль номи киритилиши керак.");
      return;
    }

    try {
      setRoleSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        name: roleForm.name.trim(),
        description: roleForm.description.trim(),
        is_active: roleForm.is_active,
      };

      if (editingRoleId) {
        await api.patch(`/access/roles/${editingRoleId}/`, payload);
        setSuccess("Роль муваффақиятли янгиланди.");
      } else {
        await api.post("/access/roles/", payload);
        setSuccess("Роль муваффақиятли қўшилди.");
      }

      resetRoleForm();
      await loadAll();
      setActiveTab("roles");
    } catch (e) {
      console.error(e);
      setSuccess("");
      setError(extractError(e, "Рольни сақлашда хатолик юз берди."));
    } finally {
      setRoleSaving(false);
    }
  };

  const handleRoleEdit = (role) => {
    setSuccess("");
    setError("");
    setEditingRoleId(role.id);
    setRoleForm({
      name: role.name || "",
      description: role.description || "",
      is_active: !!role.is_active,
    });
    setActiveTab("roles");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRoleDelete = async (role) => {
    const ok = window.confirm(`"${role.name}" ролини ўчирмоқчимисиз?`);
    if (!ok) return;

    try {
      setRoleDeletingId(role.id);
      setError("");
      setSuccess("");

      await api.delete(`/access/roles/${role.id}/`);
      setSuccess("Роль ўчирилди.");

      if (editingRoleId === role.id) {
        resetRoleForm();
      }

      await loadAll();
    } catch (e) {
      console.error(e);
      setSuccess("");
      setError(extractError(e, "Рольни ўчиришда хатолик юз берди."));
    } finally {
      setRoleDeletingId(null);
    }
  };

  return {
    handleRoleSubmit,
    handleRoleEdit,
    handleRoleDelete,
  };
}