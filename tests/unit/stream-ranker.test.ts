import { describe, it, expect } from 'vitest';
import { calculateStreamScore, rankStreams } from '../../src/core/stream/stream-ranker.js';
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
    score: overrides.score ?? 0,
    ...overrides,
  };
}

describe('Stream Ranker', () => {
  it('ranks web-playable streams strictly above non-playable torrents regardless of priority', () => {
    // Torrentio priority 1, 4K non-playable torrent
    const torrentioTorrent = createCandidate({
      id: 'cinely:str:torrentio:1',
      providerId: 'torrentio',
      addonPriority: 1,
      quality: '4K',
      isWebPlayable: false,
      protocol: 'torrent',
    });

    // Comet priority 3, 1080p web-playable HLS stream
    const cometHls = createCandidate({
      id: 'cinely:str:comet:1',
      providerId: 'comet',
      addonPriority: 3,
      quality: '1080p',
      isWebPlayable: true,
      protocol: 'hls',
    });

    const ranked = rankStreams([torrentioTorrent, cometHls]);

    expect(ranked[0].id).toBe(cometHls.id);
    expect(ranked[0].isWebPlayable).toBe(true);
    expect(ranked[1].id).toBe(torrentioTorrent.id);
  });

  it('ranks higher provider priority above lower provider priority within the same playability tier', () => {
    const provider1 = createCandidate({
      id: 'cinely:str:p1:1',
      addonPriority: 1,
      quality: '1080p',
      isWebPlayable: true,
    });

    const provider2 = createCandidate({
      id: 'cinely:str:p2:1',
      addonPriority: 2,
      quality: '1080p',
      isWebPlayable: true,
    });

    const ranked = rankStreams([provider2, provider1]);
    expect(ranked[0].id).toBe(provider1.id);
  });

  it('ranks 4K above 1080p when provider priority is equal', () => {
    const stream1080p = createCandidate({
      id: 'cinely:str:p1:1080',
      addonPriority: 1,
      quality: '1080p',
      isWebPlayable: true,
    });

    const stream4K = createCandidate({
      id: 'cinely:str:p1:4k',
      addonPriority: 1,
      quality: '4K',
      isWebPlayable: true,
    });

    const ranked = rankStreams([stream1080p, stream4K]);
    expect(ranked[0].id).toBe(stream4K.id);
  });

  it('breaks ties deterministically with candidate ID', () => {
    const streamA = createCandidate({
      id: 'cinely:str:p1:aaa',
      addonPriority: 1,
      quality: '1080p',
    });

    const streamB = createCandidate({
      id: 'cinely:str:p1:bbb',
      addonPriority: 1,
      quality: '1080p',
    });

    const ranked1 = rankStreams([streamB, streamA]);
    const ranked2 = rankStreams([streamA, streamB]);

    expect(ranked1.map((s) => s.id)).toEqual(ranked2.map((s) => s.id));
    expect(ranked1[0].id).toBe('cinely:str:p1:aaa');
  });
});
