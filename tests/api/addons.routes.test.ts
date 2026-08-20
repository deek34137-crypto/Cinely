import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { FastifyInstance } from "fastify";
import { buildApp } from "../../src/app.js";
import { closeDatabase, getDatabase } from "../../src/db/index.js";
import { AddonRepository } from "../../src/db/repositories/addon.repository.js";

describe("Stremio Addon Catalog & User Configuration REST API Routes (Fastify)", () => {
  let app: FastifyInstance;
  let userAId: string;
  let userAToken: string;
  let userACookie: string;
  let userBId: string;
  let userBToken: string;
  let userBCookie: string;

  beforeAll(async () => {
    app = await buildApp({ enableLogging: false });

    // Register User A
    const resA = await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: {
        email: "alice_addons@matrix.io",
        password: "Password123!",
        displayName: "Alice"
      }
    });
    const bodyA = JSON.parse(resA.payload);
    userAId = bodyA.data.user.id;
    userAToken = bodyA.data.tokens.accessToken;
    userACookie = resA.cookies.find((c) => c.name === "cinely_access")!.value;

    // Register User B
    const resB = await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: {
        email: "bob_addons@matrix.io",
        password: "Password123!",
        displayName: "Bob"
      }
    });
    const bodyB = JSON.parse(resB.payload);
    userBId = bodyB.data.user.id;
    userBToken = bodyB.data.tokens.accessToken;
    userBCookie = resB.cookies.find((c) => c.name === "cinely_access")!.value;
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
  });

  // 1. Catalog Endpoint
  it("GET /v1/addons/catalog is public and returns approved Stremio addons", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/addons/catalog"
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data.total).toBeGreaterThanOrEqual(5);
    expect(Array.isArray(body.data.items)).toBe(true);

    const ids = body.data.items.map((item: any) => item.id);
    expect(ids).toContain("torrentio");
    expect(ids).toContain("comet");
    expect(ids).toContain("mediafusion");
    expect(ids).toContain("opensubtitles-v3");
    expect(ids).toContain("cyberflix");

    const torrentio = body.data.items.find((item: any) => item.id === "torrentio");
    expect(torrentio.capabilities.stream).toBe(true);
    expect(torrentio.configurable).toBe(true);
  });

  // 2. Authentication Checks
  it("rejects unauthenticated requests to user addon endpoints with 401 UNAUTHORIZED", async () => {
    const getRes = await app.inject({ method: "GET", url: "/v1/users/me/addons" });
    expect(getRes.statusCode).toBe(401);
    expect(getRes.headers["content-type"]).toContain("application/problem+json");

    const enableRes = await app.inject({ method: "POST", url: "/v1/users/me/addons/torrentio/enable" });
    expect(enableRes.statusCode).toBe(401);

    const disableRes = await app.inject({ method: "POST", url: "/v1/users/me/addons/torrentio/disable" });
    expect(disableRes.statusCode).toBe(401);

    const delRes = await app.inject({ method: "DELETE", url: "/v1/users/me/addons/torrentio" });
    expect(delRes.statusCode).toBe(401);

    const putRes = await app.inject({
      method: "PUT",
      url: "/v1/users/me/addons/torrentio",
      payload: { priorityOrder: 1 }
    });
    expect(putRes.statusCode).toBe(401);
  });

  // 3. User Addon Preferences (Enable / Disable / Idempotency)
  it("POST /v1/users/me/addons/:id/enable enables addon for authenticated user and is idempotent", async () => {
    // Enable Comet
    const res1 = await app.inject({
      method: "POST",
      url: "/v1/users/me/addons/comet/enable",
      cookies: { cinely_access: userACookie }
    });

    expect(res1.statusCode).toBe(200);
    const body1 = JSON.parse(res1.payload);
    expect(body1.data.addonId).toBe("comet");
    expect(body1.data.enabled).toBe(true);

    // Repeat enable (idempotent)
    const res2 = await app.inject({
      method: "POST",
      url: "/v1/users/me/addons/comet/enable",
      headers: { authorization: `Bearer ${userAToken}` }
    });

    expect(res2.statusCode).toBe(200);
    const body2 = JSON.parse(res2.payload);
    expect(body2.data.addonId).toBe("comet");
    expect(body2.data.enabled).toBe(true);

    // Verify in database
    const db = getDatabase();
    const rows = await db.query(
      "SELECT * FROM user_addon_preferences WHERE user_id = ? AND addon_id = ?",
      [userAId, "comet"]
    );
    expect(rows.length).toBe(1);
    expect(rows[0].is_enabled).toBe(1);
  });

  it("POST /v1/users/me/addons/:id/disable and DELETE disable addon for user", async () => {
    // Disable Comet via POST disable
    const res1 = await app.inject({
      method: "POST",
      url: "/v1/users/me/addons/comet/disable",
      cookies: { cinely_access: userACookie }
    });

    expect(res1.statusCode).toBe(200);
    const body1 = JSON.parse(res1.payload);
    expect(body1.data.addonId).toBe("comet");
    expect(body1.data.enabled).toBe(false);

    // Re-enable and test DELETE /v1/users/me/addons/:id
    await app.inject({
      method: "POST",
      url: "/v1/users/me/addons/comet/enable",
      cookies: { cinely_access: userACookie }
    });

    const res2 = await app.inject({
      method: "DELETE",
      url: "/v1/users/me/addons/comet",
      cookies: { cinely_access: userACookie }
    });

    expect(res2.statusCode).toBe(200);
    const body2 = JSON.parse(res2.payload);
    expect(body2.data.addonId).toBe("comet");
    expect(body2.data.enabled).toBe(false);
  });

  // 4. GET /v1/users/me/addons
  it("GET /v1/users/me/addons returns all addons with user enabled state", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/users/me/addons",
      cookies: { cinely_access: userACookie }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data.total).toBeGreaterThanOrEqual(5);

    const comet = body.data.items.find((item: any) => item.id === "comet");
    expect(comet.userEnabled).toBe(false);

    const torrentio = body.data.items.find((item: any) => item.id === "torrentio");
    expect(torrentio.userEnabled).toBe(true);
  });

  // 5. Configuration & Priority
  it("PUT /v1/users/me/addons/:id updates configuration and priority", async () => {
    const res = await app.inject({
      method: "PUT",
      url: "/v1/users/me/addons/torrentio",
      cookies: { cinely_access: userACookie },
      payload: {
        priorityOrder: 10,
        configuration: {
          providers: ["yts", "eztv", "rarbg"],
          quality: "1080p,4k"
        }
      }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data.addonId).toBe("torrentio");
    expect(body.data.priorityOrder).toBe(10);
    expect(body.data.configuration.quality).toBe("1080p,4k");

    // Fetch user addons to verify updated configuration is returned
    const listRes = await app.inject({
      method: "GET",
      url: "/v1/users/me/addons",
      cookies: { cinely_access: userACookie }
    });
    const listBody = JSON.parse(listRes.payload);
    const torrentioItem = listBody.data.items.find((item: any) => item.id === "torrentio");
    expect(torrentioItem.priorityOrder).toBe(10);
    expect(torrentioItem.userConfiguration.quality).toBe("1080p,4k");
  });

  // 6. Validation
  it("rejects unknown addon ID with 404 RESOURCE_NOT_FOUND", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/users/me/addons/nonexistent-addon-xyz/enable",
      cookies: { cinely_access: userACookie }
    });

    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.payload).code).toBe("RESOURCE_NOT_FOUND");
  });

  it("rejects custom configuration for non-configurable addon with 400 VALIDATION_FAILED", async () => {
    const res = await app.inject({
      method: "PUT",
      url: "/v1/users/me/addons/opensubtitles-v3",
      cookies: { cinely_access: userACookie },
      payload: {
        configuration: { language: "es" }
      }
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload).code).toBe("VALIDATION_FAILED");
  });

  it("rejects invalid configuration payload format with 400 VALIDATION_FAILED", async () => {
    const res = await app.inject({
      method: "PUT",
      url: "/v1/users/me/addons/torrentio",
      cookies: { cinely_access: userACookie },
      payload: {
        priorityOrder: -5
      }
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload).code).toBe("VALIDATION_FAILED");
  });

  it("rejects enabling globally disabled addon with 400 VALIDATION_FAILED", async () => {
    // Add a globally disabled addon to catalog
    const addonRepo = new AddonRepository();
    await addonRepo.upsertCatalogItem({
      id: "disabled-test-addon",
      name: "Disabled Test Addon",
      version: "1.0.0",
      manifestUrl: "https://disabled.example/manifest.json",
      types: ["movie"],
      categories: ["torrents"],
      stars: 10,
      enabled: false,
      configurable: false,
      capabilities: { catalog: false, meta: false, stream: true, subtitles: false }
    });

    const res = await app.inject({
      method: "POST",
      url: "/v1/users/me/addons/disabled-test-addon/enable",
      cookies: { cinely_access: userACookie }
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload).code).toBe("VALIDATION_FAILED");
  });

  // 7. Multi-Tenant User Isolation
  it("enforces multi-tenant user isolation (User A cannot see or mutate User B's addon preferences)", async () => {
    // User B enables Torrentio with priority 99 and different configuration
    await app.inject({
      method: "PUT",
      url: "/v1/users/me/addons/torrentio",
      cookies: { cinely_access: userBCookie },
      payload: {
        priorityOrder: 99,
        configuration: { quality: "720p" }
      }
    });

    // User A fetches addons -> Torrentio has priority 10 and quality 1080p,4k
    const resA = await app.inject({
      method: "GET",
      url: "/v1/users/me/addons",
      cookies: { cinely_access: userACookie }
    });
    const torrentioA = JSON.parse(resA.payload).data.items.find((i: any) => i.id === "torrentio");
    expect(torrentioA.priorityOrder).toBe(10);
    expect(torrentioA.userConfiguration.quality).toBe("1080p,4k");

    // User B fetches addons -> Torrentio has priority 99 and quality 720p
    const resB = await app.inject({
      method: "GET",
      url: "/v1/users/me/addons",
      cookies: { cinely_access: userBCookie }
    });
    const torrentioB = JSON.parse(resB.payload).data.items.find((i: any) => i.id === "torrentio");
    expect(torrentioB.priorityOrder).toBe(99);
    expect(torrentioB.userConfiguration.quality).toBe("720p");
  });

  // 8. Cascading Deletion
  it("cascades deletion when a user is deleted", async () => {
    const db = getDatabase();
    const before = await db.query("SELECT * FROM user_addon_preferences WHERE user_id = ?", [userBId]);
    expect(before.length).toBeGreaterThan(0);

    // Delete User B
    await db.run("DELETE FROM users WHERE id = ?", [userBId]);

    // Verify User B addon preferences were deleted
    const after = await db.query("SELECT * FROM user_addon_preferences WHERE user_id = ?", [userBId]);
    expect(after.length).toBe(0);
  });

  it("cascades deletion when a catalog addon is deleted", async () => {
    const db = getDatabase();
    const before = await db.query("SELECT * FROM user_addon_preferences WHERE addon_id = ?", ["torrentio"]);
    expect(before.length).toBeGreaterThan(0);

    // Delete Torrentio from addon_catalog
    await db.run("DELETE FROM addon_catalog WHERE id = ?", ["torrentio"]);

    // Verify associated user preferences were deleted
    const after = await db.query("SELECT * FROM user_addon_preferences WHERE addon_id = ?", ["torrentio"]);
    expect(after.length).toBe(0);
  });
});
