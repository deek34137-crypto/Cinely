/**
 * Stremio Addon Protocol v3 Interfaces & Manifest Schema
 */

export const STREMIO_AUTHENTIC_CATEGORIES = [
  "anime",
  "asian drama",
  "bollywood",
  "debrid support",
  "http streams",
  "live tv",
  "metadata",
  "misc",
  "movies",
  "music",
  "nsfw",
  "radios",
  "subtitles",
  "torrents",
  "tv shows",
  "usenet"
] as const;

export type StremioCategory = typeof STREMIO_AUTHENTIC_CATEGORIES[number];

export const STREMIO_SORT_OPTIONS = ["popular", "new", "updatedAt"] as const;
export type StremioSortOption = typeof STREMIO_SORT_OPTIONS[number];

export type StremioResourceType = "catalog" | "meta" | "stream" | "subtitles" | "addon_catalog";

export interface StremioResourceDescriptor {
  name: StremioResourceType;
  types?: string[];
  idPrefixes?: string[];
}

export type StremioResource = StremioResourceType | StremioResourceDescriptor;

export interface StremioCatalogExtra {
  name: string;
  isRequired?: boolean;
  options?: string[];
}

export interface StremioCatalogDef {
  id: string;
  type: string;
  name: string;
  extra?: StremioCatalogExtra[];
}

export interface StremioBehaviorHints {
  configurable?: boolean;
  configurationRequired?: boolean;
  adult?: boolean;
  p2p?: boolean;
}

export interface StremioManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  logo?: string;
  background?: string;
  types: string[];
  resources: StremioResource[];
  catalogs: StremioCatalogDef[];
  idPrefixes?: string[];
  behaviorHints?: StremioBehaviorHints;
  contactEmail?: string;
  stremioAddonsConfig?: Record<string, unknown>;
}

export interface StremioCatalogAddonItem {
  id: string;
  name: string;
  version: string;
  description: string;
  logo?: string;
  background?: string;
  types: string[];
  categories: StremioCategory[];
  manifestUrl: string;
  manifest: StremioManifest;
  stars?: number;
  behaviorHints?: StremioBehaviorHints;
  isInstalled?: boolean;
  isEnabled?: boolean;
}

export interface StremioStream {
  url?: string;
  ytId?: string;
  infoHash?: string;
  fileIdx?: number;
  title?: string;
  name?: string;
  description?: string;
  subtitles?: Array<{
    id: string;
    url: string;
    lang: string;
  }>;
  behaviorHints?: {
    notWebReady?: boolean;
    bingeGroup?: string;
    headers?: Record<string, string>;
    proxyHeaders?: Record<string, Record<string, string>>;
    videoHash?: string;
    videoSize?: number;
    filename?: string;
  };
}

export interface StremioStreamResponse {
  streams: StremioStream[];
}

export interface StremioSubtitleTrack {
  id: string;
  url: string;
  lang: string;
}

export interface StremioSubtitleResponse {
  subtitles: StremioSubtitleTrack[];
}

export interface StremioMetaPreview {
  id: string;
  type: string;
  name: string;
  poster?: string;
  background?: string;
  logo?: string;
  description?: string;
  releaseInfo?: string;
  imdbRating?: string;
  genres?: string[];
}

export interface StremioCatalogResponse {
  metas: StremioMetaPreview[];
}
