import api from "../../api/client";
import {
  extractError,
  parseOverrideValue,
  overrideFormValue,
} from "./helpers";

export default function useOverrideActions({
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
}) {
  const handleOverrideSubmit = async (e) => {
    e.preventDefault();

    if (!overrideForm.user) {
      setSuccess("");
      setError("Фойдаланувчи танланиши керак.");
      return;
    }

    if (!overrideForm.page_code) {
      setSuccess("");
      setError("Саҳифа танланиши керак.");
      return;
    }

    const payload = {
      user: Number(overrideForm.user),
      page_code: overrideForm.page_code,
      can_view: parseOverrideValue(overrideForm.can_view),
      can_add: parseOverrideValue(overrideForm.can_add),
      can_edit: parseOverrideValue(overrideForm.can_edit),
      can_delete: parseOverrideValue(overrideForm.can_delete),
      can_export: parseOverrideValue(overrideForm.can_export),
      can_print: parseOverrideValue(overrideForm.can_print),
      can_manage_access: parseOverrideValue(overrideForm.can_manage_access),
    };

    const hasAnyOverride =
      payload.can_view !== null ||
      payload.can_add !== null ||
      payload.can_edit !== null ||
      payload.can_delete !== null ||
      payload.can_export !== null ||
      payload.can_print !== null ||
      payload.can_manage_access !== null;

    if (!hasAnyOverride) {
      setSuccess("");
      setError("Камида битта override ҳуқуқи белгиланиши керак.");
      return;
    }

    try {
      setOverrideSaving(true);
      setError("");
      setSuccess("");

      if (editingOverrideId) {
        await api.patch(
          `/access/user-permission-overrides/${editingOverrideId}/`,
          payload
        );
        setSuccess("Индивидуал override муваффақиятли янгиланди.");
      } else {
        await api.post("/access/user-permission-overrides/", payload);
        setSuccess("Индивидуал override муваффақиятли қўшилди.");
      }

      resetOverrideForm();
      await loadAll();
      setActiveTab("overrides");
    } catch (e) {
      console.error(e);
      setSuccess("");
      setError(extractError(e, "Индивидуал override'ни сақлашда хатолик юз берди."));
    } finally {
      setOverrideSaving(false);
    }
  };

  const handleOverrideEdit = (item) => {
    setSuccess("");
    setError("");
    setEditingOverrideId(item.id);
    setOverrideForm({
      user: item.user ? String(item.user) : "",
      page_code: item.page_code || "",
      can_view: overrideFormValue(item.can_view),
      can_add: overrideFormValue(item.can_add),
      can_edit: overrideFormValue(item.can_edit),
      can_delete: overrideFormValue(item.can_delete),
      can_export: overrideFormValue(item.can_export),
      can_print: overrideFormValue(item.can_print),
      can_manage_access: overrideFormValue(item.can_manage_access),
    });
    setActiveTab("overrides");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleOverrideDelete = async (item) => {
    const ok = window.confirm(
      `"${item.username}" учун "${item.page_label}" override'ни ўчирмоқчимисиз?`
    );
    if (!ok) return;

    try {
      setOverrideDeletingId(item.id);
      setError("");
      setSuccess("");

      await api.delete(`/access/user-permission-overrides/${item.id}/`);
      setSuccess("Индивидуал override ўчирилди.");

      if (editingOverrideId === item.id) {
        resetOverrideForm();
      }

      await loadAll();
    } catch (e) {
      console.error(e);
      setSuccess("");
      setError(extractError(e, "Индивидуал override'ни ўчиришда хатолик юз берди."));
    } finally {
      setOverrideDeletingId(null);
    }
  };

  return {
    handleOverrideSubmit,
    handleOverrideEdit,
    handleOverrideDelete,
  };
}