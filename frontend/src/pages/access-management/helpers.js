export function toArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

export function extractError(error, fallbackText) {
  const data = error?.response?.data;

  if (typeof data === "string" && data.trim()) return data;
  if (data?.detail) return data.detail;

  if (Array.isArray(data?.non_field_errors) && data.non_field_errors[0]) {
    return data.non_field_errors[0];
  }

  const firstField =
    data && typeof data === "object" ? Object.keys(data)[0] : null;

  if (firstField && Array.isArray(data[firstField]) && data[firstField][0]) {
    return `${firstField}: ${data[firstField][0]}`;
  }

  if (firstField && typeof data[firstField] === "string") {
    return `${firstField}: ${data[firstField]}`;
  }

  return fallbackText;
}

export function yesNo(value) {
  return value ? "Ҳа" : "Йўқ";
}

export function overrideText(value) {
  if (value === true) return "Ҳа";
  if (value === false) return "Йўқ";
  return "—";
}

export function toRoleId(value) {
  if (value === "" || value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

export function parseOverrideValue(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

export function overrideFormValue(value) {
  if (value === true) return "true";
  if (value === false) return "false";
  return "";
}