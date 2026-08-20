import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useCustomAddonStreams } from '../useCustomAddonStreams';
import { NormalizedMediaDetail } from '../../lib/types';
import * as addonStore from '../../lib/custom-addons/custom-addon-store';
import * as browserAdapter from '../../lib/custom-addons/browser-stremio-adapter';

const mockAddonRecord = {
  id: 'custom_abc12345',
  name: 'Test Addon',
  manifestUrl: 'https://addon.example.com/manifest.json',
  manifest: {
    id: 'com.example.testaddon',
    name: 'Test Addon',
    version: '1.0.0',
    resources: ['stream'],
    types: ['movie'],
    catalogs: [],
  },
  enabled: true,
  priorityOrder: 100,
  installedAt: Date.now(),
};

const mockMediaDetail: NormalizedMediaDetail = {
  id: 'cinely:item:mov_tt1375666',
  mediaKind: 'movie',
  defaultTitle: 'Inception',
  originalTitle: 'Inception',
  overview: 'A mind-bending thriller',
  releaseDate: '2010-07-16',
  releaseYear: 2010,
  genres: ['Sci-Fi', 'Thriller'],
  artwork: {},
  externalIds: { imdbId: 'tt1375666' },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  directors: [],
  writers: [],
  cast: [],
};

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
};

describe('useCustomAddonStreams', () => {
  beforeEach(() => {
    vi.spyOn(addonStore.CustomAddonStore, 'getEnabledSorted').mockReturnValue([mockAddonRecord]);
    vi.spyOn(addonStore.CustomAddonStore, 'setTestStatus').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns sources from a successful addon fetch', async () => {
    vi.spyOn(browserAdapter, 'fetchCustomAddonStreams').mockResolvedValueOnce([
      { url: 'https://cdn.example.com/master.m3u8', title: '1080p HLS' },
    ]);

    const { result } = renderHook(
      () => useCustomAddonStreams(mockMediaDetail),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.sources.length).toBeGreaterThan(0);
    expect(result.current.errors).toHaveLength(0);
  });

  it('returns no sources and records CORS error when one addon fails', async () => {
    const { CustomAddonFetchError } = await import('../../lib/custom-addons/browser-stremio-adapter');
    vi.spyOn(browserAdapter, 'fetchCustomAddonStreams').mockRejectedValueOnce(
      new CustomAddonFetchError('CORS_BLOCKED', 'CORS blocked', mockAddonRecord.id, mockAddonRecord.name)
    );

    const { result } = renderHook(
      () => useCustomAddonStreams(mockMediaDetail),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.sources).toHaveLength(0);
    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0].kind).toBe('CORS_BLOCKED');
  });

  it('returns empty state when mediaDetail has no imdbId', () => {
    vi.spyOn(browserAdapter, 'fetchCustomAddonStreams');

    const noIdDetail: NormalizedMediaDetail = {
      ...mockMediaDetail,
      externalIds: {},
    };

    const { result } = renderHook(
      () => useCustomAddonStreams(noIdDetail),
      { wrapper }
    );

    expect(result.current.sources).toHaveLength(0);
    expect(result.current.isLoading).toBe(false);
    expect(browserAdapter.fetchCustomAddonStreams).not.toHaveBeenCalled();
  });

  it('returns empty state when no custom addons are enabled', () => {
    vi.spyOn(addonStore.CustomAddonStore, 'getEnabledSorted').mockReturnValue([]);
    vi.spyOn(browserAdapter, 'fetchCustomAddonStreams');

    const { result } = renderHook(
      () => useCustomAddonStreams(mockMediaDetail),
      { wrapper }
    );

    expect(result.current.sources).toHaveLength(0);
    expect(result.current.isLoading).toBe(false);
    expect(browserAdapter.fetchCustomAddonStreams).not.toHaveBeenCalled();
  });

  it('returns empty state when enabled is false', () => {
    const { result } = renderHook(
      () => useCustomAddonStreams(mockMediaDetail, { enabled: false }),
      { wrapper }
    );
    expect(result.current.sources).toHaveLength(0);
    expect(result.current.isLoading).toBe(false);
  });

  it('resolves series stremio ID with season:episode suffix', async () => {
    const fetchSpy = vi.spyOn(browserAdapter, 'fetchCustomAddonStreams').mockResolvedValueOnce([]);

    const seriesDetail: NormalizedMediaDetail = {
      ...mockMediaDetail,
      mediaKind: 'series',
      externalIds: { imdbId: 'tt0903747' },
    };

    const { result } = renderHook(
      () => useCustomAddonStreams(seriesDetail, { season: 1, episode: 3 }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(fetchSpy).toHaveBeenCalledWith(
      mockAddonRecord,
      'series',
      'tt0903747:1:3'
    );
  });

  it('isolates errors — a second healthy addon still returns sources', async () => {
    const healthyAddon = { ...mockAddonRecord, id: 'custom_healthy', priorityOrder: 200 };
    vi.spyOn(addonStore.CustomAddonStore, 'getEnabledSorted').mockReturnValue([
      mockAddonRecord,
      healthyAddon,
    ]);

    const { CustomAddonFetchError } = await import('../../lib/custom-addons/browser-stremio-adapter');
    vi.spyOn(browserAdapter, 'fetchCustomAddonStreams')
      .mockRejectedValueOnce(
        new CustomAddonFetchError('CORS_BLOCKED', 'blocked', mockAddonRecord.id, mockAddonRecord.name)
      )
      .mockResolvedValueOnce([
        { url: 'https://cdn.example.com/v.m3u8', title: 'Healthy 1080p' },
      ]);

    const { result } = renderHook(
      () => useCustomAddonStreams(mockMediaDetail),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.errors).toHaveLength(1);
    expect(result.current.sources.length).toBeGreaterThan(0);
  });
});
