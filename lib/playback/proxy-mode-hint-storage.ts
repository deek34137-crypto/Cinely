const PROXY_HINT_SEEN_KEY = "cinely:proxy-mode-hint-seen";

export function hasSeenProxyModeHint(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(PROXY_HINT_SEEN_KEY) === "true";
  } catch {
    return false;
  }
}

export function rememberProxyModeHintSeen(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PROXY_HINT_SEEN_KEY, "true");
  } catch {
    void 0;
  }
}
