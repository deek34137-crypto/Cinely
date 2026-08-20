import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useWatchlist, useIsInWatchlist, useToggleWatchlist, WATCHLIST_QUERY_KEY } from '../useWatchlist';
import { apiClient } from '../../lib/api-client';
import { WatchlistResponse } from '../../lib/types';

// Mock useAuth
const mockAuth = {
  isAuthenticated: true,
  isLoading: false,
  user: { id: 'usr_1', email: 'alice@test.io', displayName: 'Alice' },
};

vi.mock('../useAuth', () => ({
  useAuth: () => mockAuth,
}));

const mockWatchlistData: WatchlistResponse = {
  items: [
    {
      canonicalId: 'cinely:item:mov_tt1375666',
      mediaKind: 'movie',
      title: 'Inception',
      releaseYear: 2010,
      posterUrl: 'https://image.tmdb.org/t/p/w500/inception.jpg',
      backdropUrl: 'https://image.tmdb.org/t/p/original/inception_bg.jpg',
      rating: 8.4,
      overview: 'A thief enters dreams.',
      genres: ['Sci-Fi', 'Action'],
      externalIds: { imdbId: 'tt1375666' },
      addedAt: '2026-08-17T10:00:00.000Z',
    },
  ],
  total: 1,
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useWatchlist and related hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.isAuthenticated = true;
    mockAuth.isLoading = false;
  });

  it('useWatchlist fetches and returns watchlist items for authenticated user', async () => {
    vi.spyOn(apiClient, 'getWatchlist').mockResolvedValueOnce(mockWatchlistData);

    const { result } = renderHook(() => useWatchlist(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.total).toBe(1);
    expect(result.current.items[0].canonicalId).toBe('cinely:item:mov_tt1375666');
    expect(result.current.items[0].title).toBe('Inception');
  });

  it('useIsInWatchlist returns true when item is in cache and false when not', async () => {
    vi.spyOn(apiClient, 'getWatchlist').mockResolvedValue(mockWatchlistData);

    const { result } = renderHook(
      () => ({
        inWatchlist: useIsInWatchlist('cinely:item:mov_tt1375666'),
        notInWatchlist: useIsInWatchlist('cinely:item:ser_tt0903747'),
      }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.inWatchlist).toBe(true);
      expect(result.current.notInWatchlist).toBe(false);
    });
  });

  it('useToggleWatchlist adds an item when not currently in watchlist', async () => {
    vi.spyOn(apiClient, 'getWatchlist').mockResolvedValue(mockWatchlistData);
    const addSpy = vi.spyOn(apiClient, 'addToWatchlist').mockResolvedValueOnce({
      mediaId: 'cinely:item:ser_tt0903747',
      inWatchlist: true,
      addedAt: '2026-08-17T10:05:00.000Z',
    });

    const { result } = renderHook(() => useToggleWatchlist('cinely:item:ser_tt0903747'), {
      wrapper: createWrapper(),
    });

    let toggleResult: boolean | undefined;
    await act(async () => {
      toggleResult = await result.current.toggleWatchlist();
    });

    expect(addSpy).toHaveBeenCalledWith('cinely:item:ser_tt0903747');
    expect(toggleResult).toBe(true);
  });

  it('useToggleWatchlist removes an item when currently in watchlist', async () => {
    vi.spyOn(apiClient, 'getWatchlist').mockResolvedValue(mockWatchlistData);
    const removeSpy = vi.spyOn(apiClient, 'removeFromWatchlist').mockResolvedValueOnce({
      mediaId: 'cinely:item:mov_tt1375666',
      inWatchlist: false,
    });

    const { result } = renderHook(() => useToggleWatchlist('cinely:item:mov_tt1375666'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isInWatchlist).toBe(true);
    });

    let toggleResult: boolean | undefined;
    await act(async () => {
      toggleResult = await result.current.toggleWatchlist();
    });

    expect(removeSpy).toHaveBeenCalledWith('cinely:item:mov_tt1375666');
    expect(toggleResult).toBe(false);
  });
});
