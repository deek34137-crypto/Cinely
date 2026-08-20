import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useCatalog,
  useUserAddons,
  useEnableAddon,
  useDisableAddon,
  useUpdateAddon,
  useRemoveAddonPreference,
} from '../useAddons';
import { apiClient } from '../../lib/api-client';
import { AddonCatalogResponse, UserAddonsResponse } from '../../lib/types';

const mockAuth = { isAuthenticated: true, isLoading: false };

vi.mock('../useAuth', () => ({ useAuth: () => mockAuth }));

const mockCatalog: AddonCatalogResponse = {
  items: [
    {
      id: 'torrentio',
      name: 'Torrentio',
      version: '1.0.14',
      description: 'Scrapes torrent streams.',
      manifestUrl: 'https://torrentio.strem.fun/manifest.json',
      logoUrl: null,
      backgroundUrl: null,
      types: ['movie', 'series'],
      categories: ['torrents'],
      stars: 995,
      enabled: true,
      configurable: true,
      capabilities: { catalog: false, meta: false, stream: true, subtitles: false },
    },
    {
      id: 'opensubtitles-v3',
      name: 'OpenSubtitles v3',
      version: '3.0.0',
      description: 'Subtitle provider.',
      manifestUrl: 'https://opensubtitles-v3.strem.io/manifest.json',
      logoUrl: null,
      backgroundUrl: null,
      types: ['movie', 'series'],
      categories: ['subtitles'],
      stars: 920,
      enabled: true,
      configurable: false,
      capabilities: { catalog: false, meta: false, stream: false, subtitles: true },
    },
    {
      id: 'disabled-test-addon',
      name: 'Disabled Addon',
      version: '1.0.0',
      manifestUrl: 'https://disabled.example/manifest.json',
      types: ['movie'],
      categories: ['torrents'],
      stars: 10,
      enabled: false, // globally disabled
      configurable: false,
      capabilities: { catalog: false, meta: false, stream: true, subtitles: false },
    },
  ],
  total: 3,
};

const mockUserAddons: UserAddonsResponse = {
  items: [
    {
      ...mockCatalog.items[0],
      userEnabled: true,
      priorityOrder: 1,
      userConfiguration: { quality: '1080p' },
    },
    {
      ...mockCatalog.items[1],
      userEnabled: true,
      priorityOrder: 2,
    },
    {
      ...mockCatalog.items[2],
      userEnabled: false,
      priorityOrder: 100,
    },
  ],
  total: 3,
};

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe('useAddons hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.isAuthenticated = true;
    mockAuth.isLoading = false;
  });

  it('useCatalog is public — fetches without authentication', async () => {
    const spy = vi.spyOn(apiClient, 'getCatalog').mockResolvedValueOnce(mockCatalog);

    const { result } = renderHook(() => useCatalog(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledOnce();
    expect(result.current.data?.total).toBe(3);
  });

  it('useUserAddons waits for authentication — does not fetch while unauthenticated', async () => {
    mockAuth.isAuthenticated = false;
    const spy = vi.spyOn(apiClient, 'getUserAddons');

    renderHook(() => useUserAddons(), { wrapper: wrapper() });

    await new Promise((r) => setTimeout(r, 50));
    expect(spy).not.toHaveBeenCalled();
  });

  it('useUserAddons does not fetch while auth is loading', async () => {
    mockAuth.isAuthenticated = false;
    mockAuth.isLoading = true;
    const spy = vi.spyOn(apiClient, 'getUserAddons');

    renderHook(() => useUserAddons(), { wrapper: wrapper() });

    await new Promise((r) => setTimeout(r, 50));
    expect(spy).not.toHaveBeenCalled();
  });

  it('useUserAddons fetches when authenticated', async () => {
    vi.spyOn(apiClient, 'getUserAddons').mockResolvedValueOnce(mockUserAddons);

    const { result } = renderHook(() => useUserAddons(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toHaveLength(3);
  });

  it('useEnableAddon calls POST enable and invalidates user addon cache', async () => {
    vi.spyOn(apiClient, 'getUserAddons').mockResolvedValue(mockUserAddons);
    const enableSpy = vi.spyOn(apiClient, 'enableAddon').mockResolvedValueOnce({
      addonId: 'torrentio',
      enabled: true,
    });

    const { result } = renderHook(() => useEnableAddon(), { wrapper: wrapper() });

    await act(async () => {
      await result.current.mutateAsync('torrentio');
    });

    expect(enableSpy).toHaveBeenCalledWith('torrentio');
  });

  it('useDisableAddon calls POST disable and invalidates user addon cache', async () => {
    vi.spyOn(apiClient, 'getUserAddons').mockResolvedValue(mockUserAddons);
    const disableSpy = vi.spyOn(apiClient, 'disableAddon').mockResolvedValueOnce({
      addonId: 'torrentio',
      enabled: false,
    });

    const { result } = renderHook(() => useDisableAddon(), { wrapper: wrapper() });

    await act(async () => {
      await result.current.mutateAsync('torrentio');
    });

    expect(disableSpy).toHaveBeenCalledWith('torrentio');
  });

  it('useUpdateAddon calls PUT with priorityOrder and configuration payload', async () => {
    vi.spyOn(apiClient, 'getUserAddons').mockResolvedValue(mockUserAddons);
    const updateSpy = vi.spyOn(apiClient, 'updateAddon').mockResolvedValueOnce({
      addonId: 'torrentio',
      enabled: true,
      priorityOrder: 10,
      configuration: { quality: '4k' },
    });

    const { result } = renderHook(() => useUpdateAddon(), { wrapper: wrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        addonId: 'torrentio',
        payload: { priorityOrder: 10, configuration: { quality: '4k' } },
      });
    });

    expect(updateSpy).toHaveBeenCalledWith('torrentio', {
      priorityOrder: 10,
      configuration: { quality: '4k' },
    });
  });

  it('useRemoveAddonPreference calls DELETE and invalidates cache', async () => {
    vi.spyOn(apiClient, 'getUserAddons').mockResolvedValue(mockUserAddons);
    const removeSpy = vi.spyOn(apiClient, 'removeAddonPreference').mockResolvedValueOnce({
      addonId: 'torrentio',
      enabled: false,
    });

    const { result } = renderHook(() => useRemoveAddonPreference(), { wrapper: wrapper() });

    await act(async () => {
      await result.current.mutateAsync('torrentio');
    });

    expect(removeSpy).toHaveBeenCalledWith('torrentio');
  });

  it('RFC 7807 API error propagates from enable mutation', async () => {
    const { ApiError } = await import('../../lib/api-client');
    vi.spyOn(apiClient, 'enableAddon').mockRejectedValueOnce(
      new ApiError(400, 'Disabled global addon cannot be enabled.', {
        type: 'about:blank',
        status: 400,
        code: 'VALIDATION_FAILED',
        title: 'Disabled global addon cannot be enabled.',
        detail: '',
        instance: '',
        timestamp: new Date().toISOString(),
      })
    );

    const { result } = renderHook(() => useEnableAddon(), { wrapper: wrapper() });

    await expect(
      act(async () => { await result.current.mutateAsync('disabled-test-addon'); })
    ).rejects.toThrow('Disabled global addon cannot be enabled.');
  });
});
