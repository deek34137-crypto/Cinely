import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildStremioStreamUrl, fetchStremioStreams } from '../../src/core/addons/stremio-adapter.js';

describe('Stremio Addon Protocol Adapter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('buildStremioStreamUrl', () => {
    it('builds standard movie stream URL without configuration', () => {
      const url = buildStremioStreamUrl(
        'https://torrentio.strem.fun/manifest.json',
        'movie',
        'tt1375666'
      );
      expect(url).toBe('https://torrentio.strem.fun/stream/movie/tt1375666.json');
    });

    it('builds standard series stream URL with season and episode coordinates', () => {
      const url = buildStremioStreamUrl(
        'https://comet.elfhosted.com/manifest.json',
        'series',
        'tt0903747:2:4'
      );
      expect(url).toBe('https://comet.elfhosted.com/stream/series/tt0903747%3A2%3A4.json');
    });

    it('formats key-value configuration segment correctly', () => {
      const url = buildStremioStreamUrl(
        'https://torrentio.strem.fun/manifest.json',
        'movie',
        'tt1375666',
        { providers: 'yts,eztv', quality: '1080p' }
      );
      expect(url).toBe('https://torrentio.strem.fun/providers=yts%2Ceztv|quality=1080p/stream/movie/tt1375666.json');
    });

    it('handles base URLs without trailing /manifest.json', () => {
      const url = buildStremioStreamUrl(
        'https://mediafusion.elfhosted.com/',
        'movie',
        'tt1375666'
      );
      expect(url).toBe('https://mediafusion.elfhosted.com/stream/movie/tt1375666.json');
    });
  });

  describe('fetchStremioStreams', () => {
    it('returns stream list on successful HTTP 200 response', async () => {
      const mockStreams = [
        { name: 'Torrentio\n1080p', title: 'Inception 1080p', infoHash: 'abc123' },
      ];

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ streams: mockStreams }),
      } as Response);

      const items = await fetchStremioStreams(
        'https://torrentio.strem.fun/manifest.json',
        'movie',
        'tt1375666'
      );

      expect(items).toHaveLength(1);
      expect(items[0].infoHash).toBe('abc123');
    });

    it('returns empty array on HTTP error status (e.g. 500 / 404)', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      const items = await fetchStremioStreams(
        'https://broken-addon.example/manifest.json',
        'movie',
        'tt1375666'
      );

      expect(items).toEqual([]);
    });

    it('returns empty array when addon returns invalid non-JSON or missing streams array', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error: 'Invalid ID' }),
      } as Response);

      const items = await fetchStremioStreams(
        'https://torrentio.strem.fun/manifest.json',
        'movie',
        'tt1375666'
      );

      expect(items).toEqual([]);
    });

    it('returns empty array gracefully on network rejection or abort', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network connection timeout'));

      const items = await fetchStremioStreams(
        'https://offline-addon.example/manifest.json',
        'movie',
        'tt1375666'
      );

      expect(items).toEqual([]);
    });
  });
});
