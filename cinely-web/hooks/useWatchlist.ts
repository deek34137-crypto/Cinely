'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { useAuth } from './useAuth';
import { WatchlistMediaItem } from '../lib/types';

export const WATCHLIST_QUERY_KEY = ['watchlist'] as const;

/**
 * Hook to retrieve the authenticated user's complete watchlist.
 * Only enabled when authentication bootstrap is resolved and user is authenticated.
 */
export function useWatchlist() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const query = useQuery({
    queryKey: WATCHLIST_QUERY_KEY,
    queryFn: () => apiClient.getWatchlist(),
    enabled: isAuthenticated && !isAuthLoading,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const items: WatchlistMediaItem[] = query.data?.items || [];
  const total = query.data?.total ?? items.length;

  return {
    ...query,
    items,
    total,
  };
}

/**
 * Selector hook to check if a specific canonical media item is currently in the user's watchlist.
 */
export function useIsInWatchlist(canonicalMediaId?: string | null): boolean {
  const { items } = useWatchlist();
  if (!canonicalMediaId) return false;
  return items.some((item) => item.canonicalId === canonicalMediaId);
}

/**
 * Hook providing authoritative toggle mutation (Add / Remove) for a media item.
 * On mutation success, invalidates the ["watchlist"] query cache for accurate synchronization.
 */
export function useToggleWatchlist(canonicalMediaId?: string | null) {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const isInWatchlist = useIsInWatchlist(canonicalMediaId);

  const addMutation = useMutation({
    mutationFn: (id: string) => apiClient.addToWatchlist(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WATCHLIST_QUERY_KEY });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => apiClient.removeFromWatchlist(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WATCHLIST_QUERY_KEY });
    },
  });

  const isPending = addMutation.isPending || removeMutation.isPending;

  const toggleWatchlist = async (): Promise<boolean> => {
    if (!canonicalMediaId || !isAuthenticated) {
      return false;
    }

    if (isInWatchlist) {
      const res = await removeMutation.mutateAsync(canonicalMediaId);
      return res.inWatchlist;
    } else {
      const res = await addMutation.mutateAsync(canonicalMediaId);
      return res.inWatchlist;
    }
  };

  return {
    toggleWatchlist,
    isInWatchlist,
    isPending,
    error: addMutation.error || removeMutation.error,
  };
}
