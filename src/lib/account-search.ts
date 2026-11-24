export const ACCOUNT_SEARCH_EVENT = "dashboard-account-search-change";

const STORAGE_KEY = "dashboard-account-search";

export function subscribeToAccountSearch(onSearchChange: () => void) {
  window.addEventListener("storage", onSearchChange);
  window.addEventListener(ACCOUNT_SEARCH_EVENT, onSearchChange);

  return () => {
    window.removeEventListener("storage", onSearchChange);
    window.removeEventListener(ACCOUNT_SEARCH_EVENT, onSearchChange);
  };
}

export function getAccountSearchSnapshot() {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function getServerAccountSearchSnapshot() {
  return "";
}

export function setAccountSearch(query: string) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, query);
  } catch {
    // The in-memory event still updates mounted components when storage is blocked.
  }
  window.dispatchEvent(new Event(ACCOUNT_SEARCH_EVENT));
}
