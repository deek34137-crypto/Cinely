/**
 * Canonical Media Types & Schema Definitions for Cinely
 */

export type MediaKind = "movie" | "series" | "episode" | "anime" | "live_tv" | "other";

export interface ExternalIds {
  imdbId?: string | null;
  tmdbId?: string | null;
  tvmazeId?: string | null;
  kitsuId?: string | null;
  anidbId?: string | null;
  custom?: Record<string, string>;
}

export interface CreditPerson {
  id?: string;
  name: string;
  role?: string;        // e.g. "Director", "Writer", "Producer"
  character?: string;   // For cast
  profileUrl?: string | null;
}

export interface ArtworkSet {
  posterUrl?: string | null;
  backdropUrl?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  thumbnailUrl?: string | null;
}

export interface CanonicalMediaItem {
  id: string;                          // Deterministic URN, e.g. 'cinely:item:mov_tt1492048'
  mediaKind: MediaKind;
  originalTitle: string;
  defaultTitle: string;
  localizedTitles?: Record<string, string>;
  overview: string | null;
  tagline?: string | null;
  releaseDate?: string | null;         // YYYY-MM-DD
  releaseYear: number | null;
  runtimeMinutes?: number | null;
  certification?: string | null;       // e.g. "PG-13", "TV-MA"
  genres: string[];
  artwork: ArtworkSet;
  trailerUrl?: string | null;
  externalIds: ExternalIds;
  rating?: number | null;              // 0.0 - 10.0
  popularityScore?: number;
  createdAt: string;
  updatedAt: string;
}

export interface NormalizedMediaSummary {
  canonicalId: string;
  mediaKind: MediaKind;
  title: string;
  releaseYear: number | null;
  posterUrl?: string | null;
  backdropUrl?: string | null;
  rating?: number | null;
  overview?: string | null;
  genres: string[];
  externalIds: ExternalIds;
}

export interface NormalizedMediaDetail extends CanonicalMediaItem {
  directors: CreditPerson[];
  writers: CreditPerson[];
  cast: CreditPerson[];
  seasonsCount?: number;
  episodesCount?: number;
}

export interface NormalizedEpisode {
  id: string;                          // e.g. 'cinely:ep:tt1492048:s1:e1'
  seriesId: string;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  overview: string | null;
  stillUrl?: string | null;
  airDate?: string | null;
  runtimeMinutes?: number | null;
  externalIds: ExternalIds;
}

export interface NormalizedSeasonDetail {
  id: string;
  seriesId: string;
  seasonNumber: number;
  title: string;
  overview?: string | null;
  posterUrl?: string | null;
  airDate?: string | null;
  episodes: NormalizedEpisode[];
}
