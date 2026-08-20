import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { FastifyInstance } from "fastify";
import crypto from "crypto";
import { buildApp } from "../../src/app.js";
import { closeDatabase, getDatabase } from "../../src/db/index.js";
import { hashRefreshToken, createAccessToken } from "../../src/core/utils/crypto.js";
import { config } from "../../src/config/env.js";

describe("Authentication REST API Routes (Fastify)", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ enableLogging: false });
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
  });

  const testUser = {
    email: "neo@matrix.io",
    password: "Password123!",
    displayName: "Thomas Anderson"
  };

  it("POST /v1/auth/register creates user and returns tokens + cookies", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: testUser
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.data.user.email).toBe("neo@matrix.io");
    expect(body.data.user.displayName).toBe("Thomas Anderson");
    expect(body.data.user.id).toMatch(/^cinely:user:/);
    expect(body.data.tokens.accessToken).toBeDefined();
    expect(body.data.tokens.refreshToken).toMatch(/^rt_/);

    // Verify cookies
    const cookies = res.cookies;
    const accessCookie = cookies.find(c => c.name === "cinely_access");
    const refreshCookie = cookies.find(c => c.name === "cinely_refresh");

    expect(accessCookie).toBeDefined();
    expect(accessCookie?.httpOnly).toBe(true);
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie?.httpOnly).toBe(true);

    // Verify database invariants
    const db = getDatabase();
    const dbUser = await db.get("SELECT * FROM users WHERE email = ?", ["neo@matrix.io"]);
    expect(dbUser).toBeDefined();
    // Password must be hashed (salt:derivedKey), never plaintext
    expect(dbUser.password_hash).not.toBe(testUser.password);
    expect(dbUser.password_hash).toContain(":");

    // Refresh token in DB must be SHA-256 hash, never plaintext
    const tokenHash = hashRefreshToken(body.data.tokens.refreshToken);
    const dbToken = await db.get("SELECT * FROM user_refresh_tokens WHERE token_hash = ?", [tokenHash]);
    expect(dbToken).toBeDefined();
    expect(dbToken.user_id).toBe(dbUser.id);
    expect(dbToken.revoked_at).toBeNull();
  });

  it("POST /v1/auth/register with duplicate email returns 409 EMAIL_ALREADY_EXISTS", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: testUser
    });

    expect(res.statusCode).toBe(409);
    expect(res.headers["content-type"]).toContain("application/problem+json");
    const body = JSON.parse(res.payload);
    expect(body.code).toBe("EMAIL_ALREADY_EXISTS");
    expect(body.status).toBe(409);
  });

  it("POST /v1/auth/register with invalid password (< 8 chars) returns 400 VALIDATION_FAILED", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: {
        email: "trinity@matrix.io",
        password: "short",
        displayName: "Trinity"
      }
    });

    expect(res.statusCode).toBe(400);
    expect(res.headers["content-type"]).toContain("application/problem+json");
    const body = JSON.parse(res.payload);
    expect(body.code).toBe("VALIDATION_FAILED");
  });

  it("POST /v1/auth/login with valid credentials returns 200 OK + new cookies", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: {
        email: testUser.email,
        password: testUser.password
      }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data.user.email).toBe(testUser.email);
    expect(body.data.tokens.accessToken).toBeDefined();

    const accessCookie = res.cookies.find(c => c.name === "cinely_access");
    const refreshCookie = res.cookies.find(c => c.name === "cinely_refresh");
    expect(accessCookie).toBeDefined();
    expect(refreshCookie).toBeDefined();
  });

  it("POST /v1/auth/login with wrong password returns 401 INVALID_CREDENTIALS", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: {
        email: testUser.email,
        password: "WrongPassword999!"
      }
    });

    expect(res.statusCode).toBe(401);
    expect(res.headers["content-type"]).toContain("application/problem+json");
    const body = JSON.parse(res.payload);
    expect(body.code).toBe("INVALID_CREDENTIALS");
  });

  it("GET /v1/users/me with valid cookie returns authenticated user profile", async () => {
    // 1. Login to get cookie
    const loginRes = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: testUser.email, password: testUser.password }
    });
    const accessCookie = loginRes.cookies.find(c => c.name === "cinely_access")!;

    // 2. Call /v1/users/me with cookie
    const meRes = await app.inject({
      method: "GET",
      url: "/v1/users/me",
      cookies: {
        cinely_access: accessCookie.value
      }
    });

    expect(meRes.statusCode).toBe(200);
    const body = JSON.parse(meRes.payload);
    expect(body.data.user.email).toBe(testUser.email);
    expect(body.data.user.displayName).toBe(testUser.displayName);
  });

  it("GET /v1/users/me with Bearer authorization header succeeds", async () => {
    const loginRes = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: testUser.email, password: testUser.password }
    });
    const accessToken = JSON.parse(loginRes.payload).data.tokens.accessToken;

    const meRes = await app.inject({
      method: "GET",
      url: "/v1/users/me",
      headers: {
        authorization: `Bearer ${accessToken}`
      }
    });

    expect(meRes.statusCode).toBe(200);
    const body = JSON.parse(meRes.payload);
    expect(body.data.user.email).toBe(testUser.email);
  });

  it("GET /v1/users/me without authentication returns 401 UNAUTHORIZED", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/users/me"
    });

    expect(res.statusCode).toBe(401);
    expect(res.headers["content-type"]).toContain("application/problem+json");
    const body = JSON.parse(res.payload);
    expect(body.code).toBe("UNAUTHORIZED");
  });

  it("GET /v1/users/me with expired token returns 401 UNAUTHORIZED", async () => {
    // Generate an expired access token (exp in past)
    const expiredToken = createAccessToken(
      {
        id: "cinely:user:test",
        email: "test@matrix.io",
        displayName: "Test",
        role: "user",
        createdAt: ""
      },
      config.CINELY_MASTER_KEY,
      -3600 // Expired 1 hour ago
    );

    const res = await app.inject({
      method: "GET",
      url: "/v1/users/me",
      headers: { authorization: `Bearer ${expiredToken}` }
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.payload);
    expect(body.code).toBe("UNAUTHORIZED");
  });

  it("POST /v1/auth/refresh rotates the refresh token and invalidates the old one", async () => {
    // 1. Login
    const loginRes = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: testUser.email, password: testUser.password }
    });
    const initialRefreshCookie = loginRes.cookies.find(c => c.name === "cinely_refresh")!;
    const initialRefreshToken = initialRefreshCookie.value;

    // 2. Perform first refresh
    const refreshRes1 = await app.inject({
      method: "POST",
      url: "/v1/auth/refresh",
      cookies: {
        cinely_refresh: initialRefreshToken
      }
    });

    expect(refreshRes1.statusCode).toBe(200);
    const body1 = JSON.parse(refreshRes1.payload);
    const newRefreshToken = body1.data.tokens.refreshToken;
    expect(newRefreshToken).toBeDefined();
    expect(newRefreshToken).not.toBe(initialRefreshToken);

    // 3. Verify old refresh token CANNOT be reused (single-use rotation invariant)
    const replayRes = await app.inject({
      method: "POST",
      url: "/v1/auth/refresh",
      cookies: {
        cinely_refresh: initialRefreshToken
      }
    });

    expect(replayRes.statusCode).toBe(401);
    const replayBody = JSON.parse(replayRes.payload);
    expect(replayBody.code).toBe("REFRESH_TOKEN_INVALID");

    // 4. Verify new refresh token works
    const refreshRes2 = await app.inject({
      method: "POST",
      url: "/v1/auth/refresh",
      cookies: {
        cinely_refresh: newRefreshToken
      }
    });

    expect(refreshRes2.statusCode).toBe(200);
  });

  it("POST /v1/auth/refresh with bogus or missing token returns 401 REFRESH_TOKEN_INVALID", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/auth/refresh",
      cookies: {
        cinely_refresh: "rt_bogus_nonexistent_token_12345"
      }
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.payload);
    expect(body.code).toBe("REFRESH_TOKEN_INVALID");
  });

  it("POST /v1/auth/logout revokes the refresh token and clears auth cookies", async () => {
    // 1. Login
    const loginRes = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email: testUser.email, password: testUser.password }
    });
    const refreshCookie = loginRes.cookies.find(c => c.name === "cinely_refresh")!;
    const rawRefreshToken = refreshCookie.value;

    // 2. Call logout
    const logoutRes = await app.inject({
      method: "POST",
      url: "/v1/auth/logout",
      cookies: {
        cinely_refresh: rawRefreshToken
      }
    });

    expect(logoutRes.statusCode).toBe(200);
    const body = JSON.parse(logoutRes.payload);
    expect(body.data.message).toBe("Logged out successfully");

    // Verify cookies are cleared (empty value and expired/zero maxAge)
    const clearedAccess = logoutRes.cookies.find(c => c.name === "cinely_access");
    const clearedRefresh = logoutRes.cookies.find(c => c.name === "cinely_refresh");
    expect(clearedAccess).toBeDefined();
    expect(clearedAccess?.value === "" || clearedAccess?.maxAge === 0).toBe(true);
    expect(clearedRefresh).toBeDefined();
    expect(clearedRefresh?.value === "" || clearedRefresh?.maxAge === 0).toBe(true);

    // 3. Verify revoked token cannot refresh
    const refreshAttempt = await app.inject({
      method: "POST",
      url: "/v1/auth/refresh",
      cookies: {
        cinely_refresh: rawRefreshToken
      }
    });

    expect(refreshAttempt.statusCode).toBe(401);
    const refreshBody = JSON.parse(refreshAttempt.payload);
    expect(refreshBody.code).toBe("REFRESH_TOKEN_INVALID");
  });
});
