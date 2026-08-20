import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { FastifyInstance } from "fastify";
import { buildApp } from "../../src/app.js";
import { MediaRepository } from "../../src/db/repositories/media.repository.js";
import { TMDBMetadataAdapter } from "../../src/modules/metadata/tmdb.adapter.js";
import { TVMazeMetadataAdapter } from "../../src/modules/metadata/tvmaze.adapter.js";
import { closeDatabase } from "../../src/db/index.js";

describe("Discovery & Search REST API Routes (Fastify)", () => {
  let app: FastifyInstance;
  const repo = new MediaRepository();
  const tmdb = new TMDBMetadataAdapter();
  const tvmaze = new TVMazeMetadataAdapter();

  beforeAll(async () => {
    app = await buildApp({ enableLogging: false });

    // Seed database with sample canonical items
    const movie = tmdb.normalizeMovie({
      id: 27205,
      imdb_id: "tt1375666",
      title: "Inception",
      original_title: "Inception",
      overview: "A thief enters dreams to steal corporate secrets.",
      release_date: "2010-07-15",
      runtime: 148,
      vote_average: 8.4,
      popularity: 150,
      poster_path: "/inception.jpg",
      genres: [{ id: 1, name: "Sci-Fi" }, { id: 2, name: "Action" }]
    });

    const series = tvmaze.normalizeShow({
      id: 169,
      name: "Breaking Bad",
      type: "Scripted",
      language: "English",
      genres: ["Drama", "Crime"],
      status: "Ended",
      externals: { imdb: "tt0903747" },
      _embedded: {
        episodes: [
          { id: 101, name: "Pilot", season: 1, number: 1, airdate: "2008-01-20" }
        ],
        seasons: [
          { id: 1, number: 1, name: "Season 1", premiereDate: "2008-01-20" }
        ]
      }
    });
    const seasons = tvmaze.normalizeSeasonsAndEpisodes({
      id: 169,
      name: "Breaking Bad",
      type: "Scripted",
      language: "English",
      genres: ["Drama", "Crime"],
      status: "Ended",
      externals: { imdb: "tt0903747" },
      _embedded: {
        episodes: [
          { id: 101, name: "Pilot", season: 1, number: 1, airdate: "2008-01-20" }
        ],
        seasons: [
          { id: 1, number: 1, name: "Season 1", premiereDate: "2008-01-20" }
        ]
      }
    });

    await repo.upsertMediaItem(movie);
    await repo.upsertMediaItem(series);
    await repo.upsertSeasons(seasons);
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
  });

  it("GET /health returns 200 OK with service details", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/health"
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.status).toBe("healthy");
    expect(body.service).toBe("Cinely Media Engine");
  });

  it("GET /v1/discover returns curated catalog rows", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/discover"
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data.sections).toBeDefined();
    expect(body.data.sections.length).toBeGreaterThan(0);
    expect(body.data.sections[0].items.length).toBeGreaterThan(0);
  });

  it("GET /v1/search returns matching canonical items", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/search?q=Inception"
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data.results.length).toBeGreaterThan(0);
    expect(body.data.results[0].title).toBe("Inception");
    expect(body.data.results[0].canonicalId).toBe("cinely:item:mov_tt1375666");
  });

  it("GET /v1/search without 'q' parameter returns RFC 7807 Validation Error", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/search"
    });

    expect(res.statusCode).toBe(400);
    expect(res.headers["content-type"]).toContain("application/problem+json");
    const body = JSON.parse(res.payload);
    expect(body.code).toBe("VALIDATION_FAILED");
    expect(body.status).toBe(400);
    expect(body.invalidParams).toBeDefined();
  });

  it("GET /v1/media/:id returns full canonical details", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/media/cinely:item:mov_tt1375666"
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data.id).toBe("cinely:item:mov_tt1375666");
    expect(body.data.defaultTitle).toBe("Inception");
    expect(body.data.releaseYear).toBe(2010);
    expect(body.data.externalIds.imdbId).toBe("tt1375666");
  });

  it("GET /v1/media/:id returns 404 RFC 7807 when item does not exist", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/media/cinely:item:mov_nonexistent999"
    });

    expect(res.statusCode).toBe(404);
    expect(res.headers["content-type"]).toContain("application/problem+json");
    const body = JSON.parse(res.payload);
    expect(body.code).toBe("RESOURCE_NOT_FOUND");
    expect(body.status).toBe(404);
  });

  it("GET /v1/media/:id/seasons/:seasonNumber returns season and episode details", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/media/cinely:item:ser_tt0903747/seasons/1"
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data.seasonNumber).toBe(1);
    expect(body.data.episodes.length).toBe(1);
    expect(body.data.episodes[0].title).toBe("Pilot");
  });
});
