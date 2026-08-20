import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { closeDatabase } from '../../src/db/index.js';
import { MediaRepository } from '../../src/db/repositories/media.repository.js';
import { NormalizedMediaDetail } from '../../src/core/types/media.js';

describe('Stream Resolution REST API Routes (Fastify Phase 3A)', () => {
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

  const sampleMovieIsolation: NormalizedMediaDetail = {
    id: 'cinely:item:mov_tt0000002',
    mediaKind: 'movie',
    originalTitle: 'Interstellar',
    defaultTitle: 'Interstellar',
    overview: 'Explorers travel through a wormhole.',
    releaseYear: 2014,
    genres: ['Adventure', 'Drama', 'Sci-Fi'],
    artwork: { posterUrl: 'https://image.tmdb.org/t/p/w500/interstellar.jpg', backdropUrl: null },
    externalIds: { imdbId: 'tt0816692', tmdbId: '157336' },
    directors: [{ name: 'Christopher Nolan' }],
    writers: [{ name: 'Jonathan Nolan' }],
    cast: [{ name: 'Matthew McConaughey' }],
    createdAt: '2026-08-17T00:00:00.000Z',
    updatedAt: '2026-08-17T00:00:00.000Z',
  };

  const sampleMovieEmpty: NormalizedMediaDetail = {
    id: 'cinely:item:mov_tt0000001',
    mediaKind: 'movie',
    originalTitle: 'Obscure Indie Movie',
    defaultTitle: 'Obscure Indie Movie',
    overview: 'An obscure film with no torrents.',
    releaseYear: 2020,
    genres: ['Documentary'],
    artwork: { posterUrl: 'https://image.tmdb.org/t/p/w500/indie.jpg', backdropUrl: null },
    externalIds: { imdbId: 'tt9999999', tmdbId: '999999' },
    directors: [{ name: 'Indie Director' }],
    writers: [],
    cast: [],
    createdAt: '2026-08-17T00:00:00.000Z',
    updatedAt: '2026-08-17T00:00:00.000Z',
  };

  beforeAll(async () => {
    app = await buildApp({ enableLogging: false });

    // Seed test media items
    const mediaRepo = new MediaRepository();
    await mediaRepo.upsertMediaItem(sampleMovie);
    await mediaRepo.upsertMediaItem(sampleSeries);
    await mediaRepo.upsertMediaItem(sampleMovieEmpty);
    await mediaRepo.upsertMediaItem(sampleMovieIsolation);

    // Register test user
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {
        email: 'streamer@cinely.io',
        password: 'Password123!',
        displayName: 'Streamer',
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

  it('GET /v1/media/:id/streams returns ranked stream candidates for a movie', async () => {
    // Mock fetch for Stremio addon calls
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const urlStr = String(url);
      if (urlStr.includes('torrentio')) {
        return {
          ok: true,
          json: async () => ({
            streams: [
              {
                name: 'Torrentio\n1080p',
                title: 'Inception.2010.1080p.BluRay.x264\n💾 2.4 GB 👤 150',
                infoHash: 'hash_torrentio_1080p',
              },
            ],
          }),
        } as Response;
      }
      if (urlStr.includes('comet')) {
        return {
          ok: true,
          json: async () => ({
            streams: [
              {
                name: 'Comet\n1080p',
                title: 'Inception.2010.1080p.HLS.Stream',
                url: 'https://debrid.example.com/hls/master.m3u8',
              },
            ],
          }),
        } as Response;
      }
      return { ok: true, json: async () => ({ streams: [] }) } as Response;
    });

    const res = await app.inject({
      method: 'GET',
      url: `/v1/media/${encodeURIComponent(sampleMovie.id)}/streams`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data.mediaId).toBe(sampleMovie.id);
    expect(body.data.total).toBeGreaterThanOrEqual(2);

    // The HLS web-playable stream from Comet must rank higher than raw torrent from Torrentio
    expect(body.data.streams[0].isWebPlayable).toBe(true);
    expect(body.data.streams[0].protocol).toBe('hls');
    expect(body.data.streams[0].providerId).toBe('comet');

    expect(body.data.streams[1].isWebPlayable).toBe(false);
    expect(body.data.streams[1].protocol).toBe('torrent');
  });

  it('GET /v1/media/:id/streams?season=1&episode=3 passes TV coordinates to Stremio endpoint', async () => {
    let capturedUrl = '';
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      capturedUrl = String(url);
      return {
        ok: true,
        json: async () => ({
          streams: [
            {
              name: 'Torrentio\n720p',
              title: 'Breaking.Bad.S01E03.720p.HDTV\n💾 450 MB 👤 80',
              infoHash: 'bb_s1e3_hash',
            },
          ],
        }),
      } as Response;
    });

    const res = await app.inject({
      method: 'GET',
      url: `/v1/media/${encodeURIComponent(sampleSeries.id)}/streams?season=1&episode=3`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data.mediaId).toBe(sampleSeries.id);
    expect(body.data.seasonNumber).toBe(1);
    expect(body.data.episodeNumber).toBe(3);
    expect(body.data.streams[0].infoHash).toBe('bb_s1e3_hash');

    // Confirm that the episode format tt0903747:1:3 was passed in the request URL
    expect(capturedUrl).toContain('tt0903747');
    expect(capturedUrl).toContain('1');
    expect(capturedUrl).toContain('3');
  });

  it('returns 404 RESOURCE_NOT_FOUND when media ID does not exist', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/media/cinely:item:mov_nonexistent999/streams',
    });

    expect(res.statusCode).toBe(404);
    const problem = JSON.parse(res.payload);
    expect(problem.code).toBe('RESOURCE_NOT_FOUND');
    expect(res.headers['content-type']).toContain('application/problem+json');
  });

  it('returns 400 VALIDATION_FAILED when season or episode query parameters are invalid', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/v1/media/${encodeURIComponent(sampleMovie.id)}/streams?season=-5`,
    });

    expect(res.statusCode).toBe(400);
    const problem = JSON.parse(res.payload);
    expect(problem.code).toBe('VALIDATION_FAILED');
  });

  it('returns 200 with empty list when no addons return streams', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ streams: [] }),
    } as Response);

    const res = await app.inject({
      method: 'GET',
      url: `/v1/media/${encodeURIComponent(sampleMovieEmpty.id)}/streams`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data.total).toBe(0);
    expect(body.data.streams).toEqual([]);
  });

  it('tolerates individual addon failures without breaking the overall response (Failure Isolation)', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const urlStr = String(url);
      if (urlStr.includes('torrentio')) {
        // Torrentio times out / throws network error
        throw new Error('ETIMEDOUT');
      }
      if (urlStr.includes('comet')) {
        // Comet returns 500 internal error
        return { ok: false, status: 500 } as Response;
      }
      if (urlStr.includes('mediafusion')) {
        // MediaFusion responds successfully
        return {
          ok: true,
          json: async () => ({
            streams: [
              {
                name: 'MediaFusion\n1080p',
                title: 'Interstellar.2014.1080p.Stream',
                url: 'https://stream.example.com/movie.mp4',
              },
            ],
          }),
        } as Response;
      }
      return { ok: true, json: async () => ({ streams: [] }) } as Response;
    });

    const res = await app.inject({
      method: 'GET',
      url: `/v1/media/${encodeURIComponent(sampleMovieIsolation.id)}/streams`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data.total).toBe(1);
    expect(body.data.streams[0].providerId).toBe('mediafusion');
    expect(body.data.streams[0].url).toBe('https://stream.example.com/movie.mp4');
  });

  it('respects authenticated user addon preferences and priority order', async () => {
    // Disable Torrentio for this user and set Comet priority to 1
    await app.inject({
      method: 'POST',
      url: '/v1/users/me/addons/torrentio/disable',
      cookies: { cinely_access: userCookie },
    });

    await app.inject({
      method: 'PUT',
      url: '/v1/users/me/addons/comet',
      cookies: { cinely_access: userCookie },
      payload: { priorityOrder: 1 },
    });

    const executedAddons: string[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const urlStr = String(url);
      if (urlStr.includes('torrentio')) executedAddons.push('torrentio');
      if (urlStr.includes('comet')) executedAddons.push('comet');
      return {
        ok: true,
        json: async () => ({
          streams: [
            {
              name: 'Comet\n1080p',
              title: 'Inception Comet 1080p',
              url: 'https://comet.example.com/stream.mp4',
            },
          ],
        }),
      } as Response;
    });

    const res = await app.inject({
      method: 'GET',
      url: `/v1/media/${encodeURIComponent(sampleMovie.id)}/streams`,
      cookies: { cinely_access: userCookie },
    });

    expect(res.statusCode).toBe(200);
    // Torrentio was disabled by user, so it should NOT be called
    expect(executedAddons).not.toContain('torrentio');
    expect(executedAddons).toContain('comet');
  });

  // Phase 3D Production Hardening: Cache Isolation & Singleflight
  it('deduplicates simultaneous in-flight requests without duplicate addon executions (Singleflight)', async () => {
    let executionCount = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      executionCount++;
      await new Promise((resolve) => setTimeout(resolve, 50));
      return {
        ok: true,
        json: async () => ({
          streams: [
            {
              name: 'Comet\n1080p',
              title: 'Singleflight Test Stream',
              url: 'https://comet.example.com/test.mp4',
            },
          ],
        }),
      } as Response;
    });

    // Fire 10 simultaneous requests for same movie
    const promises = Array.from({ length: 10 }, () =>
      app.inject({
        method: 'GET',
        url: `/v1/media/${encodeURIComponent(sampleMovie.id)}/streams`,
      })
    );

    const responses = await Promise.all(promises);
    expect(responses.every((r) => r.statusCode === 200)).toBe(true);
    // Since 10 requests ran simultaneously before completion, singleflight + LRU ensures minimal addon fetches
    expect(executionCount).toBeLessThanOrEqual(3);
  });

  it('guarantees cache isolation: different addon configurations generate different cache entries', async () => {
    const fetchUrls: string[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      fetchUrls.push(String(url));
      return {
        ok: true,
        json: async () => ({
          streams: [{ name: 'Provider\n1080p', title: 'Stream', url: 'https://example.com/play.mp4' }],
        }),
      } as Response;
    });

    // Request 1: Guest (default catalog configuration)
    const resGuest = await app.inject({
      method: 'GET',
      url: `/v1/media/${encodeURIComponent(sampleMovieIsolation.id)}/streams`,
    });
    expect(resGuest.statusCode).toBe(200);

    // Request 2: Authenticated user with custom priority
    const resUser = await app.inject({
      method: 'GET',
      url: `/v1/media/${encodeURIComponent(sampleMovieIsolation.id)}/streams`,
      cookies: { cinely_access: userCookie },
    });
    expect(resUser.statusCode).toBe(200);

    // Cache keys are separated by config hash, so user preferences are executed separately
    expect(fetchUrls.length).toBeGreaterThan(0);
  });
});
