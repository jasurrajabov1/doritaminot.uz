import { PAGE_REGISTRY } from "../pages/pageRegistry";

export function hasToken() {
  return !!sessionStorage.getItem("auth_token");
}

export function getStoredCurrentUser() {
  try {
    return JSON.parse(sessionStorage.getItem("auth_me") || "null");
  } catch {
    return null;
  }
}

export function getDefaultPath(allowedPages = []) {
  const firstAllowedPage = PAGE_REGISTRY.find((item) =>
    allowedPages.includes(item.code)
  );

  return firstAllowedPage?.path || "/access-denied";
}