import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { FastifyInstance } from "fastify";
import { buildApp } from "../../src/app.js";
import { closeDatabase, getDatabase } from "../../src/db/index.js";
import { MediaRepository } from "../../src/db/repositories/media.repository.js";
import { NormalizedMediaDetail, NormalizedSeasonDetail } from "../../src/core/types/media.js";

describe("Playback Progress & Continue Watching REST API Routes (Fastify)", () => {
  let app: FastifyInstance;
  let userAId: string;
  let userAToken: string;
  let userACookie: string;
  let userBId: string;
  let userBToken: string;
  let userBCookie: string;

  const movieInception: NormalizedMediaDetail = {
    id: "cinely:item:mov_tt1375666",
    mediaKind: "movie",
    originalTitle: "Inception",
    defaultTitle: "Inception",
    overview: "A thief enters dreams.",
    releaseYear: 2010,
    runtimeMinutes: 148,
    genres: ["Sci-Fi"],
    artwork: { posterUrl: "https://image.tmdb.org/t/p/w500/inception.jpg" },
    externalIds: { imdbId: "tt1375666" },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  };

  const seriesBreakingBad: NormalizedMediaDetail = {
    id: "cinely:item:ser_tt0903747",
    mediaKind: "series",
    originalTitle: "Breaking Bad",
    defaultTitle: "Breaking Bad",
    overview: "A chemistry teacher manufactures methamphetamine.",
    releaseYear: 2008,
    genres: ["Drama"],
    artwork: { posterUrl: "https://image.tmdb.org/t/p/w500/bb.jpg" },
    externalIds: { imdbId: "tt0903747" },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  };

  const bbSeason1: NormalizedSeasonDetail = {
    id: "cinely:season:ser_tt0903747_1",
    seriesId: seriesBreakingBad.id,
    seasonNumber: 1,
    title: "Season 1",
    episodes: [
      {
        id: "cinely:ep:ser_tt0903747_1_1",
        seriesId: seriesBreakingBad.id,
        seasonNumber: 1,
        episodeNumber: 1,
        title: "Pilot",
        runtimeMinutes: 58,
        externalIds: {}
      },
      {
        id: "cinely:ep:ser_tt0903747_1_2",
        seriesId: seriesBreakingBad.id,
        seasonNumber: 1,
        episodeNumber: 2,
        title: "Cat's in the Bag...",
        runtimeMinutes: 48,
        externalIds: {}
      }
    ]
  };

  beforeAll(async () => {
    app = await buildApp({ enableLogging: false });

    // Seed media items and season episodes
    const mediaRepo = new MediaRepository();
    await mediaRepo.upsertMediaItem(movieInception);
    await mediaRepo.upsertMediaItem(seriesBreakingBad);
    await mediaRepo.upsertSeasons([bbSeason1]);

    // Register User A
    const resA = await app.inject({
      method: "POST",
      url: "/v1/auth/register",
      payload: {
        email: "alice_prog@matrix.io",
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
        email: "bob_prog@matrix.io",
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

  // 1. Movie Progress
  it("PUT /v1/users/me/progress/:id creates movie progress", async () => {
    const res = await app.inject({
      method: "PUT",
      url: `/v1/users/me/progress/${encodeURIComponent(movieInception.id)}`,
      cookies: { cinely_access: userACookie },
      payload: {
        positionSeconds: 842,
        durationSeconds: 1440
      }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data.mediaId).toBe(movieInception.id);
    expect(body.data.seasonNumber).toBe(0);
    expect(body.data.episodeNumber).toBe(0);
    expect(body.data.positionSeconds).toBe(842);
    expect(body.data.durationSeconds).toBe(1440);
    expect(body.data.progressPercent).toBe(58.47);
    expect(body.data.completed).toBe(false);
    expect(body.data.updatedAt).toBeDefined();
  });

  it("PUT /v1/users/me/progress/:id updates movie progress", async () => {
    const res = await app.inject({
      method: "PUT",
      url: `/v1/users/me/progress/${encodeURIComponent(movieInception.id)}`,
      headers: { authorization: `Bearer ${userAToken}` },
      payload: {
        positionSeconds: 1000,
        durationSeconds: 1440
      }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data.positionSeconds).toBe(1000);
    expect(body.data.progressPercent).toBe(69.44);
    expect(body.data.completed).toBe(false);
  });

  it("marks progress completed when position / duration >= 90%", async () => {
    const res = await app.inject({
      method: "PUT",
      url: `/v1/users/me/progress/${encodeURIComponent(movieInception.id)}`,
      cookies: { cinely_access: userACookie },
      payload: {
        positionSeconds: 1350,
        durationSeconds: 1440
      }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data.progressPercent).toBe(93.75);
    expect(body.data.completed).toBe(true);
  });

  it("persists explicit completed=true even if progress < 90%", async () => {
    const res = await app.inject({
      method: "PUT",
      url: `/v1/users/me/progress/${encodeURIComponent(movieInception.id)}`,
      cookies: { cinely_access: userACookie },
      payload: {
        positionSeconds: 200,
        durationSeconds: 1440,
        completed: true
      }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data.progressPercent).toBe(13.89);
    expect(body.data.completed).toBe(true);
  });

  // 2. TV Series Episode Progress
  it("PUT /v1/users/me/progress/:id creates TV episode progress", async () => {
    const res = await app.inject({
      method: "PUT",
      url: `/v1/users/me/progress/${encodeURIComponent(seriesBreakingBad.id)}`,
      cookies: { cinely_access: userACookie },
      payload: {
        seasonNumber: 1,
        episodeNumber: 1,
        positionSeconds: 1200,
        durationSeconds: 3480
      }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data.mediaId).toBe(seriesBreakingBad.id);
    expect(body.data.seasonNumber).toBe(1);
    expect(body.data.episodeNumber).toBe(1);
    expect(body.data.positionSeconds).toBe(1200);
    expect(body.data.durationSeconds).toBe(3480);
    expect(body.data.progressPercent).toBe(34.48);
  });

  it("supports multiple episodes without overwriting", async () => {
    // Add progress for S1E2
    const res = await app.inject({
      method: "PUT",
      url: `/v1/users/me/progress/${encodeURIComponent(seriesBreakingBad.id)}`,
      cookies: { cinely_access: userACookie },
      payload: {
        seasonNumber: 1,
        episodeNumber: 2,
        positionSeconds: 600,
        durationSeconds: 2880
      }
    });
    expect(res.statusCode).toBe(200);

    // Verify S1E1 is still intact in DB
    const db = getDatabase();
    const ep1 = await db.get(
      `SELECT * FROM user_progress WHERE user_id = ? AND media_id = ? AND season_number = ? AND episode_number = ?`,
      [userAId, seriesBreakingBad.id, 1, 1]
    );
    expect(ep1).toBeDefined();
    expect(ep1.position_seconds).toBe(1200);

    const ep2 = await db.get(
      `SELECT * FROM user_progress WHERE user_id = ? AND media_id = ? AND season_number = ? AND episode_number = ?`,
      [userAId, seriesBreakingBad.id, 1, 2]
    );
    expect(ep2).toBeDefined();
    expect(ep2.position_seconds).toBe(600);
  });

  // 3. GET /v1/users/me/progress
  it("GET /v1/users/me/progress returns all progress records sorted newest first", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/users/me/progress",
      cookies: { cinely_access: userACookie }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data.total).toBe(3); // Inception, BB S1E1, BB S1E2
    expect(body.data.items.length).toBe(3);

    // Newest updated item (BB S1E2) is first
    expect(body.data.items[0].mediaId).toBe(seriesBreakingBad.id);
    expect(body.data.items[0].seasonNumber).toBe(1);
    expect(body.data.items[0].episodeNumber).toBe(2);
  });

  // 4. Validation & Anti-Abuse
  it("rejects negative positionSeconds with 400 VALIDATION_FAILED", async () => {
    const res = await app.inject({
      method: "PUT",
      url: `/v1/users/me/progress/${encodeURIComponent(movieInception.id)}`,
      cookies: { cinely_access: userACookie },
      payload: { positionSeconds: -10, durationSeconds: 1000 }
    });

    expect(res.statusCode).toBe(400);
    expect(res.headers["content-type"]).toContain("application/problem+json");
    expect(JSON.parse(res.payload).code).toBe("VALIDATION_FAILED");
  });

  it("rejects durationSeconds <= 0 with 400 VALIDATION_FAILED", async () => {
    const res = await app.inject({
      method: "PUT",
      url: `/v1/users/me/progress/${encodeURIComponent(movieInception.id)}`,
      cookies: { cinely_access: userACookie },
      payload: { positionSeconds: 10, durationSeconds: 0 }
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload).code).toBe("VALIDATION_FAILED");
  });

  it("rejects positionSeconds > durationSeconds with 400 VALIDATION_FAILED", async () => {
    const res = await app.inject({
      method: "PUT",
      url: `/v1/users/me/progress/${encodeURIComponent(movieInception.id)}`,
      cookies: { cinely_access: userACookie },
      payload: { positionSeconds: 1500, durationSeconds: 1000 }
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload).code).toBe("VALIDATION_FAILED");
  });

  it("rejects non-zero seasonNumber or episodeNumber for movies with 400", async () => {
    const res = await app.inject({
      method: "PUT",
      url: `/v1/users/me/progress/${encodeURIComponent(movieInception.id)}`,
      cookies: { cinely_access: userACookie },
      payload: {
        seasonNumber: 1,
        episodeNumber: 1,
        positionSeconds: 100,
        durationSeconds: 1000
      }
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload).code).toBe("VALIDATION_FAILED");
  });

  it("rejects non-existent TV season with 404 RESOURCE_NOT_FOUND", async () => {
    const res = await app.inject({
      method: "PUT",
      url: `/v1/users/me/progress/${encodeURIComponent(seriesBreakingBad.id)}`,
      cookies: { cinely_access: userACookie },
      payload: {
        seasonNumber: 99,
        episodeNumber: 1,
        positionSeconds: 100,
        durationSeconds: 1000
      }
    });

    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.payload).code).toBe("RESOURCE_NOT_FOUND");
  });

  it("rejects non-existent TV episode with 404 RESOURCE_NOT_FOUND", async () => {
    const res = await app.inject({
      method: "PUT",
      url: `/v1/users/me/progress/${encodeURIComponent(seriesBreakingBad.id)}`,
      cookies: { cinely_access: userACookie },
      payload: {
        seasonNumber: 1,
        episodeNumber: 99,
        positionSeconds: 100,
        durationSeconds: 1000
      }
    });

    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.payload).code).toBe("RESOURCE_NOT_FOUND");
  });

  it("rejects non-existent canonical media ID with 404 RESOURCE_NOT_FOUND", async () => {
    const res = await app.inject({
      method: "PUT",
      url: "/v1/users/me/progress/cinely:item:mov_fake_12345",
      cookies: { cinely_access: userACookie },
      payload: { positionSeconds: 100, durationSeconds: 1000 }
    });

    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.payload).code).toBe("RESOURCE_NOT_FOUND");
  });

  it("rejects raw external IDs with 404 RESOURCE_NOT_FOUND", async () => {
    const res = await app.inject({
      method: "PUT",
      url: "/v1/users/me/progress/tt1375666",
      cookies: { cinely_access: userACookie },
      payload: { positionSeconds: 100, durationSeconds: 1000 }
    });

    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.payload).code).toBe("RESOURCE_NOT_FOUND");
  });

  // 5. Authentication & Multi-Tenant Security
  it("rejects unauthenticated GET, PUT, and DELETE with 401 UNAUTHORIZED", async () => {
    const getRes = await app.inject({ method: "GET", url: "/v1/users/me/progress" });
    expect(getRes.statusCode).toBe(401);

    const putRes = await app.inject({
      method: "PUT",
      url: `/v1/users/me/progress/${encodeURIComponent(movieInception.id)}`,
      payload: { positionSeconds: 100, durationSeconds: 1000 }
    });
    expect(putRes.statusCode).toBe(401);

    const delRes = await app.inject({
      method: "DELETE",
      url: `/v1/users/me/progress/${encodeURIComponent(movieInception.id)}`
    });
    expect(delRes.statusCode).toBe(401);
  });

  it("enforces multi-tenant user isolation (User A cannot see or mutate User B's progress)", async () => {
    // User B sets progress on Inception
    await app.inject({
      method: "PUT",
      url: `/v1/users/me/progress/${encodeURIComponent(movieInception.id)}`,
      cookies: { cinely_access: userBCookie },
      payload: { positionSeconds: 50, durationSeconds: 1440 }
    });

    // User A fetches progress -> User A sees User A's progress on Inception (200s, completed: true), not User B's
    const resA = await app.inject({
      method: "GET",
      url: "/v1/users/me/progress",
      cookies: { cinely_access: userACookie }
    });
    const bodyA = JSON.parse(resA.payload);
    const userAInception = bodyA.data.items.find((i: any) => i.mediaId === movieInception.id);
    expect(userAInception.positionSeconds).toBe(200);

    // User B fetches progress -> User B sees position 50s
    const resB = await app.inject({
      method: "GET",
      url: "/v1/users/me/progress",
      cookies: { cinely_access: userBCookie }
    });
    const bodyB = JSON.parse(resB.payload);
    expect(bodyB.data.total).toBe(1);
    expect(bodyB.data.items[0].positionSeconds).toBe(50);
  });

  // 6. DELETE Progress
  it("DELETE /v1/users/me/progress/:id?season=1&episode=1 removes specific episode progress", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: `/v1/users/me/progress/${encodeURIComponent(seriesBreakingBad.id)}?season=1&episode=1`,
      cookies: { cinely_access: userACookie }
    });

    expect(res.statusCode).toBe(200);

    const db = getDatabase();
    const ep1 = await db.get(
      `SELECT * FROM user_progress WHERE user_id = ? AND media_id = ? AND season_number = ? AND episode_number = ?`,
      [userAId, seriesBreakingBad.id, 1, 1]
    );
    expect(ep1).toBeNull();

    // S1E2 still exists
    const ep2 = await db.get(
      `SELECT * FROM user_progress WHERE user_id = ? AND media_id = ? AND season_number = ? AND episode_number = ?`,
      [userAId, seriesBreakingBad.id, 1, 2]
    );
    expect(ep2).toBeDefined();
  });

  it("DELETE /v1/users/me/progress/:id removes all progress for a media item", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: `/v1/users/me/progress/${encodeURIComponent(seriesBreakingBad.id)}`,
      cookies: { cinely_access: userACookie }
    });

    expect(res.statusCode).toBe(200);

    const db = getDatabase();
    const remaining = await db.query(
      `SELECT * FROM user_progress WHERE user_id = ? AND media_id = ?`,
      [userAId, seriesBreakingBad.id]
    );
    expect(remaining.length).toBe(0);
  });

  // Monotonic Sequence Ordering (Phase 3D)
  it("enforces monotonic write ordering: stale lower sequence number cannot overwrite newer sequence", async () => {
    // 1. Initial write with clientSequence = 10 (position = 500)
    const res1 = await app.inject({
      method: "PUT",
      url: `/v1/users/me/progress/${encodeURIComponent(movieInception.id)}`,
      cookies: { cinely_access: userACookie },
      payload: {
        positionSeconds: 500,
        durationSeconds: 1000,
        clientSequence: 10,
      },
    });
    expect(res1.statusCode).toBe(200);
    const body1 = JSON.parse(res1.payload);
    expect(body1.data.positionSeconds).toBe(500);

    // 2. Newer write with clientSequence = 20 (position = 800)
    const res2 = await app.inject({
      method: "PUT",
      url: `/v1/users/me/progress/${encodeURIComponent(movieInception.id)}`,
      cookies: { cinely_access: userACookie },
      payload: {
        positionSeconds: 800,
        durationSeconds: 1000,
        clientSequence: 20,
      },
    });
    expect(res2.statusCode).toBe(200);
    const body2 = JSON.parse(res2.payload);
    expect(body2.data.positionSeconds).toBe(800);

    // 3. Stale out-of-order write arriving late with clientSequence = 5 (position = 100)
    const res3 = await app.inject({
      method: "PUT",
      url: `/v1/users/me/progress/${encodeURIComponent(movieInception.id)}`,
      cookies: { cinely_access: userACookie },
      payload: {
        positionSeconds: 100,
        durationSeconds: 1000,
        clientSequence: 5,
      },
    });
    expect(res3.statusCode).toBe(200);
    const body3 = JSON.parse(res3.payload);
    // Should still have preserved position 800 (not overwritten by 100)
    expect(body3.data.positionSeconds).toBe(800);
  });

  // 7. Cascading Deletion
  it("cascades deletion when a user is deleted", async () => {
    const db = getDatabase();
    // User B has Inception progress
    const before = await db.query("SELECT * FROM user_progress WHERE user_id = ?", [userBId]);
    expect(before.length).toBeGreaterThan(0);

    // Delete User B
    await db.run("DELETE FROM users WHERE id = ?", [userBId]);

    // Verify progress records were cascaded
    const after = await db.query("SELECT * FROM user_progress WHERE user_id = ?", [userBId]);
    expect(after.length).toBe(0);
  });

  it("cascades deletion when a media item is deleted", async () => {
    const db = getDatabase();
    // User A has Inception progress
    const before = await db.query("SELECT * FROM user_progress WHERE media_id = ?", [movieInception.id]);
    expect(before.length).toBeGreaterThan(0);

    // Delete media item Inception
    await db.run("DELETE FROM media_items WHERE id = ?", [movieInception.id]);

    // Verify progress records were cascaded
    const after = await db.query("SELECT * FROM user_progress WHERE media_id = ?", [movieInception.id]);
    expect(after.length).toBe(0);
  });
});
