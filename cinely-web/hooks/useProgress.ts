'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { useAuth } from './useAuth';
import { PlaybackProgress, UpdateProgressPayload } from '../lib/types';

export const PROGRESS_QUERY_KEY = ['progress'] as const;

/**
 * Hook to retrieve all playback progress records for the authenticated user.
 *
 * Only enabled when auth bootstrap is resolved and user is authenticated.
 * Excludes completed items by default (completed === true) to power Continue Watching.
 */
export function useProgress(options?: { includeCompleted?: boolean }) {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const includeCompleted = options?.includeCompleted ?? false;

  const query = useQuery({
    queryKey: PROGRESS_QUERY_KEY,
    queryFn: () => apiClient.getProgress(),
    enabled: isAuthenticated && !isAuthLoading,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const allItems: PlaybackProgress[] = query.data?.items ?? [];

  // Continue Watching filters out completed records; include all for library views
  const items = includeCompleted
    ? allItems
    : allItems.filter((p) => !p.completed);

  return {
    ...query,
    items,
    total: items.length,
  };
}

/**
 * Returns the progress record for a specific canonical media ID.
 * For movies: seasonNumber=0, episodeNumber=0.
 * For TV: find the record matching the specific S/E identity.
 */
export function useMediaProgress(
  canonicalMediaId?: string | null
): PlaybackProgress | undefined {
  const { items } = useProgress({ includeCompleted: true });
  if (!canonicalMediaId) return undefined;
  // For movies returns the single record; for series returns the most recently-updated episode
  const matching = items.filter((p) => p.mediaId === canonicalMediaId);
  if (matching.length === 0) return undefined;
  // Return most recently updated (items are already sorted newest-first from engine)
  return matching[0];
}

/**
 * Returns the exact progress record for a specific TV episode.
 * For movies use seasonNumber=0, episodeNumber=0.
 */
export function useEpisodeProgress(
  canonicalMediaId?: string | null,
  seasonNumber?: number,
  episodeNumber?: number
): PlaybackProgress | undefined {
  const { items } = useProgress({ includeCompleted: true });
  if (!canonicalMediaId) return undefined;
  return items.find(
    (p) =>
      p.mediaId === canonicalMediaId &&
      p.seasonNumber === (seasonNumber ?? 0) &&
      p.episodeNumber === (episodeNumber ?? 0)
  );
}

/**
 * Mutation hook to upsert playback progress for a canonical media ID.
 * On success, invalidates the full progress cache.
 */
export function useUpdateProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      canonicalMediaId,
      payload,
    }: {
      canonicalMediaId: string;
      payload: UpdateProgressPayload;
    }) => apiClient.updateProgress(canonicalMediaId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROGRESS_QUERY_KEY });
    },
  });
}

/**
 * Mutation hook to remove a progress record.
 * On success, invalidates the full progress cache.
 */
export function useDeleteProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      canonicalMediaId,
      seasonNumber,
      episodeNumber,
    }: {
      canonicalMediaId: string;
      seasonNumber?: number;
      episodeNumber?: number;
    }) => apiClient.deleteProgress(canonicalMediaId, { seasonNumber, episodeNumber }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROGRESS_QUERY_KEY });
    },
  });
}
