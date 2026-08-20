import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { FastifyInstance } from "fastify";
import { buildApp } from "../../src/app.js";
import { closeDatabase, getDatabase } from "../../src/db/index.js";
import { MediaRepository } from "../../src/db/repositories/media.repository.js";
import { NormalizedMediaDetail } from "../../src/core/types/media.js";

describe("User Watchlist REST API Routes (Fastify)", () => {
  let app: FastifyInstance;
  let userAToken: string;
  let userACookie: string;
  let userBToken: string;
  let userBCookie: string;
  let userAId: string;
  let userBId: string;

  const movieInception: NormalizedMediaDetail = {
    id: "cinely:item:mov_tt1375666",
    mediaKind: "movie",
    originalTitle: "Inception",
    defaultTitle: "Inception",
    overview: "A thief who steals corporate secrets through the use of dream-sharing technology.",
    tagline: "Your mind is the scene of the crime.",
    releaseDate: "2010-07-16",
    releaseYear: 2010,
    runtimeMinutes: 148,
    certification: "PG-13",
    genres: ["Action", "Sci-Fi", "Adventure"],
    artwork: {
      posterUrl: "https://image.tmdb.org/t/p/w500/inception_poster.jpg",
      backdropUrl: "https://image.tmdb.org/t/p/original/inception_backdrop.jpg"
    },
    trailerUrl: "https://youtube.com/watch?v=YoHD9XEInc0",
    externalIds: { imdbId: "tt1375666", tmdbId: "27205" },
    rating: 8.4,
    popularityScore: 95.5,
    directors: [{ name: "Christopher Nolan" }],
    writers: [{ name: "Christopher Nolan" }],
    cast: [{ name: "Leonardo DiCaprio", character: "Dom Cobb" }],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  };

  const seriesBreakingBad: NormalizedMediaDetail = {
    id: "cinely:item:ser_tt0903747",
    mediaKind: "series",
    originalTitle: "Breaking Bad",
    defaultTitle: "Breaking Bad",
    overview: "A chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing methamphetamine.",
    releaseYear: 2008,
    genres: ["Crime", "Drama", "Thriller"],
    artwork: {
      posterUrl: "https://image.tmdb.org/t/p/w500/bb_poster.jpg",
      backdropUrl: "https://image.tmdb.org/t/p/original/bb_backdrop.jpg"
    },
    externalIds: { imdbId: "tt0903747", tmdbId: "1396" },
    rating: 9.5,
    popularityScore: 99.0,
    directors: [],
    writers: [],
    cast: [{ name: "Bryan Cranston", character: "Walter White" }],
    seasons: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  };

  beforeAll(async () => {
    app = await buildApp({ enableLogging: false });

    // Seed canonical media catalog
    const mediaRepo = new MediaRepository();
    await mediaRepo.upsertMediaItem(movieInception);
    await mediaRepo.upsertMediaItem(seriesBreakingBad);

    // Register User A
    const resA = await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: {
        email: "alice@matrix.io",
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
        email: "bob@matrix.io",
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

  it("POST /v1/users/me/watchlist/:id allows authenticated user to add a canonical media item", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/v1/users/me/watchlist/${encodeURIComponent(movieInception.id)}`,
      cookies: { cinely_access: userACookie }
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.data.mediaId).toBe("cinely:item:mov_tt1375666");
    expect(body.data.inWatchlist).toBe(true);
    expect(body.data.addedAt).toBeDefined();

    // Verify DB record
    const db = getDatabase();
    const row = await db.get(
      "SELECT * FROM user_watchlist WHERE user_id = ? AND media_id = ?",
      [userAId, movieInception.id]
    );
    expect(row).toBeDefined();
    expect(row.media_id).toBe(movieInception.id);
  });

  it("POST /v1/users/me/watchlist/:id is idempotent and preserves original addedAt on duplicate add", async () => {
    // 1. Get current item's addedAt
    const db = getDatabase();
    const beforeRow = await db.get(
      "SELECT * FROM user_watchlist WHERE user_id = ? AND media_id = ?",
      [userAId, movieInception.id]
    );
    const originalAddedAt = beforeRow.created_at;

    // 2. Repeat POST
    const res = await app.inject({
      method: "POST",
      url: `/v1/users/me/watchlist/${encodeURIComponent(movieInception.id)}`,
      headers: { authorization: `Bearer ${userAToken}` }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data.mediaId).toBe(movieInception.id);
    expect(body.data.inWatchlist).toBe(true);
    expect(body.data.addedAt).toBe(originalAddedAt);

    // Verify no duplicate rows in database
    const allRows = await db.query(
      "SELECT * FROM user_watchlist WHERE user_id = ? AND media_id = ?",
      [userAId, movieInception.id]
    );
    expect(allRows.length).toBe(1);
  });

  it("GET /v1/users/me/watchlist returns items ordered newest-added first", async () => {
    // Add second item (Breaking Bad) to User A
    await app.inject({
      method: "POST",
      url: `/v1/users/me/watchlist/${encodeURIComponent(seriesBreakingBad.id)}`,
      cookies: { cinely_access: userACookie }
    });

    const res = await app.inject({
      method: "GET",
      url: "/v1/users/me/watchlist",
      cookies: { cinely_access: userACookie }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data.total).toBe(2);
    expect(body.data.items.length).toBe(2);

    // Newest item added (Breaking Bad) should be first
    expect(body.data.items[0].canonicalId).toBe(seriesBreakingBad.id);
    expect(body.data.items[0].title).toBe("Breaking Bad");
    expect(body.data.items[0].posterUrl).toBe(seriesBreakingBad.artwork.posterUrl);
    expect(body.data.items[0].addedAt).toBeDefined();

    expect(body.data.items[1].canonicalId).toBe(movieInception.id);
    expect(body.data.items[1].title).toBe("Inception");
  });

  it("DELETE /v1/users/me/watchlist/:id removes item and is idempotent", async () => {
    // 1. Delete Inception
    const res1 = await app.inject({
      method: "DELETE",
      url: `/v1/users/me/watchlist/${encodeURIComponent(movieInception.id)}`,
      cookies: { cinely_access: userACookie }
    });

    expect(res1.statusCode).toBe(200);
    const body1 = JSON.parse(res1.payload);
    expect(body1.data.mediaId).toBe(movieInception.id);
    expect(body1.data.inWatchlist).toBe(false);

    // Verify removed from DB
    const db = getDatabase();
    const row = await db.get(
      "SELECT * FROM user_watchlist WHERE user_id = ? AND media_id = ?",
      [userAId, movieInception.id]
    );
    expect(row).toBeNull();

    // 2. Repeat DELETE (idempotent)
    const res2 = await app.inject({
      method: "DELETE",
      url: `/v1/users/me/watchlist/${encodeURIComponent(movieInception.id)}`,
      cookies: { cinely_access: userACookie }
    });

    expect(res2.statusCode).toBe(200);
    const body2 = JSON.parse(res2.payload);
    expect(body2.data.inWatchlist).toBe(false);
  });

  it("enforces multi-tenant user isolation (User A cannot see or delete User B's watchlist)", async () => {
    // User B adds Inception
    await app.inject({
      method: "POST",
      url: `/v1/users/me/watchlist/${encodeURIComponent(movieInception.id)}`,
      cookies: { cinely_access: userBCookie }
    });

    // User A fetches watchlist -> User A should NOT see Inception (only Breaking Bad)
    const resA = await app.inject({
      method: "GET",
      url: "/v1/users/me/watchlist",
      cookies: { cinely_access: userACookie }
    });
    const bodyA = JSON.parse(resA.payload);
    expect(bodyA.data.total).toBe(1);
    expect(bodyA.data.items[0].canonicalId).toBe(seriesBreakingBad.id);

    // User B fetches watchlist -> User B should see only Inception
    const resB = await app.inject({
      method: "GET",
      url: "/v1/users/me/watchlist",
      cookies: { cinely_access: userBCookie }
    });
    const bodyB = JSON.parse(resB.payload);
    expect(bodyB.data.total).toBe(1);
    expect(bodyB.data.items[0].canonicalId).toBe(movieInception.id);

    // User A attempting to delete Inception does NOT delete User B's entry
    await app.inject({
      method: "DELETE",
      url: `/v1/users/me/watchlist/${encodeURIComponent(movieInception.id)}`,
      cookies: { cinely_access: userACookie }
    });

    const db = getDatabase();
    const bEntry = await db.get(
      "SELECT * FROM user_watchlist WHERE user_id = ? AND media_id = ?",
      [userBId, movieInception.id]
    );
    expect(bEntry).toBeDefined();
  });

  it("rejects unauthenticated GET, POST, and DELETE with 401 UNAUTHORIZED", async () => {
    const getRes = await app.inject({ method: "GET", url: "/v1/users/me/watchlist" });
    expect(getRes.statusCode).toBe(401);
    expect(getRes.headers["content-type"]).toContain("application/problem+json");
    expect(JSON.parse(getRes.payload).code).toBe("UNAUTHORIZED");

    const postRes = await app.inject({
      method: "POST",
      url: `/v1/users/me/watchlist/${encodeURIComponent(movieInception.id)}`
    });
    expect(postRes.statusCode).toBe(401);
    expect(JSON.parse(postRes.payload).code).toBe("UNAUTHORIZED");

    const delRes = await app.inject({
      method: "DELETE",
      url: `/v1/users/me/watchlist/${encodeURIComponent(movieInception.id)}`
    });
    expect(delRes.statusCode).toBe(401);
    expect(JSON.parse(delRes.payload).code).toBe("UNAUTHORIZED");
  });

  it("rejects POST with nonexistent canonical media ID with 404 RESOURCE_NOT_FOUND", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/users/me/watchlist/cinely:item:mov_nonexistent_99999",
      cookies: { cinely_access: userACookie }
    });

    expect(res.statusCode).toBe(404);
    expect(res.headers["content-type"]).toContain("application/problem+json");
    const body = JSON.parse(res.payload);
    expect(body.code).toBe("RESOURCE_NOT_FOUND");
  });

  it("rejects POST with raw external IDs (e.g. tt1375666 or tmdb:27205) with 404", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/users/me/watchlist/tt1375666",
      cookies: { cinely_access: userACookie }
    });

    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.payload);
    expect(body.code).toBe("RESOURCE_NOT_FOUND");
  });

  it("cascades deletion when a user is deleted", async () => {
    const db = getDatabase();
    // Verify User B has an item
    const before = await db.query("SELECT * FROM user_watchlist WHERE user_id = ?", [userBId]);
    expect(before.length).toBeGreaterThan(0);

    // Delete User B
    await db.run("DELETE FROM users WHERE id = ?", [userBId]);

    // Verify User B watchlist entries were cascaded and deleted
    const after = await db.query("SELECT * FROM user_watchlist WHERE user_id = ?", [userBId]);
    expect(after.length).toBe(0);
  });

  it("cascades deletion when a media item is deleted", async () => {
    const db = getDatabase();
    // User A has Breaking Bad
    const before = await db.query("SELECT * FROM user_watchlist WHERE media_id = ?", [seriesBreakingBad.id]);
    expect(before.length).toBeGreaterThan(0);

    // Delete media item Breaking Bad
    await db.run("DELETE FROM media_items WHERE id = ?", [seriesBreakingBad.id]);

    // Verify associated watchlist entries were cascaded and deleted
    const after = await db.query("SELECT * FROM user_watchlist WHERE media_id = ?", [seriesBreakingBad.id]);
    expect(after.length).toBe(0);
  });
});
