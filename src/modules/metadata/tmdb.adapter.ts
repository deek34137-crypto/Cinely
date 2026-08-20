import {
  NormalizedMediaDetail,
  NormalizedMediaSummary,
  MediaKind,
  CreditPerson
} from "../../core/types/media.js";
import { generateCanonicalId } from "../../core/utils/id.js";

export interface TMDBMoviePayload {
  id: number;
  imdb_id?: string;
  title: string;
  original_title: string;
  overview: string;
  tagline?: string;
  release_date?: string;
  runtime?: number;
  vote_average?: number;
  popularity?: number;
  poster_path?: string;
  backdrop_path?: string;
  genres?: Array<{ id: number; name: string }>;
  credits?: {
    cast?: Array<{ name: string; character?: string; profile_path?: string }>;
    crew?: Array<{ name: string; job?: string; department?: string; profile_path?: string }>;
  };
}

export interface TMDBSeriesPayload {
  id: number;
  external_ids?: { imdb_id?: string; tvdb_id?: number };
  name: string;
  original_name: string;
  overview: string;
  first_air_date?: string;
  vote_average?: number;
  popularity?: number;
  poster_path?: string;
  backdrop_path?: string;
  genres?: Array<{ id: number; name: string }>;
  number_of_seasons?: number;
  number_of_episodes?: number;
  credits?: {
    cast?: Array<{ name: string; character?: string; profile_path?: string }>;
    crew?: Array<{ name: string; job?: string; department?: string; profile_path?: string }>;
  };
}

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

export class TMDBMetadataAdapter {
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  getApiKey(): string | undefined {
    return this.apiKey;
  }

  /**
   * Normalizes a raw TMDB Movie API response into a Canonical NormalizedMediaDetail.
   */
  normalizeMovie(raw: TMDBMoviePayload): NormalizedMediaDetail {
    const primaryId = raw.imdb_id || `tmdb:${raw.id}`;
    const canonicalId = generateCanonicalId("movie", primaryId);
    const releaseYear = raw.release_date ? parseInt(raw.release_date.split("-")[0], 10) : null;

    const directors: CreditPerson[] = (raw.credits?.crew || [])
      .filter(c => c.job === "Director")
      .map(c => ({
        name: c.name,
        role: "Director",
        profileUrl: c.profile_path ? `${TMDB_IMAGE_BASE}/w185${c.profile_path}` : null
      }));

    const writers: CreditPerson[] = (raw.credits?.crew || [])
      .filter(c => c.department === "Writing" || c.job === "Screenplay" || c.job === "Writer")
      .map(c => ({
        name: c.name,
        role: "Writer",
        profileUrl: c.profile_path ? `${TMDB_IMAGE_BASE}/w185${c.profile_path}` : null
      }));

    const cast: CreditPerson[] = (raw.credits?.cast || []).slice(0, 15).map(c => ({
      name: c.name,
      character: c.character,
      profileUrl: c.profile_path ? `${TMDB_IMAGE_BASE}/w185${c.profile_path}` : null
    }));

    return {
      id: canonicalId,
      mediaKind: "movie",
      originalTitle: raw.original_title || raw.title,
      defaultTitle: raw.title,
      overview: raw.overview || null,
      tagline: raw.tagline || null,
      releaseDate: raw.release_date || null,
      releaseYear: isNaN(releaseYear as number) ? null : releaseYear,
      runtimeMinutes: raw.runtime || null,
      certification: null,
      genres: (raw.genres || []).map(g => g.name),
      artwork: {
        posterUrl: raw.poster_path ? `${TMDB_IMAGE_BASE}/w500${raw.poster_path}` : null,
        backdropUrl: raw.backdrop_path ? `${TMDB_IMAGE_BASE}/original${raw.backdrop_path}` : null,
        logoUrl: null,
        bannerUrl: null,
        thumbnailUrl: raw.poster_path ? `${TMDB_IMAGE_BASE}/w185${raw.poster_path}` : null
      },
      trailerUrl: null,
      externalIds: {
        tmdbId: String(raw.id),
        imdbId: raw.imdb_id || null
      },
      rating: raw.vote_average || null,
      popularityScore: raw.popularity || 0,
      directors,
      writers,
      cast,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Normalizes a raw TMDB TV Series API response into a Canonical NormalizedMediaDetail.
   */
  normalizeSeries(raw: TMDBSeriesPayload): NormalizedMediaDetail {
    const imdbId = raw.external_ids?.imdb_id || null;
    const primaryId = imdbId || `tmdb:${raw.id}`;
    const canonicalId = generateCanonicalId("series", primaryId);
    const releaseYear = raw.first_air_date ? parseInt(raw.first_air_date.split("-")[0], 10) : null;

    const directors: CreditPerson[] = (raw.credits?.crew || [])
      .filter(c => c.job === "Director" || c.job === "Executive Producer")
      .map(c => ({
        name: c.name,
        role: c.job || "Director",
        profileUrl: c.profile_path ? `${TMDB_IMAGE_BASE}/w185${c.profile_path}` : null
      }));

    const writers: CreditPerson[] = (raw.credits?.crew || [])
      .filter(c => c.department === "Writing" || c.job === "Writer" || c.job === "Creator")
      .map(c => ({
        name: c.name,
        role: "Writer",
        profileUrl: c.profile_path ? `${TMDB_IMAGE_BASE}/w185${c.profile_path}` : null
      }));

    const cast: CreditPerson[] = (raw.credits?.cast || []).slice(0, 15).map(c => ({
      name: c.name,
      character: c.character,
      profileUrl: c.profile_path ? `${TMDB_IMAGE_BASE}/w185${c.profile_path}` : null
    }));

    return {
      id: canonicalId,
      mediaKind: "series",
      originalTitle: raw.original_name || raw.name,
      defaultTitle: raw.name,
      overview: raw.overview || null,
      tagline: null,
      releaseDate: raw.first_air_date || null,
      releaseYear: isNaN(releaseYear as number) ? null : releaseYear,
      runtimeMinutes: null,
      certification: null,
      genres: (raw.genres || []).map(g => g.name),
      artwork: {
        posterUrl: raw.poster_path ? `${TMDB_IMAGE_BASE}/w500${raw.poster_path}` : null,
        backdropUrl: raw.backdrop_path ? `${TMDB_IMAGE_BASE}/original${raw.backdrop_path}` : null,
        logoUrl: null,
        bannerUrl: null,
        thumbnailUrl: raw.poster_path ? `${TMDB_IMAGE_BASE}/w185${raw.poster_path}` : null
      },
      trailerUrl: null,
      externalIds: {
        tmdbId: String(raw.id),
        imdbId
      },
      rating: raw.vote_average || null,
      popularityScore: raw.popularity || 0,
      directors,
      writers,
      cast,
      seasonsCount: raw.number_of_seasons || 0,
      episodesCount: raw.number_of_episodes || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Normalizes search result array into NormalizedMediaSummary array.
   */
  normalizeSearchResult(results: any[], mediaKind: MediaKind = "movie"): NormalizedMediaSummary[] {
    return results.map(item => {
      const isTv = mediaKind === "series" || item.media_type === "tv" || !!item.first_air_date;
      const title = isTv ? item.name : item.title;
      const releaseDate = isTv ? item.first_air_date : item.release_date;
      const releaseYear = releaseDate ? parseInt(releaseDate.split("-")[0], 10) : null;
      const kind: MediaKind = isTv ? "series" : "movie";
      const canonicalId = generateCanonicalId(kind, item.imdb_id || `tmdb:${item.id}`);

      return {
        canonicalId,
        mediaKind: kind,
        title,
        releaseYear: isNaN(releaseYear as number) ? null : releaseYear,
        posterUrl: item.poster_path ? `${TMDB_IMAGE_BASE}/w500${item.poster_path}` : null,
        backdropUrl: item.backdrop_path ? `${TMDB_IMAGE_BASE}/original${item.backdrop_path}` : null,
        rating: item.vote_average || null,
        overview: item.overview || null,
        genres: [],
        externalIds: {
          tmdbId: String(item.id),
          imdbId: item.imdb_id || null
        }
      };
    });
  }
}
