import { describe, it, expect } from "vitest";
import { loadConfig, parseAllowedOrigins } from "../../src/config/env.js";

describe("Environment Configuration (Phase 5A)", () => {
  it("parses valid comma-separated allowed origins", () => {
    const origins = parseAllowedOrigins("http://localhost:3000, https://cinely.app , https://staging.cinely.app");
    expect(origins).toEqual([
      "http://localhost:3000",
      "https://cinely.app",
      "https://staging.cinely.app"
    ]);
  });

  it("handles empty or single origin strings cleanly", () => {
    expect(parseAllowedOrigins("")).toEqual([]);
    expect(parseAllowedOrigins("https://cinely.app")).toEqual(["https://cinely.app"]);
  });

  it("loads valid development configuration with defaults", () => {
    const cfg = loadConfig({
      NODE_ENV: "development"
    });
    expect(cfg.NODE_ENV).toBe("development");
    expect(cfg.PORT).toBe(3000);
    expect(cfg.USE_SQLITE_MEM).toBe(true);
    expect(cfg.DATABASE_POOL_MIN).toBe(2);
    expect(cfg.DATABASE_POOL_MAX).toBe(20);
    expect(cfg.DATABASE_CONNECTION_TIMEOUT_MS).toBe(5000);
  });

  it("enforces minimum 32-character master key in production mode", () => {
    // Fails with short key
    expect(() => {
      loadConfig({
        NODE_ENV: "production",
        CINELY_MASTER_KEY: "too-short-key"
      });
    }).toThrow(/CINELY_MASTER_KEY/);

    // Passes with 32+ character key
    const cfg = loadConfig({
      NODE_ENV: "production",
      CINELY_MASTER_KEY: "a-very-secure-32-byte-master-key-here!"
    });
    expect(cfg.NODE_ENV).toBe("production");
    expect(cfg.CINELY_MASTER_KEY).toBe("a-very-secure-32-byte-master-key-here!");
  });
});
