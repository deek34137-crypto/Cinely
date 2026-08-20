import { describe, it, expect } from 'vitest';
import {
  sanitizePlaybackHeaders,
  selectPlaybackSource,
  mapCandidateToPlaybackSource,
} from '../../src/core/stream/playback-selector.service.js';
import { StreamCandidate } from '../../src/core/types/stream.js';

function createCandidate(overrides: Partial<StreamCandidate>): StreamCandidate {
  return {
    id: overrides.id || 'cinely:str:test:1',
    providerId: overrides.providerId || 'test-provider',
    providerName: overrides.providerName || 'Test Provider',
    name: overrides.name || 'Stream Name',
    title: overrides.title || 'Stream Title',
    protocol: overrides.protocol || 'http',
    isWebPlayable: overrides.isWebPlayable ?? true,
    quality: overrides.quality || '1080p',
    addonPriority: overrides.addonPriority ?? 1,
    score: overrides.score ?? 100,
    ...overrides,
  };
}

describe('Playback Selector Service (Phase 3B)', () => {
  describe('sanitizePlaybackHeaders', () => {
    it('allows only client-safe playback headers (referer, origin, accept, range)', () => {
      const raw = {
        'Referer': 'https://stream.example.com',
        'Origin': 'https://cinely.app',
        'Accept': '*/*',
        'Range': 'bytes=0-',
      };
      const sanitized = sanitizePlaybackHeaders(raw);
      expect(sanitized).toEqual({
        'Referer': 'https://stream.example.com',
        'Origin': 'https://cinely.app',
        'Accept': '*/*',
        'Range': 'bytes=0-',
      });
    });

    it('strictly strips User-Agent, Authorization, Cookies, and internal credentials', () => {
      const raw = {
        'User-Agent': 'Mozilla/5.0 CustomAgent/1.0',
        'Authorization': 'Bearer secret_token_123',
        'Cookie': 'session=abc; secret=xyz',
        'Set-Cookie': 'auth=deleted',
        'X-API-Key': 'secret_key',
        'Proxy-Authorization': 'Basic dXNlcjpwYXNz',
        'Host': 'internal.stream.host',
        'Connection': 'keep-alive',
        'Referer': 'https://legit.provider.com',
      };
      const sanitized = sanitizePlaybackHeaders(raw);
      expect(sanitized).toEqual({
        'Referer': 'https://legit.provider.com',
      });
    });

    it('rejects headers with CRLF injection attempts', () => {
      const raw = {
        'Referer\r\nInjected-Header: evil': 'https://good.com',
        'Referer': 'https://good.com\r\nSet-Cookie: stolen=1',
      };
      const sanitized = sanitizePlaybackHeaders(raw);
      expect(sanitized).toBeUndefined();
    });

    it('rejects Referer or Origin pointing to loopback or private RFC 1918 / link-local addresses (SSRF defense)', () => {
      const raw = {
        'Referer': 'http://127.0.0.1:8080/admin',
        'Origin': 'http://169.254.169.254/latest/meta-data',
        'Accept': '*/*',
      };
      const sanitized = sanitizePlaybackHeaders(raw);
      expect(sanitized).toEqual({
        'Accept': '*/*',
      });
    });

    it('returns undefined if no safe headers remain or input is empty/undefined', () => {
      expect(sanitizePlaybackHeaders(undefined)).toBeUndefined();
      expect(sanitizePlaybackHeaders({})).toBeUndefined();
      expect(sanitizePlaybackHeaders({ 'User-Agent': 'bad' })).toBeUndefined();
    });
  });

  describe('selectPlaybackSource', () => {
    it('selects highest-ranked web-playable stream as selected and remaining as alternatives', () => {
      const stream1 = createCandidate({
        id: 'cinely:str:comet:1080',
        providerId: 'comet',
        url: 'https://comet.example.com/stream1.mp4',
        isWebPlayable: true,
        score: 10_500_000,
      });

      const stream2 = createCandidate({
        id: 'cinely:str:mediafusion:720',
        providerId: 'mediafusion',
        url: 'https://mf.example.com/stream2.m3u8',
        protocol: 'hls',
        isWebPlayable: true,
        score: 10_300_000,
      });

      const torrent = createCandidate({
        id: 'cinely:str:torrentio:torrent',
        providerId: 'torrentio',
        infoHash: 'abc_torrent_hash',
        url: undefined,
        isWebPlayable: false,
        score: 500_000,
      });

      const response = selectPlaybackSource(
        [stream1, stream2, torrent],
        { id: 'cinely:item:mov_1', mediaKind: 'movie', title: 'Inception' },
        { seasonNumber: 0, episodeNumber: 0 }
      );

      expect(response.mediaId).toBe('cinely:item:mov_1');
      expect(response.mediaKind).toBe('movie');
      expect(response.title).toBe('Inception');
      expect(response.selected).not.toBeNull();
      expect(response.selected?.id).toBe(stream1.id);
      expect(response.selected?.url).toBe('https://comet.example.com/stream1.mp4');
      expect(response.alternatives).toHaveLength(1);
      expect(response.alternatives[0].id).toBe(stream2.id);
      expect(response.totalPlayable).toBe(2);
      expect(response.hasPlayableSource).toBe(true);

      // Verify non-web-playable torrent is completely excluded
      const allIds = [response.selected?.id, ...response.alternatives.map((a) => a.id)];
      expect(allIds).not.toContain(torrent.id);
    });

    it('preserves Phase 3A ranking order without secondary re-sorting', () => {
      const streamA = createCandidate({
        id: 'cinely:str:a',
        url: 'https://a.com/play.m3u8',
        isWebPlayable: true,
        score: 200,
      });
      const streamB = createCandidate({
        id: 'cinely:str:b',
        url: 'https://b.com/play.m3u8',
        isWebPlayable: true,
        score: 100,
      });

      const response = selectPlaybackSource(
        [streamA, streamB],
        { id: 'cinely:item:mov_1', mediaKind: 'movie', title: 'Film' },
        { seasonNumber: 0, episodeNumber: 0 }
      );

      expect(response.selected?.id).toBe('cinely:str:a');
      expect(response.alternatives[0].id).toBe('cinely:str:b');
    });

    it('returns valid empty response when zero web-playable streams exist', () => {
      const torrentOnly = createCandidate({
        id: 'cinely:str:torrentio:raw',
        infoHash: 'deadbeef123',
        url: undefined,
        isWebPlayable: false,
      });

      const response = selectPlaybackSource(
        [torrentOnly],
        { id: 'cinely:item:mov_1', mediaKind: 'movie', title: 'Obscure Title' },
        { seasonNumber: 0, episodeNumber: 0 }
      );

      expect(response.selected).toBeNull();
      expect(response.alternatives).toEqual([]);
      expect(response.totalPlayable).toBe(0);
      expect(response.hasPlayableSource).toBe(false);
    });

    it('excludes candidate if URL is missing or empty even if flagged isWebPlayable', () => {
      const brokenCandidate = createCandidate({
        id: 'cinely:str:broken',
        url: '',
        isWebPlayable: true,
      });

      const response = selectPlaybackSource(
        [brokenCandidate],
        { id: 'cinely:item:mov_1', mediaKind: 'movie', title: 'Broken' },
        { seasonNumber: 0, episodeNumber: 0 }
      );

      expect(response.selected).toBeNull();
      expect(response.totalPlayable).toBe(0);
    });
  });
});
