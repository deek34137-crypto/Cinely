import { NormalizedMediaSummary } from "./media.js";

export interface WatchlistItemRecord {
  id: string;
  user_id: string;
  media_id: string;
  created_at: string;
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
