/**
 * Canonical frontend types mirroring Cinely Media Engine API specifications.
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
  role?: string;
  character?: string;
  profileUrl?: string | null;
}

export interface ArtworkSet {
  posterUrl?: string | null;
  backdropUrl?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  thumbnailUrl?: string | null;
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

export interface CanonicalMediaItem {
  id: string;
  mediaKind: MediaKind;
  originalTitle: string;
  defaultTitle: string;
  localizedTitles?: Record<string, string>;
  overview: string | null;
  tagline?: string | null;
  releaseDate?: string | null;
  releaseYear: number | null;
  runtimeMinutes?: number | null;
  certification?: string | null;
  genres: string[];
  artwork: ArtworkSet;
  trailerUrl?: string | null;
  externalIds: ExternalIds;
  rating?: number | null;
  popularityScore?: number;
  createdAt: string;
  updatedAt: string;
}

export interface NormalizedMediaDetail extends CanonicalMediaItem {
  directors: CreditPerson[];
  writers: CreditPerson[];
  cast: CreditPerson[];
  seasonsCount?: number;
  episodesCount?: number;
}

export interface NormalizedEpisode {
  id: string;
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

export interface DiscoverSection {
  id: string;
  title: string;
  items: NormalizedMediaSummary[];
}

export interface DiscoverSectionsResponse {
  sections: DiscoverSection[];
  total: number;
}

export interface SearchResponse {
  query: string;
  results: NormalizedMediaSummary[];
  count: number;
}

export interface ApiResponse<T> {
  data: T;
}

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  code: string;
  timestamp: string;
  invalidParams?: Array<{
    name: string;
    reason: string;
  }>;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: string;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface AuthResponse {
  user: UserProfile;
  tokens: AuthTokens;
}

export interface UserMeResponse {
  user: UserProfile;
}

export interface WatchlistMediaItem extends NormalizedMediaSummary {
  addedAt: string;
}

export interface WatchlistResponse {
  items: WatchlistMediaItem[];
  total: number;
}

export interface WatchlistMutationResponse {
  mediaId: string;
  inWatchlist: boolean;
  addedAt?: string;
}

/**
 * Mirrors PlaybackProgress from Phase 2B Fastify Engine.
 * progressPercent is server-computed and must not be recalculated client-side.
 */
export interface PlaybackProgress {
  mediaId: string;
  seasonNumber: number;
  episodeNumber: number;
  positionSeconds: number;
  durationSeconds: number;
  progressPercent: number;
  completed: boolean;
  clientSequence?: number;
  updatedAt: string;
}

export interface ProgressResponse {
  items: PlaybackProgress[];
  total: number;
}

export interface UpdateProgressPayload {
  seasonNumber?: number;
  episodeNumber?: number;
  positionSeconds: number;
  durationSeconds: number;
  clientSequence?: number;
  completed?: boolean;
}

// ─── Addon Types (Phase 2C) ──────────────────────────────────────────────────

export interface AddonCapabilities {
  catalog: boolean;
  meta: boolean;
  stream: boolean;
  subtitles: boolean;
}

/** A server-approved addon entry from GET /v1/addons/catalog */
export interface AddonCatalogItem {
  id: string;
  name: string;
  version: string;
  description?: string;
  manifestUrl: string;
  logoUrl?: string | null;
  backgroundUrl?: string | null;
  types: string[];
  categories: string[];
  stars: number;
  /** Global server-side enabled flag. false → user cannot enable. */
  enabled: boolean;
  /** Whether this addon accepts a configuration object via PUT */
  configurable: boolean;
  capabilities: AddonCapabilities;
}

/** Addon catalog item merged with per-user preferences (GET /v1/users/me/addons) */
export interface UserAddonItem extends AddonCatalogItem {
  userEnabled: boolean;
  priorityOrder: number;
  userConfiguration?: Record<string, unknown>;
}

export interface AddonCatalogResponse {
  items: AddonCatalogItem[];
  total: number;
}

export interface UserAddonsResponse {
  items: UserAddonItem[];
  total: number;
}

export interface UpdateUserAddonPayload {
  enabled?: boolean;
  priorityOrder?: number;
  configuration?: Record<string, unknown>;
}

export interface AddonToggleResponse {
  addonId: string;
  enabled: boolean;
}

// ─── Playback Types (Phase 3B/3C) ─────────────────────────────────────────────

export type StreamProtocol = 'hls' | 'dash' | 'http' | 'torrent' | 'other';

export interface PlaybackSource {
  id: string;
  providerId: string;
  providerName: string;
  name: string;
  title: string;
  protocol: StreamProtocol;
  url: string;
  isWebPlayable: boolean;
  quality: string;
  resolution?: string;
  codec?: string;
  audio?: string[];
  sizeBytes?: number;
  headers?: Record<string, string>;
  score: number;
}


export interface PlaybackResponse {
  mediaId: string;
  mediaKind: MediaKind;
  title: string;
  seasonNumber: number;
  episodeNumber: number;
  selected: PlaybackSource | null;
  alternatives: PlaybackSource[];
  totalPlayable: number;
  hasPlayableSource: boolean;
}

// ─── Custom Addon Types (Phase 4) ─────────────────────────────────────────────

export interface CustomAddonManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  resources: string[];
  types: string[];
  catalogs: Array<{ type: string; id: string; name?: string }>;
  idPrefixes?: string[];
  behaviorHints?: Record<string, unknown>;
}

export interface CustomAddonRecord {
  /** Stable hash of manifestUrl — used as unique identifier. */
  id: string;
  name: string;
  manifestUrl: string;
  manifest: CustomAddonManifest;
  enabled: boolean;
  /**
   * User-controlled stream ranking priority.
   * Lower values rank higher. Defaults to after the last server addon.
   * Custom vs server origin is NOT itself a ranking factor.
   */
  priorityOrder: number;
  installedAt: number; // Unix ms timestamp
  /** Last known stream test result. Populated on first playback attempt. */
  lastTestStatus?: 'untested' | 'ok' | 'cors_blocked' | 'timeout' | 'no_streams' | 'error';
}

export type CustomAddonInstallStatus =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; manifest: CustomAddonManifest }
  | { status: 'error'; message: string; isCorsLikely: boolean };

export type CustomAddonErrorKind =
  | 'CORS_BLOCKED'
  | 'TIMEOUT'
  | 'MANIFEST_INVALID'
  | 'HTTP_ERROR'
  | 'MIXED_CONTENT'
  | 'NO_STREAMS'
  | 'UNKNOWN';

export interface CustomAddonError {
  addonId: string;
  addonName: string;
  kind: CustomAddonErrorKind;
  message: string;
}

