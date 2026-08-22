import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  hasSeenProxyModeHint,
  rememberProxyModeHintSeen,
} from "../lib/playback/proxy-mode-hint-storage";

describe("Ad-Blocker & Proxy Mode Protection UX", () => {
  beforeEach(() => {
    // Mock window & local storage
    let store: Record<string, string> = {};
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store[k] || null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
      clear: () => {
        store = {};
      },
    });
  });

  it("should detect when user has not seen proxy mode hint", () => {
    expect(hasSeenProxyModeHint()).toBe(false);
  });

  it("should remember when user has seen proxy mode hint", () => {
    rememberProxyModeHintSeen();
    expect(hasSeenProxyModeHint()).toBe(true);
  });
});
