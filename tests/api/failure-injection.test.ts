import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { FastifyInstance } from "fastify";
import { buildApp, sanitizeLogUrl } from "../../src/app.js";
import { sharedAddonExecutionService } from "../../src/core/addons/addon-execution.service.js";
import { MediaRepository } from "../../src/db/repositories/media.repository.js";
import { NormalizedMediaDetail } from "../../src/core/types/media.js";

describe("Failure Injection & Outage Containment (Phase 5B)", () => {
  let app: FastifyInstance;

  const sampleMovie: NormalizedMediaDetail = {
    id: "cinely:item:mov_tt1375666",
    mediaKind: "movie",
    originalTitle: "Inception",
    defaultTitle: "Inception",
    overview: "A thief enters dreams.",
    releaseYear: 2010,
    genres: ["Action", "Sci-Fi"],
    artwork: { posterUrl: "https://image.tmdb.org/t/p/w500/inception.jpg", backdropUrl: null },
    externalIds: { imdbId: "tt1375666", tmdbId: "27205" },
    directors: [{ name: "Christopher Nolan" }],
    writers: [{ name: "Christopher Nolan" }],
    cast: [{ name: "Leonardo DiCaprio" }],
    createdAt: "2026-08-17T00:00:00.000Z",
    updatedAt: "2026-08-17T00:00:00.000Z"
  };

  beforeEach(async () => {
    app = await buildApp();
    const mediaRepo = new MediaRepository();
    await mediaRepo.upsertMediaItem(sampleMovie);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await app.close();
  });

  describe("Provider Outage Invariant: Provider failure must never cause 5xx on valid resolution", () => {
    it("returns 200 OK with remaining candidates when one provider throws an exception", async () => {
      // Simulate Provider A throwing while Provider B succeeds
      vi.spyOn(sharedAddonExecutionService, "executeAll").mockResolvedValueOnce([
        {
          addon: { id: "torrentio", name: "Torrentio", manifestUrl: "https://torrentio.strem.fun/manifest.json", priorityOrder: 1 },
          rawStreams: [],
          latencyMs: 50,
          success: false,
          error: "Connection timeout to Torrentio"
        },
        {
          addon: { id: "comet", name: "Comet", manifestUrl: "https://comet.strem.fun/manifest.json", priorityOrder: 2 },
          rawStreams: [
            {
              url: "https://cdn.example.com/video/hls.m3u8",
              title: "Comet 1080p HLS"
            }
          ],
          latencyMs: 120,
          success: true
        }
      ]);

      const response = await app.inject({
        method: "GET",
        url: "/v1/media/cinely:item:mov_tt1375666/playback"
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.data.hasPlayableSource).toBe(true);
      expect(json.data.selected?.providerId).toBe("comet");
    });

    it("returns 200 OK with hasPlayableSource: false when ALL providers fail (never 500)", async () => {
      // Simulate all providers failing
      vi.spyOn(sharedAddonExecutionService, "executeAll").mockResolvedValueOnce([
        {
          addon: { id: "torrentio", name: "Torrentio", manifestUrl: "https://torrentio.strem.fun/manifest.json", priorityOrder: 1 },
          rawStreams: [],
          latencyMs: 50,
          success: false,
          error: "HTTP 502 Bad Gateway"
        },
        {
          addon: { id: "comet", name: "Comet", manifestUrl: "https://comet.strem.fun/manifest.json", priorityOrder: 2 },
          rawStreams: [],
          latencyMs: 50,
          success: false,
          error: "HTTP 504 Gateway Timeout"
        }
      ]);

      const response = await app.inject({
        method: "GET",
        url: "/v1/media/cinely:item:mov_tt1375666/playback"
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.data.hasPlayableSource).toBe(false);
      expect(json.data.selected).toBeNull();
      expect(json.data.alternatives).toEqual([]);
      expect(json.data.totalPlayable).toBe(0);
    });

    it("handles malformed provider payloads gracefully without crashing", async () => {
      vi.spyOn(sharedAddonExecutionService, "executeAll").mockResolvedValueOnce([
        {
          addon: { id: "torrentio", name: "Torrentio", manifestUrl: "https://torrentio.strem.fun/manifest.json", priorityOrder: 1 },
          rawStreams: [
            // Malformed items missing both url and infoHash
            { title: "Malformed item without url" } as any,
            // Non-string fields
            { url: 12345 as any, title: null as any } as any
          ],
          latencyMs: 30,
          success: true
        }
      ]);

      const response = await app.inject({
        method: "GET",
        url: "/v1/media/cinely:item:mov_tt1375666/playback"
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.data.hasPlayableSource).toBe(false);
    });

  });

  describe("Log Redaction & Sanitization", () => {
    it("sanitizes query string parameters containing secret patterns", () => {
      const sensitiveUrls = [
        "https://cdn.example.com/stream.m3u8?token=secret-jwt-token-12345",
        "https://api.example.com/v1/auth?key=my-secret-api-key",
        "https://api.example.com/v1/media?signature=sig_abcdef&user_id=123",
        "https://api.example.com/v1/stream?api_key=priv_987654&auth=token123"
      ];

      for (const rawUrl of sensitiveUrls) {
        const sanitized = sanitizeLogUrl(rawUrl);
        expect(sanitized).not.toContain("secret-jwt-token-12345");
        expect(sanitized).not.toContain("my-secret-api-key");
        expect(sanitized).not.toContain("sig_abcdef");
        expect(sanitized).not.toContain("priv_987654");
        expect(sanitized).toContain("[REDACTED]");
      }
    });

    it("leaves non-sensitive URLs untouched", () => {
      const safeUrl = "/v1/media/cinely:item:mov_tt1375666/playback?season=1&episode=3";
      expect(sanitizeLogUrl(safeUrl)).toBe(safeUrl);
    });
  });
});
