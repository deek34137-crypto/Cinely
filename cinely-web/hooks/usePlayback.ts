import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { PlaybackResponse } from '../lib/types';

export interface UsePlaybackOptions {
  season?: number;
  episode?: number;
  enabled?: boolean;
}

/**
 * Queries the Phase 3B Playback API (`GET /v1/media/:id/playback`).
 * Returns selected primary web-playable stream, fallback alternatives, and stream metadata.
 */
export function usePlayback(
  mediaId: string,
  options: UsePlaybackOptions = {}
) {
  const season = options.season ?? 0;
  const episode = options.episode ?? 0;
  const isQueryEnabled = (options.enabled ?? true) && Boolean(mediaId);

  return useQuery<PlaybackResponse, Error>({
    queryKey: ['playback', mediaId, season, episode],
    queryFn: async () => {
      return apiClient.getPlayback(mediaId, {
        season: season > 0 ? season : undefined,
        episode: episode > 0 ? episode : undefined,
      });
    },
    enabled: isQueryEnabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // Player failover engine handles stream recovery
  });
}
