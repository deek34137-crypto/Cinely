import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { FastifyInstance } from "fastify";
import { buildApp } from "../../src/app.js";
import { createAccessToken } from "../../src/core/utils/crypto.js";
import { config } from "../../src/config/env.js";

describe("Phase 4 Boundary Regression Lock (Backend Isolation Invariant)", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it("proves backend has NO manifest-proxying or arbitrary addon installation endpoints", async () => {
    // Attempting to post an arbitrary manifest URL to the backend must return 404 Route Not Found
    const arbitraryManifestEndpoints = [
      { method: "POST", url: "/v1/addons/custom" },
      { method: "POST", url: "/v1/addons/install" },
      { method: "GET", url: "/v1/addons/proxy?url=https://malicious.example.com/manifest.json" },
      { method: "GET", url: "/v1/proxy/stream?target=https://malicious.example.com" }
    ];

    for (const ep of arbitraryManifestEndpoints) {
      const response = await app.inject({
        method: ep.method as any,
        url: ep.url,
        payload: { manifestUrl: "https://malicious.example.com/manifest.json" }
      });
      expect(response.statusCode).toBe(404);
      expect(response.json().code).toBe("ROUTE_NOT_FOUND");
    }
  });

  it("proves user addon preferences API strictly rejects unapproved arbitrary addon IDs", async () => {
    const user = {
      id: "usr_boundary_test_1",
      email: "boundary@cinely.io",
      displayName: "Boundary Tester",
      role: "user",
      createdAt: "2026-08-19T00:00:00Z"
    };
    const token = createAccessToken(user, config.CINELY_MASTER_KEY);

    // Attempting to enable an unapproved arbitrary addon ID must fail with 404/400
    const response = await app.inject({
      method: "PUT",
      url: "/v1/users/me/addons/unapproved-arbitrary-addon-xyz",
      headers: {
        authorization: `Bearer ${token}`
      },
      payload: {
        enabled: true,
        priorityOrder: 1
      }
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().code).toBe("RESOURCE_NOT_FOUND");
  });
});
