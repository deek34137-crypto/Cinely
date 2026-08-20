import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { usePlayback } from '../usePlayback';
import { apiClient } from '../../lib/api-client';
import { PlaybackResponse } from '../../lib/types';

describe('usePlayback Hook (Phase 3C)', () => {
  let queryClient: QueryClient;

  const mockPlaybackMovie: PlaybackResponse = {
    mediaId: 'cinely:item:mov_tt1375666',
    mediaKind: 'movie',
    title: 'Inception',
    seasonNumber: 0,
    episodeNumber: 0,
    selected: {
      id: 'cinely:str:comet:1080',
      providerId: 'comet',
      providerName: 'Comet',
      name: 'Comet 1080p',
      title: 'Inception.1080p.HLS',
      protocol: 'hls',
      url: 'https://cdn.example.com/hls/master.m3u8',
      isWebPlayable: true,
      quality: '1080p',
      score: 10_500_000,
    },
    alternatives: [],
    totalPlayable: 1,
    hasPlayableSource: true,
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.restoreAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('fetches movie playback contract from GET /v1/media/:id/playback', async () => {
    const spy = vi.spyOn(apiClient, 'getPlayback').mockResolvedValueOnce(mockPlaybackMovie);

    const { result } = renderHook(
      () => usePlayback('cinely:item:mov_tt1375666'),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(spy).toHaveBeenCalledWith('cinely:item:mov_tt1375666', {
      season: undefined,
      episode: undefined,
    });
    expect(result.current.data?.title).toBe('Inception');
    expect(result.current.data?.selected?.protocol).toBe('hls');
    expect(result.current.data?.hasPlayableSource).toBe(true);
  });

  it('passes season and episode coordinates for TV series', async () => {
    const spy = vi.spyOn(apiClient, 'getPlayback').mockResolvedValueOnce({
      ...mockPlaybackMovie,
      mediaKind: 'series',
      seasonNumber: 2,
      episodeNumber: 4,
    });

    const { result } = renderHook(
      () => usePlayback('cinely:item:ser_tt0903747', { season: 2, episode: 4 }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(spy).toHaveBeenCalledWith('cinely:item:ser_tt0903747', {
      season: 2,
      episode: 4,
    });
    expect(result.current.data?.seasonNumber).toBe(2);
    expect(result.current.data?.episodeNumber).toBe(4);
  });

  it('does not fetch if mediaId is empty or enabled is false', () => {
    const spy = vi.spyOn(apiClient, 'getPlayback');

    const { result } = renderHook(
      () => usePlayback('', { enabled: false }),
      { wrapper }
    );

    expect(result.current.isFetching).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });
});
