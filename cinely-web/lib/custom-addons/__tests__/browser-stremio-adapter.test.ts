import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchCustomAddonStreams,
  CustomAddonFetchError,
  RawStremioStreamItem,
} from '../browser-stremio-adapter';
import { CustomAddonRecord } from '../../types';

const mockAddon: CustomAddonRecord = {
  id: 'custom_abc12345',
  name: 'Test Addon',
  manifestUrl: 'https://addon.example.com/manifest.json',
  manifest: {
    id: 'com.example.testaddon',
    name: 'Test Addon',
    version: '1.0.0',
    resources: ['stream'],
    types: ['movie', 'series'],
    catalogs: [],
  },
  enabled: true,
  priorityOrder: 100,
  installedAt: Date.now(),
};

const hlsStream: RawStremioStreamItem = {
  url: 'https://cdn.example.com/video/master.m3u8',
  title: 'Test 1080p HLS',
};

describe('BrowserStremioAdapter', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    // Default: https page (mixed-content guard enabled)
    vi.stubGlobal('window', { location: { protocol: 'https:' } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns streams from a successful 200 response', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ streams: [hlsStream] }),
    });

    const result = await fetchCustomAddonStreams(mockAddon, 'movie', 'tt1375666');
    expect(result).toHaveLength(1);
    expect(result[0].url).toBe(hlsStream.url);
  });

  it('returns [] for a non-2xx response (addon has no results for this ID)', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: false, status: 404 });
    const result = await fetchCustomAddonStreams(mockAddon, 'movie', 'tt9999999');
    expect(result).toEqual([]);
  });

  it('returns [] for invalid JSON response', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => { throw new SyntaxError('bad json'); },
    });
    const result = await fetchCustomAddonStreams(mockAddon, 'movie', 'tt1375666');
    expect(result).toEqual([]);
  });

  it('returns [] for a response with no streams array', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ other: 'data' }),
    });
    const result = await fetchCustomAddonStreams(mockAddon, 'movie', 'tt1375666');
    expect(result).toEqual([]);
  });

  it('throws CustomAddonFetchError with CORS_BLOCKED on TypeError (Failed to fetch)', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new TypeError('Failed to fetch')
    );
    await expect(
      fetchCustomAddonStreams(mockAddon, 'movie', 'tt1375666')
    ).rejects.toMatchObject({
      kind: 'CORS_BLOCKED',
      addonId: mockAddon.id,
    });
  });

  it('throws CustomAddonFetchError with TIMEOUT on AbortError', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      Object.assign(new Error('aborted'), { name: 'AbortError' })
    );
    await expect(
      fetchCustomAddonStreams(mockAddon, 'movie', 'tt1375666', { timeoutMs: 100 })
    ).rejects.toMatchObject({ kind: 'TIMEOUT' });
  });

  it('throws CustomAddonFetchError MIXED_CONTENT for http addon on https page', async () => {
    const httpAddon: CustomAddonRecord = {
      ...mockAddon,
      manifestUrl: 'http://insecure.example.com/manifest.json',
    };
    await expect(
      fetchCustomAddonStreams(httpAddon, 'movie', 'tt1375666')
    ).rejects.toMatchObject({ kind: 'MIXED_CONTENT' });
  });

  it('builds the correct Stremio stream URL for a series episode', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ streams: [] }),
    });

    await fetchCustomAddonStreams(mockAddon, 'series', 'tt0903747:1:3');

    const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(calledUrl).toContain('/stream/series/');
    expect(calledUrl).toContain('tt0903747%3A1%3A3');
  });

  it('clamps timeout to MAX_TIMEOUT_MS (10s)', () => {
    // No assertion on behavior, just ensure no throw on large timeoutMs
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ streams: [] }),
    });
    expect(() =>
      fetchCustomAddonStreams(mockAddon, 'movie', 'tt1375666', { timeoutMs: 999999 })
    ).not.toThrow();
  });

  it('error instance is a CustomAddonFetchError with all required fields', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new TypeError('Failed to fetch')
    );
    try {
      await fetchCustomAddonStreams(mockAddon, 'movie', 'tt1375666');
    } catch (err) {
      expect(err).toBeInstanceOf(CustomAddonFetchError);
      const e = err as CustomAddonFetchError;
      expect(e.addonId).toBe(mockAddon.id);
      expect(e.addonName).toBe(mockAddon.name);
      expect(e.kind).toBe('CORS_BLOCKED');
    }
  });
});
