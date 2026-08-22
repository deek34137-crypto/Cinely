import { describe, it, expect } from "vitest";
import { videoServers } from "../lib/stores/video-servers";
import { getEmbedUrl } from "../lib/providers/embed-urls";

describe("14 Embed Servers Configuration", () => {
  it("should have exactly 14 embed server configurations", () => {
    expect(videoServers.length).toBe(14);
  });

  it("should generate valid movie embed URLs for all servers", () => {
    const tmdbId = 27205; // Inception
    for (const server of videoServers) {
      const url = server.getMovieUrl(tmdbId);
      expect(url).toBeDefined();
      expect(url.startsWith("http")).toBe(true);
      expect(url).toContain(String(tmdbId));
    }
  });

  it("should generate valid TV show episode embed URLs for all servers", () => {
    const tmdbId = 1399; // Game of Thrones
    const season = 1;
    const episode = 1;

    for (const server of videoServers) {
      const url = server.getEpisodeUrl(tmdbId, season, episode);
      expect(url).toBeDefined();
      expect(url.startsWith("http")).toBe(true);
      expect(url).toContain(String(tmdbId));
    }
  });

  it("should correctly resolve embed URL via helper", () => {
    const url = getEmbedUrl("vidsrc", 27205, "movie");
    expect(url).toBe("https://vsembed.ru/embed/movie?tmdb=27205");

    const tvUrl = getEmbedUrl("vidsrc", 1399, "tv", 2, 4);
    expect(tvUrl).toBe("https://vsembed.ru/embed/tv?tmdb=1399&season=2&episode=4");
  });
});
