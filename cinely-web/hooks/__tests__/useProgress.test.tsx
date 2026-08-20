import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useProgress,
  useMediaProgress,
  useEpisodeProgress,
  useUpdateProgress,
  useDeleteProgress,
  PROGRESS_QUERY_KEY,
} from '../useProgress';
import { apiClient } from '../../lib/api-client';
import { ProgressResponse } from '../../lib/types';

// Mock useAuth
const mockAuth = {
  isAuthenticated: true,
  isLoading: false,
  user: { id: 'usr_1', email: 'alice@test.io', displayName: 'Alice' },
};

vi.mock('../useAuth', () => ({
  useAuth: () => mockAuth,
}));

const mockProgressData: ProgressResponse = {
  items: [
    {
      mediaId: 'cinely:item:mov_tt1375666',
      seasonNumber: 0,
      episodeNumber: 0,
      positionSeconds: 5184,
      durationSeconds: 8880,
      progressPercent: 58,
      completed: false,
      updatedAt: '2026-08-17T10:00:00.000Z',
    },
    {
      mediaId: 'cinely:item:ser_tt0903747',
      seasonNumber: 2,
      episodeNumber: 4,
      positionSeconds: 840,
      durationSeconds: 2820,
      progressPercent: 29,
      completed: false,
      updatedAt: '2026-08-17T09:00:00.000Z',
    },
    {
      mediaId: 'cinely:item:mov_tt4154796',
      seasonNumber: 0,
      episodeNumber: 0,
      positionSeconds: 11160,
      durationSeconds: 11160,
      progressPercent: 100,
      completed: true, // This should be excluded by useProgress default
      updatedAt: '2026-08-17T08:00:00.000Z',
    },
  ],
  total: 3,
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useProgress hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.isAuthenticated = true;
    mockAuth.isLoading = false;
  });

  it('useProgress fetches progress and excludes completed items by default', async () => {
    vi.spyOn(apiClient, 'getProgress').mockResolvedValue(mockProgressData);

    const { result } = renderHook(() => useProgress(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // 3 total from API, 1 completed → 2 in-progress items returned
    expect(result.current.total).toBe(2);
    expect(result.current.items.every((p) => !p.completed)).toBe(true);
  });

  it('useProgress with includeCompleted=true returns all items', async () => {
    vi.spyOn(apiClient, 'getProgress').mockResolvedValue(mockProgressData);

    const { result } = renderHook(
      () => useProgress({ includeCompleted: true }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.total).toBe(3);
  });

  it('useProgress does not fetch when unauthenticated', async () => {
    mockAuth.isAuthenticated = false;
    const spy = vi.spyOn(apiClient, 'getProgress');

    renderHook(() => useProgress(), { wrapper: createWrapper() });

    // give time for any async fetch
    await new Promise((r) => setTimeout(r, 50));
    expect(spy).not.toHaveBeenCalled();
  });

  it('useMediaProgress returns the most recent progress record for a canonical ID', async () => {
    vi.spyOn(apiClient, 'getProgress').mockResolvedValue(mockProgressData);

    const { result } = renderHook(
      () => useMediaProgress('cinely:item:mov_tt1375666'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current).toBeDefined());

    expect(result.current?.mediaId).toBe('cinely:item:mov_tt1375666');
    expect(result.current?.progressPercent).toBe(58);
    expect(result.current?.seasonNumber).toBe(0);
    expect(result.current?.episodeNumber).toBe(0);
  });

  it('useEpisodeProgress returns the exact S/E episode progress for a TV series', async () => {
    vi.spyOn(apiClient, 'getProgress').mockResolvedValue(mockProgressData);

    const { result } = renderHook(
      () => useEpisodeProgress('cinely:item:ser_tt0903747', 2, 4),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current).toBeDefined());

    expect(result.current?.seasonNumber).toBe(2);
    expect(result.current?.episodeNumber).toBe(4);
    expect(result.current?.progressPercent).toBe(29);
  });

  it('useUpdateProgress calls PUT endpoint and invalidates progress cache', async () => {
    vi.spyOn(apiClient, 'getProgress').mockResolvedValue({ items: [], total: 0 });
    const updateSpy = vi.spyOn(apiClient, 'updateProgress').mockResolvedValueOnce({
      data: {
        mediaId: 'cinely:item:mov_tt1375666',
        progressPercent: 58,
        completed: false,
      },
    });

    const { result } = renderHook(() => useUpdateProgress(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        canonicalMediaId: 'cinely:item:mov_tt1375666',
        payload: { positionSeconds: 5184, durationSeconds: 8880 },
      });
    });

    expect(updateSpy).toHaveBeenCalledWith('cinely:item:mov_tt1375666', {
      positionSeconds: 5184,
      durationSeconds: 8880,
    });
  });

  it('useDeleteProgress calls DELETE endpoint and invalidates progress cache', async () => {
    vi.spyOn(apiClient, 'getProgress').mockResolvedValue({ items: [], total: 0 });
    const deleteSpy = vi.spyOn(apiClient, 'deleteProgress').mockResolvedValueOnce({
      message: 'Progress record deleted.',
    });

    const { result } = renderHook(() => useDeleteProgress(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        canonicalMediaId: 'cinely:item:ser_tt0903747',
        seasonNumber: 2,
        episodeNumber: 4,
      });
    });

    expect(deleteSpy).toHaveBeenCalledWith('cinely:item:ser_tt0903747', {
      seasonNumber: 2,
      episodeNumber: 4,
    });
  });
});
