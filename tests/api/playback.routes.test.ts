import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { closeDatabase } from '../../src/db/index.js';
import { MediaRepository } from '../../src/db/repositories/media.repository.js';
import { NormalizedMediaDetail } from '../../src/core/types/media.js';

describe('Playback Selection REST API Routes (Fastify Phase 3B)', () => {
  let app: FastifyInstance;
  let userToken: string;
  let userCookie: string;
  let userId: string;

  const sampleMovie: NormalizedMediaDetail = {
    id: 'cinely:item:mov_tt1375666',
    mediaKind: 'movie',
    originalTitle: 'Inception',
    defaultTitle: 'Inception',
    overview: 'A thief enters dreams.',
    releaseYear: 2010,
    genres: ['Action', 'Sci-Fi'],
    artwork: { posterUrl: 'https://image.tmdb.org/t/p/w500/inception.jpg', backdropUrl: null },
    externalIds: { imdbId: 'tt1375666', tmdbId: '27205' },
    directors: [{ name: 'Christopher Nolan' }],
    writers: [{ name: 'Christopher Nolan' }],
    cast: [{ name: 'Leonardo DiCaprio' }],
    createdAt: '2026-08-17T00:00:00.000Z',
    updatedAt: '2026-08-17T00:00:00.000Z',
  };

  const sampleSeries: NormalizedMediaDetail = {
    id: 'cinely:item:ser_tt0903747',
    mediaKind: 'series',
    originalTitle: 'Breaking Bad',
    defaultTitle: 'Breaking Bad',
    overview: 'A chemistry teacher produces crystal meth.',
    releaseYear: 2008,
    genres: ['Crime', 'Drama'],
    artwork: { posterUrl: 'https://image.tmdb.org/t/p/w500/bb.jpg', backdropUrl: null },
    externalIds: { imdbId: 'tt0903747', tmdbId: '1396' },
    directors: [{ name: 'Vince Gilligan' }],
    writers: [{ name: 'Vince Gilligan' }],
    cast: [{ name: 'Bryan Cranston' }],
    createdAt: '2026-08-17T00:00:00.000Z',
    updatedAt: '2026-08-17T00:00:00.000Z',
  };

  const sampleObscureMovie: NormalizedMediaDetail = {
    id: 'cinely:item:mov_tt8888888',
    mediaKind: 'movie',
    originalTitle: 'No Stream Movie',
    defaultTitle: 'No Stream Movie',
    overview: 'No web streams available.',
    releaseYear: 2021,
    genres: ['Documentary'],
    artwork: { posterUrl: null, backdropUrl: null },
    externalIds: { imdbId: 'tt8888888' },
    directors: [],
    writers: [],
    cast: [],
    createdAt: '2026-08-17T00:00:00.000Z',
    updatedAt: '2026-08-17T00:00:00.000Z',
  };

  beforeAll(async () => {
    app = await buildApp({ enableLogging: false });

    // Seed test media
    const mediaRepo = new MediaRepository();
    await mediaRepo.upsertMediaItem(sampleMovie);
    await mediaRepo.upsertMediaItem(sampleSeries);
    await mediaRepo.upsertMediaItem(sampleObscureMovie);

    // Register user
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {
        email: 'playback_tester@cinely.io',
        password: 'Password123!',
        displayName: 'PlaybackTester',
      },
    });

    const body = JSON.parse(res.payload);
    userId = body.data.user.id;
    userToken = body.data.tokens.accessToken;
    userCookie = res.cookies.find((c) => c.name === 'cinely_access')!.value;
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('GET /v1/media/:id/playback returns selected primary source and alternatives for a movie', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const urlStr = String(url);
      if (urlStr.includes('comet')) {
        return {
          ok: true,
          json: async () => ({
            streams: [
              {
                name: 'Comet\n1080p',
                title: 'Inception.2010.1080p.HLS',
                url: 'https://cdn.example.com/hls/master.m3u8',
                behaviorHints: {
                  proxyHeaders: {
                    'Referer': 'https://comet.elfhosted.com',
                    'User-Agent': 'SensitiveAgent/2.0',
                    'Authorization': 'Bearer leak_secret',
                  },
                },
              },
            ],
          }),
        } as Response;
      }
      if (urlStr.includes('mediafusion')) {
        return {
          ok: true,
          json: async () => ({
            streams: [
              {
                name: 'MediaFusion\n720p',
                title: 'Inception.2010.720p.MP4',
                url: 'https://stream.example.com/inception720.mp4',
              },
            ],
          }),
        } as Response;
      }
      if (urlStr.includes('torrentio')) {
        return {
          ok: true,
          json: async () => ({
            streams: [
              {
                name: 'Torrentio\n4K',
                title: 'Inception.2010.4K.RawTorrent',
                infoHash: 'raw_torrent_hash',
              },
            ],
          }),
        } as Response;
      }
      return { ok: true, json: async () => ({ streams: [] }) } as Response;
    });

    const res = await app.inject({
      method: 'GET',
      url: `/v1/media/${encodeURIComponent(sampleMovie.id)}/playback`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data.mediaId).toBe(sampleMovie.id);
    expect(body.data.mediaKind).toBe('movie');
    expect(body.data.title).toBe('Inception');
    expect(body.data.seasonNumber).toBe(0);
    expect(body.data.episodeNumber).toBe(0);
    expect(body.data.hasPlayableSource).toBe(true);
    expect(body.data.totalPlayable).toBe(2);

    // Selected is the top-ranked HLS web-playable stream
    expect(body.data.selected).not.toBeNull();
    expect(body.data.selected.url).toBe('https://cdn.example.com/hls/master.m3u8');
    expect(body.data.selected.protocol).toBe('hls');
    expect(body.data.selected.isWebPlayable).toBe(true);

    // Header sanitization check: Referer is preserved, User-Agent & Authorization are stripped
    expect(body.data.selected.headers).toEqual({
      'Referer': 'https://comet.elfhosted.com',
    });

    // Alternatives contains the 720p MP4 stream
    expect(body.data.alternatives).toHaveLength(1);
    expect(body.data.alternatives[0].url).toBe('https://stream.example.com/inception720.mp4');

    // Raw torrent is completely excluded from playback contract
    const allStreamIds = [body.data.selected.id, ...body.data.alternatives.map((a: any) => a.id)];
    expect(allStreamIds.every((id: string) => !id.includes('raw_torrent_hash'))).toBe(true);
  });

  it('GET /v1/media/:id/playback?season=1&episode=3 handles TV series coordinates correctly', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => ({
      ok: true,
      json: async () => ({
        streams: [
          {
            name: 'Comet\n1080p',
            title: 'Breaking.Bad.S01E03.1080p.HLS',
            url: 'https://cdn.example.com/bb/s1e3.m3u8',
          },
        ],
      }),
    } as Response));

    const res = await app.inject({
      method: 'GET',
      url: `/v1/media/${encodeURIComponent(sampleSeries.id)}/playback?season=1&episode=3`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data.mediaId).toBe(sampleSeries.id);
    expect(body.data.mediaKind).toBe('series');
    expect(body.data.title).toBe('Breaking Bad');
    expect(body.data.seasonNumber).toBe(1);
    expect(body.data.episodeNumber).toBe(3);
    expect(body.data.selected.url).toBe('https://cdn.example.com/bb/s1e3.m3u8');
  });

  it('GET /v1/media/:id/playback defaults to Season 1 Episode 1 for TV series when coordinates omitted', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => ({
      ok: true,
      json: async () => ({
        streams: [
          {
            name: 'Comet\n1080p',
            title: 'Breaking.Bad.S01E01.1080p.HLS',
            url: 'https://cdn.example.com/bb/s1e1.m3u8',
          },
        ],
      }),
    } as Response));

    const res = await app.inject({
      method: 'GET',
      url: `/v1/media/${encodeURIComponent(sampleSeries.id)}/playback`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data.seasonNumber).toBe(1);
    expect(body.data.episodeNumber).toBe(1);
  });

  it('rejects movie request with season or episode coordinates with 400 VALIDATION_FAILED', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/v1/media/${encodeURIComponent(sampleMovie.id)}/playback?season=1`,
    });

    expect(res.statusCode).toBe(400);
    const problem = JSON.parse(res.payload);
    expect(problem.code).toBe('VALIDATION_FAILED');
  });

  it('rejects invalid or negative TV coordinates with 400 VALIDATION_FAILED', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/v1/media/${encodeURIComponent(sampleSeries.id)}/playback?season=0`,
    });

    expect(res.statusCode).toBe(400);
    const problem = JSON.parse(res.payload);
    expect(problem.code).toBe('VALIDATION_FAILED');
  });

  it('rejects raw IMDb ID (non-canonical) with 404 RESOURCE_NOT_FOUND', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/media/tt1375666/playback',
    });

    expect(res.statusCode).toBe(404);
    const problem = JSON.parse(res.payload);
    expect(problem.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('returns 404 RESOURCE_NOT_FOUND for non-existent canonical media ID', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/media/cinely:item:mov_nonexistent999/playback',
    });

    expect(res.statusCode).toBe(404);
    const problem = JSON.parse(res.payload);
    expect(problem.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('returns valid 200 empty response when zero web-playable streams exist', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => ({
      ok: true,
      json: async () => ({
        streams: [
          // Only raw torrents returned
          {
            name: 'Torrentio\n1080p',
            title: 'No.Web.Stream.Raw.Torrent',
            infoHash: 'torrent_only_hash',
          },
        ],
      }),
    } as Response));

    const res = await app.inject({
      method: 'GET',
      url: `/v1/media/${encodeURIComponent(sampleObscureMovie.id)}/playback`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data.mediaId).toBe(sampleObscureMovie.id);
    expect(body.data.selected).toBeNull();
    expect(body.data.alternatives).toEqual([]);
    expect(body.data.totalPlayable).toBe(0);
    expect(body.data.hasPlayableSource).toBe(false);
  });
});
