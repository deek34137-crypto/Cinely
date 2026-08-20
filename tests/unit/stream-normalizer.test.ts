import { describe, it, expect } from 'vitest';
import {
  parseSizeBytes,
  parseSeeders,
  extractResolution,
  extractCodec,
  extractAudio,
  classifyProtocolAndPlayability,
  normalizeStremioStream,
} from '../../src/core/normalizer/stream-normalizer.js';

describe('Stream Normalizer', () => {
  describe('parseSizeBytes', () => {
    it('parses GB and GiB correctly', () => {
      expect(parseSizeBytes('Inception 1080p 2.4 GB YTS')).toBe(2576980378);
      expect(parseSizeBytes('Movie 1.5 GiB')).toBe(1610612736);
    });

    it('parses MB and MiB correctly', () => {
      expect(parseSizeBytes('Episode 850 MB')).toBe(891289600);
      expect(parseSizeBytes('Clip 500 MiB')).toBe(524288000);
    });

    it('returns undefined when no file size pattern is present', () => {
      expect(parseSizeBytes('Inception 1080p BluRay')).toBeUndefined();
    });
  });

  describe('parseSeeders', () => {
    it('parses seeders with unicode emoji', () => {
      expect(parseSeeders('Torrentio\n💾 2.4 GB 👤 140 ⚙️ YTS')).toBe(140);
    });

    it('parses seeders with seeds: prefix', () => {
      expect(parseSeeders('1080p seeds: 45 peers: 10')).toBe(45);
      expect(parseSeeders('720p seeders: 12')).toBe(12);
    });

    it('returns undefined when no seeders present', () => {
      expect(parseSeeders('Direct HTTP stream')).toBeUndefined();
    });
  });

  describe('extractResolution', () => {
    it('detects 4K / 2160p', () => {
      expect(extractResolution('Movie 2160p UHD HDR')).toEqual({ quality: '4K', resolution: '2160p' });
      expect(extractResolution('Movie 4k HEVC')).toEqual({ quality: '4K', resolution: '2160p' });
    });

    it('detects 1080p / FHD', () => {
      expect(extractResolution('Movie 1080p BluRay')).toEqual({ quality: '1080p', resolution: '1080p' });
      expect(extractResolution('Show FHD x264')).toEqual({ quality: '1080p', resolution: '1080p' });
    });

    it('detects 720p and 480p', () => {
      expect(extractResolution('Movie 720p HD')).toEqual({ quality: '720p', resolution: '720p' });
      expect(extractResolution('Movie 480p SD')).toEqual({ quality: '480p', resolution: '480p' });
    });

    it('returns unknown for unclassified resolution', () => {
      expect(extractResolution('Movie CamRip')).toEqual({ quality: 'unknown', resolution: undefined });
    });
  });

  describe('classifyProtocolAndPlayability', () => {
    it('classifies HLS (.m3u8) as web-playable', () => {
      const res = classifyProtocolAndPlayability({
        url: 'https://cdn.example.com/live/master.m3u8',
      });
      expect(res.protocol).toBe('hls');
      expect(res.isWebPlayable).toBe(true);
    });

    it('classifies DASH (.mpd) as web-playable', () => {
      const res = classifyProtocolAndPlayability({
        url: 'https://cdn.example.com/dash/manifest.mpd',
      });
      expect(res.protocol).toBe('dash');
      expect(res.isWebPlayable).toBe(true);
    });

    it('classifies direct MP4 as web-playable', () => {
      const res = classifyProtocolAndPlayability({
        url: 'https://debrid.example.com/stream/file.mp4',
      });
      expect(res.protocol).toBe('http');
      expect(res.isWebPlayable).toBe(true);
    });

    it('classifies raw torrent (infoHash) as NOT web-playable', () => {
      const res = classifyProtocolAndPlayability({
        infoHash: '4a604c7b8d4e9c7081bc13e09849206b02657e49',
      });
      expect(res.protocol).toBe('torrent');
      expect(res.isWebPlayable).toBe(false);
    });

    it('classifies streams with notWebReady: true as NOT web-playable', () => {
      const res = classifyProtocolAndPlayability({
        url: 'https://debrid.example.com/stream/file.mkv',
        behaviorHints: { notWebReady: true },
      });
      expect(res.isWebPlayable).toBe(false);
    });
  });

  describe('normalizeStremioStream', () => {
    it('normalizes full stream item with deterministic ID', () => {
      const candidate = normalizeStremioStream(
        {
          name: 'Torrentio\n1080p',
          title: 'Inception.2010.1080p.BluRay.x265.5.1\n💾 2.4 GB 👤 140',
          url: 'https://debrid.example.com/stream/123.mp4',
        },
        'torrentio',
        'Torrentio',
        1
      );

      expect(candidate.id).toMatch(/^cinely:str:torrentio:[a-f0-9]{16}$/);
      expect(candidate.providerId).toBe('torrentio');
      expect(candidate.providerName).toBe('Torrentio');
      expect(candidate.quality).toBe('1080p');
      expect(candidate.codec).toBe('HEVC');
      expect(candidate.audio).toContain('5.1');
      expect(candidate.sizeBytes).toBe(2576980378);
      expect(candidate.seeders).toBe(140);
      expect(candidate.isWebPlayable).toBe(true);
      expect(candidate.protocol).toBe('http');
    });
  });
});
