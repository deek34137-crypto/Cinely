import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useMergedPlayback } from '../useMergedPlayback';
import { NormalizedMediaDetail, PlaybackResponse } from '../../lib/types';
import { apiClient } from '../../lib/api-client';
import * as customAddonStreams from '../useCustomAddonStreams';
import * as addonStore from '../../lib/custom-addons/custom-addon-store';

const serverPlayback: PlaybackResponse = {
  mediaId: 'cinely:item:mov_tt1375666',
  mediaKind: 'movie',
  title: 'Inception',
  seasonNumber: 0,
  episodeNumber: 0,
  selected: {
    id: 'server:src:1',
    providerId: 'comet',
    providerName: 'Comet',
    name: 'Comet 1080p',
    title: 'Inception.1080p.HLS',
    protocol: 'hls',
    url: 'https://cdn.example.com/server/master.m3u8',
    isWebPlayable: true,
    quality: '1080p',
    score: 3_000_000,
  },
  alternatives: [],
  totalPlayable: 1,
  hasPlayableSource: true,
};

const mockMediaDetail: NormalizedMediaDetail = {
  id: 'cinely:item:mov_tt1375666',
  mediaKind: 'movie',
  defaultTitle: 'Inception',
  originalTitle: 'Inception',
  overview: null,
  releaseYear: 2010,
  genres: [],
  artwork: {},
  externalIds: { imdbId: 'tt1375666' },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  directors: [],
  writers: [],
  cast: [],
};

const makeWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
};

describe('useMergedPlayback', () => {
  beforeEach(() => {
    vi.spyOn(apiClient, 'getPlayback').mockResolvedValue(serverPlayback);
    vi.spyOn(addonStore.CustomAddonStore, 'getById').mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns server-only playback when no custom sources', async () => {
    vi.spyOn(customAddonStreams, 'useCustomAddonStreams').mockReturnValue({
      sources: [],
      isLoading: false,
      errors: [],
    });

    const { result } = renderHook(
      () => useMergedPlayback('cinely:item:mov_tt1375666', mockMediaDetail),
      { wrapper: makeWrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.playback?.selected?.providerId).toBe('comet');
    expect(result.current.playback?.totalPlayable).toBe(1);
  });

  it('prefers server sources (priorityOrder -1) over custom sources by default', async () => {
    const customSource = {
      id: 'custom_abc12345:cinely:item:mov_tt1375666:0',
      providerId: 'custom_abc12345',
      providerName: 'My Custom Addon',
      name: 'Custom 4K',
      title: 'Custom 4K HLS',
      protocol: 'hls' as const,
      url: 'https://cdn.custom.com/4k.m3u8',
      isWebPlayable: true,
      quality: '2160p',
      score: 4_000_000,
    };

    vi.spyOn(customAddonStreams, 'useCustomAddonStreams').mockReturnValue({
      sources: [customSource],
      isLoading: false,
      errors: [],
    });

    // Custom addon has priorityOrder 100 (default); server has -1
    vi.spyOn(addonStore.CustomAddonStore, 'getById').mockReturnValue({
      id: 'custom_abc12345',
      name: 'My Custom Addon',
      manifestUrl: 'https://addon.example.com/manifest.json',
      manifest: { id: 'com.example', name: 'My Custom Addon', version: '1.0.0', resources: ['stream'], types: ['movie'], catalogs: [] },
      enabled: true,
      priorityOrder: 100,
      installedAt: Date.now(),
    });

    const { result } = renderHook(
      () => useMergedPlayback('cinely:item:mov_tt1375666', mockMediaDetail),
      { wrapper: makeWrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // Server source (priorityOrder -1) should be selected first despite lower score
    expect(result.current.playback?.selected?.providerId).toBe('comet');
    expect(result.current.playback?.totalPlayable).toBe(2);
    expect(result.current.playback?.alternatives[0].providerId).toBe('custom_abc12345');
  });

  it('custom addon CORS failure does NOT suppress server sources', async () => {
    vi.spyOn(customAddonStreams, 'useCustomAddonStreams').mockReturnValue({
      sources: [],
      isLoading: false,
      errors: [{ addonId: 'custom_abc12345', addonName: 'My Addon', kind: 'CORS_BLOCKED', message: 'blocked' }],
    });

    const { result } = renderHook(
      () => useMergedPlayback('cinely:item:mov_tt1375666', mockMediaDetail),
      { wrapper: makeWrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.playback?.hasPlayableSource).toBe(true);
    expect(result.current.playback?.selected?.providerId).toBe('comet');
    expect(result.current.customAddonErrors).toHaveLength(1);
  });

  it('torrent-only custom sources are excluded from hasPlayableSource count', async () => {
    vi.spyOn(customAddonStreams, 'useCustomAddonStreams').mockReturnValue({
      sources: [
        {
          id: 'custom_abc12345:cinely:0',
          providerId: 'custom_abc12345',
          providerName: 'Torrent Addon',
          name: 'Torrent',
          title: 'Torrent stream',
          protocol: 'torrent' as const,
          url: 'magnet:?xt=urn:btih:abc',
          isWebPlayable: false,
          quality: 'Unknown',
          score: 0,
        },
      ],
      isLoading: false,
      errors: [],
    });

    const { result } = renderHook(
      () => useMergedPlayback('cinely:item:mov_tt1375666', mockMediaDetail),
      { wrapper: makeWrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // Server source is still selected; torrent excluded from playable count
    expect(result.current.playback?.selected?.providerId).toBe('comet');
    expect(result.current.playback?.totalPlayable).toBe(1);
  });

  it('returns undefined playback while server is loading', () => {
    vi.spyOn(apiClient, 'getPlayback').mockImplementation(
      () => new Promise(() => {}) // never resolves
    );
    vi.spyOn(customAddonStreams, 'useCustomAddonStreams').mockReturnValue({
      sources: [],
      isLoading: false,
      errors: [],
    });

    const { result } = renderHook(
      () => useMergedPlayback('cinely:item:mov_tt1375666', mockMediaDetail),
      { wrapper: makeWrapper() }
    );

    expect(result.current.playback).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
  });
});
