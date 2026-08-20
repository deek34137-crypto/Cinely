export interface ProgressRecord {
  id: string;
  user_id: string;
  media_id: string;
  season_number: number;
  episode_number: number;
  position_seconds: number;
  duration_seconds: number;
  completed: number; // 0 or 1
  client_sequence?: number;
  updated_at: string;
}

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
