const PREFIX = "plate-service.private-draft:";
export function draftKey(username, name) {
  return `${PREFIX}${encodeURIComponent(username || "anonymous")}:${name}`;
}
export function clearPrivateDrafts() {
  try {
    for (let i = window.sessionStorage.length - 1; i >= 0; i--) {
      const key = window.sessionStorage.key(i);
      if (key?.startsWith(PREFIX) || key === "plate-service.business-signup-draft") window.sessionStorage.removeItem(key);
    }
  } catch { /* Restricted storage must not prevent logout. */ }
}
