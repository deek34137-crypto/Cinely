import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { initDatabase, closeDatabase } from "../../index.js";
import { MediaRepository } from "../media.repository.js";
import { TMDBMetadataAdapter } from "../../../modules/metadata/tmdb.adapter.js";
import { TVMazeMetadataAdapter } from "../../../modules/metadata/tvmaze.adapter.js";

describe("MediaRepository & Database Persistence", () => {
  let repo: MediaRepository;
  const tmdb = new TMDBMetadataAdapter();
  const tvmaze = new TVMazeMetadataAdapter();

  beforeAll(async () => {
    await initDatabase(":memory:");
    repo = new MediaRepository();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("upserts and retrieves a canonical movie", async () => {
    const movie = tmdb.normalizeMovie({
      id: 27205,
      imdb_id: "tt1375666",
      title: "Inception",
      original_title: "Inception",
      overview: "A thief enters dreams to plant an idea.",
      release_date: "2010-07-15",
      runtime: 148,
      vote_average: 8.4,
      popularity: 120,
      poster_path: "/inception.jpg",
      genres: [{ id: 1, name: "Action" }, { id: 2, name: "Sci-Fi" }],
      credits: {
        cast: [{ name: "Leonardo DiCaprio", character: "Dom Cobb" }],
        crew: [{ name: "Christopher Nolan", job: "Director" }]
      }
    });

    await repo.upsertMediaItem(movie);

    const retrieved = await repo.findById(movie.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe("cinely:item:mov_tt1375666");
    expect(retrieved?.defaultTitle).toBe("Inception");
    expect(retrieved?.genres).toContain("Action");
    expect(retrieved?.genres).toContain("Sci-Fi");
    expect(retrieved?.directors[0].name).toBe("Christopher Nolan");
    expect(retrieved?.cast[0].name).toBe("Leonardo DiCaprio");
    expect(retrieved?.externalIds.imdbId).toBe("tt1375666");
    expect(retrieved?.externalIds.tmdbId).toBe("27205");
  });

  it("finds canonical ID by external provider mapping", async () => {
    const canonicalId = await repo.findByExternalId("imdb", "tt1375666");
    expect(canonicalId).toBe("cinely:item:mov_tt1375666");

    const byTmdb = await repo.findByExternalId("tmdb", "27205");
    expect(byTmdb).toBe("cinely:item:mov_tt1375666");
  });

  it("upserts TV series seasons and episodes", async () => {
    const show = tvmaze.normalizeShow({
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

    await repo.upsertMediaItem(show);
    await repo.upsertSeasons(seasons);

    const series = await repo.findById(show.id);
    expect(series?.seasonsCount).toBe(1);
    expect(series?.episodesCount).toBe(1);

    const seasonDetail = await repo.getSeasonDetail(show.id, 1);
    expect(seasonDetail).not.toBeNull();
    expect(seasonDetail?.seasonNumber).toBe(1);
    expect(seasonDetail?.episodes.length).toBe(1);
    expect(seasonDetail?.episodes[0].title).toBe("Pilot");
  });

  it("performs fuzzy search across titles", async () => {
    const results = await repo.search("Incept");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].title).toBe("Inception");
    expect(results[0].canonicalId).toBe("cinely:item:mov_tt1375666");
  });

  it("retrieves curated discovery lists filtered by genre", async () => {
    const sciFiItems = await repo.getDiscoverList({ genre: "Sci-Fi" });
    expect(sciFiItems.length).toBeGreaterThan(0);
    expect(sciFiItems[0].genres).toContain("Sci-Fi");
  });
});
