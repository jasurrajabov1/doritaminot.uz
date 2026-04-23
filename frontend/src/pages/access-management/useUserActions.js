import api from "../../api/client";
import { extractError, toRoleId } from "./helpers";

export default function useUserActions({
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
}) {
  const handleUserSubmit = async (e) => {
    e.preventDefault();

    if (!editingUserId && !userForm.username.trim()) {
      setSuccess("");
      setError("Логин киритилиши керак.");
      return;
    }

    if (!editingUserId && !userForm.password.trim()) {
      setSuccess("");
      setError("Янги фойдаланувчи учун пароль киритилиши керак.");
      return;
    }

    try {
      setUserSaving(true);
      setError("");
      setSuccess("");

      if (editingUserId) {
        const payload = {
          first_name: userForm.first_name.trim(),
          last_name: userForm.last_name.trim(),
          email: userForm.email.trim(),
          is_active: userForm.is_active,
          is_staff: userForm.is_staff,
          role_id: toRoleId(userForm.role_id),
        };

        await api.patch(`/access/users/${editingUserId}/`, payload);
        setSuccess("Фойдаланувчи муваффақиятли янгиланди.");
      } else {
        const payload = {
          username: userForm.username.trim(),
          password: userForm.password,
          first_name: userForm.first_name.trim(),
          last_name: userForm.last_name.trim(),
          email: userForm.email.trim(),
          is_active: userForm.is_active,
          is_staff: userForm.is_staff,
          role_id: toRoleId(userForm.role_id),
        };

        await api.post("/access/users/", payload);
        setSuccess("Фойдаланувчи муваффақиятли қўшилди.");
      }

      resetUserForm();
      await loadAll();
      setActiveTab("users");
    } catch (e) {
      console.error(e);
      setSuccess("");
      setError(extractError(e, "Фойдаланувчини сақлашда хатолик юз берди."));
    } finally {
      setUserSaving(false);
    }
  };

  const handleUserEdit = (user) => {
    setSuccess("");
    setError("");
    setEditingUserId(user.id);
    setPasswordTarget(user);
    setNewPassword("");
    setUserForm({
      username: user.username || "",
      password: "",
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      email: user.email || "",
      role_id: user.role?.id ? String(user.role.id) : "",
      is_active: !!user.is_active,
      is_staff: !!user.is_staff,
    });
    setActiveTab("users");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleOpenPassword = (user) => {
    setSuccess("");
    setError("");
    setPasswordTarget(user);
    setNewPassword("");
    setActiveTab("users");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (!passwordTarget?.id) {
      setSuccess("");
      setError("Пароль янгилаш учун фойдаланувчи танланмаган.");
      return;
    }

    if (!newPassword.trim()) {
      setSuccess("");
      setError("Янги пароль киритилиши керак.");
      return;
    }

    try {
      setPasswordSaving(true);
      setError("");
      setSuccess("");

      await api.post(`/access/users/${passwordTarget.id}/set-password/`, {
        new_password: newPassword,
      });

      setNewPassword("");
      setSuccess(`"${passwordTarget.username}" учун пароль янгиланди.`);
    } catch (e) {
      console.error(e);
      setSuccess("");
      setError(extractError(e, "Пароль янгилашда хатолик юз берди."));
    } finally {
      setPasswordSaving(false);
    }
  };

  const getUserActionBlockReason = (user) => {
    if (user.id === currentUserId) {
      return "Ўзингизни бу амал билан ўзгартириб бўлмайди.";
    }

    const activeSuperusersCount = users.filter(
      (item) => item.is_superuser && item.is_active
    ).length;

    const isLastActiveSuperuser =
      user.is_superuser && user.is_active && activeSuperusersCount <= 1;

    if (isLastActiveSuperuser) {
      return "Охирги фаол superuser'га бу амални бажариб бўлмайди.";
    }

    return "";
  };


  const handleToggleActive = async (user) => {

    const blockedReason = getUserActionBlockReason(user);
    if (blockedReason) {
      setSuccess("");
      setError(blockedReason);
      return;
    }

    const nextIsActive = !user.is_active;
    const nextLabel = nextIsActive ? "фаол" : "нофаол";

    const ok = window.confirm(
      `"${user.username}" фойдаланувчисини ${nextLabel} қилмоқчимисиз?`
    );
    if (!ok) return;

    try {
      setUserDeletingId(user.id);
      setError("");
      setSuccess("");

      await api.patch(`/access/users/${user.id}/`, {
        is_active: nextIsActive,
      });

      if (editingUserId === user.id) {
        setUserForm((prev) => ({
          ...prev,
          is_active: nextIsActive,
        }));
      }

      setSuccess(`Фойдаланувчи ${nextLabel} қилинди.`);
      await loadAll();
      setActiveTab("users");
    } catch (e) {
      console.error(e);
      setSuccess("");
      setError(
        extractError(e, "Фойдаланувчи ҳолатини янгилашда хатолик юз берди.")
      );
    } finally {
      setUserDeletingId(null);
    }
  };

  const handleUserDelete = async (user) => {
    const blockedReason = getUserActionBlockReason(user);
    if (blockedReason) {
      setSuccess("");
      setError(blockedReason);
      return;
    }

    const ok = window.confirm(`"${user.username}" фойдаланувчисини ўчирмоқчимисиз?`);
    if (!ok) return;

    try {
      setUserDeletingId(user.id);
      setError("");
      setSuccess("");

      await api.delete(`/access/users/${user.id}/`);
      setSuccess("Фойдаланувчи ўчирилди.");

      if (editingUserId === user.id) {
        resetUserForm();
      }

      await loadAll();
    } catch (e) {
      console.error(e);
      setSuccess("");
      setError(extractError(e, "Фойдаланувчини ўчиришда хатолик юз берди."));
    } finally {
      setUserDeletingId(null);
    }
  };

  return {
    handleUserSubmit,
    handleUserEdit,
    handleOpenPassword,
    handlePasswordSubmit,
    handleToggleActive,
    handleUserDelete,
  };
}