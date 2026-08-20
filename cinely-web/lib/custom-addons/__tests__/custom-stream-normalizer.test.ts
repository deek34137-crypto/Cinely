import { describe, it, expect } from 'vitest';
import { normalizeCustomAddonStreams } from '../custom-stream-normalizer';
import { CustomAddonRecord, PlaybackSource } from '../../types';
import { RawStremioStreamItem } from '../browser-stremio-adapter';


const mockAddon: CustomAddonRecord = {
  id: 'custom_abc12345',
  name: 'My Addon',
  manifestUrl: 'https://addon.example.com/manifest.json',
  manifest: {
    id: 'com.example.myaddon',
    name: 'My Addon',
    version: '1.2.0',
    resources: ['stream'],
    types: ['movie'],
    catalogs: [],
  },
  enabled: true,
  priorityOrder: 100,
  installedAt: Date.now(),
};

describe('normalizeCustomAddonStreams', () => {
  it('classifies .m3u8 URL as HLS and isWebPlayable: true', () => {
    const raw: RawStremioStreamItem[] = [
      { url: 'https://cdn.example.com/video/master.m3u8', title: '1080p HLS' },
    ];
    const result = normalizeCustomAddonStreams(raw, mockAddon, 'cinely:item:mov_tt1');
    expect(result).toHaveLength(1);
    expect(result[0].protocol).toBe('hls');
    expect(result[0].isWebPlayable).toBe(true);
  });

  it('classifies .mpd URL as DASH and isWebPlayable: true', () => {
    const raw: RawStremioStreamItem[] = [
      { url: 'https://cdn.example.com/video/manifest.mpd', title: '720p DASH' },
    ];
    const result = normalizeCustomAddonStreams(raw, mockAddon, 'cinely:item:mov_tt1');
    expect(result[0].protocol).toBe('dash');
    expect(result[0].isWebPlayable).toBe(true);
  });

  it('classifies .mp4 URL as http and isWebPlayable: true', () => {
    const raw: RawStremioStreamItem[] = [
      { url: 'https://cdn.example.com/video/file.mp4', title: '480p MP4' },
    ];
    const result = normalizeCustomAddonStreams(raw, mockAddon, 'cinely:item:mov_tt1');
    expect(result[0].protocol).toBe('http');
    expect(result[0].isWebPlayable).toBe(true);
  });

  it('classifies infoHash-only as torrent and isWebPlayable: false', () => {
    const raw: RawStremioStreamItem[] = [
      { infoHash: 'abc123def456', title: 'Torrent stream' },
    ];
    const result = normalizeCustomAddonStreams(raw, mockAddon, 'cinely:item:mov_tt1');
    expect(result[0].protocol).toBe('torrent');
    expect(result[0].isWebPlayable).toBe(false);
  });

  it('marks notWebReady streams as isWebPlayable: false even with an HLS URL', () => {
    const raw: RawStremioStreamItem[] = [
      {
        url: 'https://cdn.example.com/video/master.m3u8',
        title: 'Not web ready',
        behaviorHints: { notWebReady: true },
      },
    ];
    const result = normalizeCustomAddonStreams(raw, mockAddon, 'cinely:item:mov_tt1');
    expect(result[0].isWebPlayable).toBe(false);
  });

  it('skips items with no url and no infoHash', () => {
    const raw: RawStremioStreamItem[] = [{ title: 'No URL' }];
    const result = normalizeCustomAddonStreams(raw, mockAddon, 'cinely:item:mov_tt1');
    expect(result).toHaveLength(0);
  });

  it('extracts resolution from title and sets a quality score', () => {
    const raw: RawStremioStreamItem[] = [
      { url: 'https://cdn.example.com/v.m3u8', title: 'Stream 1080p H.265' },
    ];
    const result = normalizeCustomAddonStreams(raw, mockAddon, 'cinely:item:mov_tt1');
    expect(result[0].resolution).toBe('1080p');
    expect(result[0].quality).toBe('1080p');
    expect(result[0].score).toBeGreaterThan(0);
  });

  it('extracts 4k as 2160p', () => {
    const raw: RawStremioStreamItem[] = [
      { url: 'https://cdn.example.com/v.m3u8', title: '4K HDR stream' },
    ];
    const result = normalizeCustomAddonStreams(raw, mockAddon, 'cinely:item:mov_tt1');
    expect(result[0].resolution).toBe('2160p');
  });

  it('sanitizes injected headers and strips non-allowlisted keys', () => {
    const raw: RawStremioStreamItem[] = [
      {
        url: 'https://cdn.example.com/v.m3u8',
        title: 'Stream',
        behaviorHints: {
          proxyHeaders: {
            request: {
              authorization: 'Bearer token',
              referer: 'https://safe.example.com',
              'x-api-key': 'secret',
            },
          },
        },
      },
    ];
    const result = normalizeCustomAddonStreams(raw, mockAddon, 'cinely:item:mov_tt1');
    expect(result[0].headers).not.toHaveProperty('authorization');
    expect(result[0].headers).not.toHaveProperty('x-api-key');
    expect(result[0].headers?.referer).toBe('https://safe.example.com');
  });

  it('sets providerId and providerName from the addon record', () => {
    const raw: RawStremioStreamItem[] = [
      { url: 'https://cdn.example.com/v.m3u8', title: 'Stream' },
    ];
    const result = normalizeCustomAddonStreams(raw, mockAddon, 'cinely:item:mov_tt1');
    expect(result[0].providerId).toBe(mockAddon.id);
    expect(result[0].providerName).toBe(mockAddon.manifest.name);
  });

  it('ranks 2160p higher than 1080p (higher score)', () => {
    const raw: RawStremioStreamItem[] = [
      { url: 'https://cdn.example.com/a.m3u8', title: '1080p stream' },
      { url: 'https://cdn.example.com/b.m3u8', title: '4K stream' },
    ];
    const result = normalizeCustomAddonStreams(raw, mockAddon, 'cinely:item:mov_tt1');
    const p1080 = result.find((s: PlaybackSource) => s.resolution === '1080p')!;
    const p2160 = result.find((s: PlaybackSource) => s.resolution === '2160p')!;
    expect(p2160.score).toBeGreaterThan(p1080.score);
  });

  it('handles multiple streams correctly', () => {
    const raw: RawStremioStreamItem[] = [
      { url: 'https://cdn.example.com/a.m3u8', title: 'Stream A 1080p' },
      { url: 'https://cdn.example.com/b.mp4', title: 'Stream B 720p' },
      { infoHash: 'abc', title: 'Torrent stream' },
    ];
    const result = normalizeCustomAddonStreams(raw, mockAddon, 'cinely:item:mov_tt1');
    expect(result).toHaveLength(3);
    expect(result.filter((s: PlaybackSource) => s.isWebPlayable)).toHaveLength(2);
    expect(result.filter((s: PlaybackSource) => !s.isWebPlayable)).toHaveLength(1);
  });

});
