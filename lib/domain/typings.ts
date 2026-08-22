export type MediaType = "movie" | "tv" | "anime";

export interface MediaItem {
  id: string | number;
  tmdbId?: number;
  anilistId?: number;
  title: string;
  originalTitle?: string;
  overview: string;
  posterUrl: string;
  backdropUrl: string;
  mediaType: MediaType;
  releaseDate?: string;
  voteAverage?: number;
  voteCount?: number;
  genres?: string[];
  popularity?: number;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profileUrl: string;
  order: number;
}

export interface VideoTrailer {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
}

export interface Episode {
  id: number;
  episodeNumber: number;
  seasonNumber: number;
  title: string;
  overview: string;
  stillUrl: string;
  airDate?: string;
  runtime?: number | null;
  voteAverage?: number;
}

export interface Season {
  id: number;
  seasonNumber: number;
  name: string;
  overview: string;
  posterUrl: string;
  episodeCount: number;
  episodes?: Episode[];
}

export interface MovieDetails extends MediaItem {
  mediaType: "movie";
  runtime?: number | null;
  tagline?: string | null;
  cast: CastMember[];
  trailers: VideoTrailer[];
  similar: MediaItem[];
  recommendations: MediaItem[];
  imdbId?: string | null;
  budget?: number;
  revenue?: number;
  status?: string;
}

export interface TvDetails extends MediaItem {
  mediaType: "tv";
  numberOfSeasons: number;
  numberOfEpisodes: number;
  seasons: Season[];
  cast: CastMember[];
  trailers: VideoTrailer[];
  similar: MediaItem[];
  recommendations: MediaItem[];
  status?: string;
  tagline?: string | null;
}

export interface ScrapeStreamResult {
  providerId: string;
  providerName: string;
  streamType: "hls" | "dash" | "mp4";
  url: string;
  quality?: string;
  headers?: Record<string, string>;
  referer?: string;
  subtitles?: Array<{
    lang: string;
    url: string;
  }>;
  audioTracks?: Array<{
    lang: string;
    label: string;
    url?: string;
  }>;
  isDirect?: boolean;
}

export interface PlaybackSessionToken {
  url: string;
  referer?: string;
  origin?: string;
  headers?: Record<string, string>;
  streamType: "hls" | "dash" | "mp4";
  refresh?: string;
  exp?: number;
}
