import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { FastifyInstance } from "fastify";
import { buildApp } from "../../src/app.js";
import { getDatabase } from "../../src/db/index.js";
import { createAccessToken } from "../../src/core/utils/crypto.js";
import { config } from "../../src/config/env.js";

describe("Diagnostics & Observability Routes (Phase 5C)", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
  });

  describe("GET /healthz (Liveness Probe)", () => {
    it("returns 200 OK with healthy status", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/healthz"
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.status).toBe("ok");
      expect(json.service).toBe("Cinely Media Engine");
      expect(json.timestamp).toBeDefined();
    });
  });

  describe("GET /readyz (Readiness Probe)", () => {
    it("returns 200 OK when database ping succeeds", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/readyz"
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.status).toBe("ready");
      expect(json.timestamp).toBeDefined();
    });

    it("returns 503 Service Unavailable when database ping fails (no internal error leakage)", async () => {
      const db = getDatabase();
      vi.spyOn(db, "ping").mockResolvedValueOnce(false);

      const response = await app.inject({
        method: "GET",
        url: "/readyz"
      });

      expect(response.statusCode).toBe(503);
      const json = response.json();
      expect(json.status).toBe("not_ready");
      // Must not leak stack traces or internal DB error messages to unauthenticated callers
      expect(json).not.toHaveProperty("stack");
      expect(json).not.toHaveProperty("error");
    });
  });

  describe("GET /v1/diagnostics/providers (Protected Provider Telemetry)", () => {
    it("rejects unauthenticated requests with 401 Unauthorized", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/v1/diagnostics/providers"
      });

      expect(response.statusCode).toBe(401);
      const json = response.json();
      expect(json.code).toBe("UNAUTHORIZED");
    });

    it("returns in-memory provider telemetry for authenticated operators", async () => {
      const operatorUser = {
        id: "usr_operator_1",
        email: "ops@cinely.io",
        displayName: "Operator",
        role: "admin",
        createdAt: "2026-08-19T00:00:00Z"
      };
      const token = createAccessToken(operatorUser, config.CINELY_MASTER_KEY);

      const response = await app.inject({
        method: "GET",
        url: "/v1/diagnostics/providers",
        headers: {
          authorization: `Bearer ${token}`
        }
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.data).toBeDefined();
      expect(Array.isArray(json.data.providers)).toBe(true);

      // Verify zero credentials, authorization tokens, or stream URLs in telemetry response
      const rawString = JSON.stringify(json);
      expect(rawString).not.toContain("password");
      expect(rawString).not.toContain("cinely_access");
      expect(rawString).not.toContain("token=");
    });
  });
});
