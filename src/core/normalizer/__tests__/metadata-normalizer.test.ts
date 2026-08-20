import { describe, it, expect } from "vitest";
import { TMDBMetadataAdapter, TMDBMoviePayload } from "../../../modules/metadata/tmdb.adapter.js";
import { TVMazeMetadataAdapter, TVMazeShowPayload } from "../../../modules/metadata/tvmaze.adapter.js";
import { MetadataNormalizerEngine } from "../metadata-normalizer.js";
import { generateCanonicalId, generateEpisodeId } from "../../utils/id.js";
import { stringSimilarity, normalizeTitle } from "../../utils/fuzzy.js";

describe("Metadata Normalizer & Canonical Engine", () => {
  const tmdbAdapter = new TMDBMetadataAdapter();
  const tvmazeAdapter = new TVMazeMetadataAdapter();
  const normalizer = new MetadataNormalizerEngine();

  describe("Deterministic ID Generation", () => {
    it("generates deterministic canonical IDs for IMDb identifiers", () => {
      const id1 = generateCanonicalId("movie", "tt1375666");
      const id2 = generateCanonicalId("movie", "tt1375666");
      expect(id1).toBe("cinely:item:mov_tt1375666");
      expect(id1).toBe(id2);
    });

    it("generates consistent deterministic hashes for custom identifiers", () => {
      const id1 = generateCanonicalId("movie", "tmdb:894721");
      const id2 = generateCanonicalId("movie", "tmdb:894721");
      expect(id1).toBe(id2);
      expect(id1).toMatch(/^cinely:item:mov_[a-f0-9]{12}$/);
    });

    it("generates episode canonical IDs", () => {
      const epId = generateEpisodeId("cinely:item:ser_tt0903747", 1, 1);
      expect(epId).toBe("cinely:item:ser_tt0903747:s1:e1");
    });
  });

  describe("Title Normalization & Fuzzy Similarity", () => {
    it("normalizes titles by stripping accents and special characters", () => {
      expect(normalizeTitle("Amélie (2001) - Special Edition!")).toBe("amelie 2001 special edition");
      expect(normalizeTitle("Spider-Man: Across the Spider-Verse")).toBe("spider man across the spider verse");
    });

    it("calculates accurate Dice bigram similarity", () => {
      const sim1 = stringSimilarity("Inception", "Inception (2010)");
      const sim2 = stringSimilarity("Inception", "Interstellar");
      expect(sim1).toBeGreaterThan(0.7);
      expect(sim2).toBeLessThan(0.4);
    });
  });

  describe("TMDB Movie Normalization", () => {
    it("normalizes raw TMDB movie payload to canonical format", () => {
      const rawMovie: TMDBMoviePayload = {
        id: 27205,
        imdb_id: "tt1375666",
        title: "Inception",
        original_title: "Inception",
        overview: "A thief who steals corporate secrets through the use of dream-sharing technology.",
        tagline: "Your mind is the scene of the crime.",
        release_date: "2010-07-15",
        runtime: 148,
        vote_average: 8.364,
        popularity: 124.5,
        poster_path: "/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",
        backdrop_path: "/8ZTVqvKDQUfrVZ0g78fL4fLzbgw.jpg",
        genres: [
          { id: 28, name: "Action" },
          { id: 878, name: "Science Fiction" },
          { id: 12, name: "Adventure" }
        ],
        credits: {
          cast: [
            { name: "Leonardo DiCaprio", character: "Dom Cobb", profile_path: "/wo2AlXUrFFgfknRLNokoft9jeWU.jpg" },
            { name: "Joseph Gordon-Levitt", character: "Arthur", profile_path: "/4PglepsoqC4gJ2W4915XyN8mY.jpg" }
          ],
          crew: [
            { name: "Christopher Nolan", job: "Director" },
            { name: "Christopher Nolan", job: "Screenplay", department: "Writing" }
          ]
        }
      };

      const normalized = tmdbAdapter.normalizeMovie(rawMovie);

      expect(normalized.id).toBe("cinely:item:mov_tt1375666");
      expect(normalized.mediaKind).toBe("movie");
      expect(normalized.defaultTitle).toBe("Inception");
      expect(normalized.releaseYear).toBe(2010);
      expect(normalized.runtimeMinutes).toBe(148);
      expect(normalized.genres).toEqual(["Action", "Science Fiction", "Adventure"]);
      expect(normalized.artwork.posterUrl).toContain("https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg");
      expect(normalized.directors[0].name).toBe("Christopher Nolan");
      expect(normalized.cast[0].name).toBe("Leonardo DiCaprio");
    });
  });

  describe("TVMaze Series & Episodic Normalization", () => {
    it("normalizes raw TVMaze series and embedded episodes", () => {
      const rawShow: TVMazeShowPayload = {
        id: 169,
        name: "Breaking Bad",
        type: "Scripted",
        language: "English",
        genres: ["Drama", "Crime", "Thriller"],
        status: "Ended",
        runtime: 60,
        premiered: "2008-01-20",
        rating: { average: 9.2 },
        externals: { imdb: "tt0903747", thetvdb: 81189 },
        image: {
          medium: "https://static.tvmaze.com/uploads/images/medium_portrait/0/2400.jpg",
          original: "https://static.tvmaze.com/uploads/images/original_untouched/0/2400.jpg"
        },
        summary: "<p>A high school chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing methamphetamine.</p>",
        _embedded: {
          episodes: [
            {
              id: 12240,
              name: "Pilot",
              season: 1,
              number: 1,
              airdate: "2008-01-20",
              runtime: 58,
              summary: "<p>Walter White turns to crime after a terminal cancer diagnosis.</p>"
            },
            {
              id: 12241,
              name: "Cat's in the Bag...",
              season: 1,
              number: 2,
              airdate: "2008-01-27",
              runtime: 48,
              summary: "<p>Walt and Jesse attempt to dispose of two bodies.</p>"
            }
          ]
        }
      };

      const normalized = tvmazeAdapter.normalizeShow(rawShow);
      const seasons = tvmazeAdapter.normalizeSeasonsAndEpisodes(rawShow);

      expect(normalized.id).toBe("cinely:item:ser_tt0903747");
      expect(normalized.mediaKind).toBe("series");
      expect(normalized.defaultTitle).toBe("Breaking Bad");
      expect(normalized.overview).toBe("A high school chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing methamphetamine.");
      expect(normalized.genres).toEqual(["Drama", "Crime", "Thriller"]);
      expect(normalized.rating).toBe(9.2);

      expect(seasons.length).toBe(1);
      expect(seasons[0].episodes.length).toBe(2);
      expect(seasons[0].episodes[0].id).toBe("cinely:item:ser_tt0903747:s1:e1");
      expect(seasons[0].episodes[0].title).toBe("Pilot");
      expect(seasons[0].episodes[0].overview).toBe("Walter White turns to crime after a terminal cancer diagnosis.");
    });
  });

  describe("Metadata Reconciliation", () => {
    it("reconciles two sources without duplicating credits or losing IDs", () => {
      const primary = tmdbAdapter.normalizeMovie({
        id: 27205,
        imdb_id: "tt1375666",
        title: "Inception",
        original_title: "Inception",
        overview: "A thief enters dreams.",
        release_date: "2010-07-15",
        poster_path: "/poster1.jpg",
        genres: [{ id: 1, name: "Sci-Fi" }],
        credits: {
          cast: [{ name: "Leonardo DiCaprio", character: "Dom Cobb" }],
          crew: [{ name: "Christopher Nolan", job: "Director" }]
        }
      });

      const secondary = {
        genres: ["Action", "Sci-Fi"],
        overview: "A skilled thief steals secrets from inside subconscious minds.",
        tagline: "The dream is real."
      };

      const reconciled = normalizer.reconcile(primary, secondary);

      expect(reconciled.id).toBe("cinely:item:mov_tt1375666");
      expect(reconciled.tagline).toBe("The dream is real.");
      expect(reconciled.genres).toContain("Action");
      expect(reconciled.genres).toContain("Sci-Fi");
      expect(reconciled.directors[0].name).toBe("Christopher Nolan");
    });
  });
});
