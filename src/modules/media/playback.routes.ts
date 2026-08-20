import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { config } from '../../config/env.js';
import { verifyAccessToken } from '../../core/utils/crypto.js';
import { StreamResolverService } from '../../core/stream/stream-resolver.service.js';
import { selectPlaybackSource } from '../../core/stream/playback-selector.service.js';
import { MediaRepository } from '../../db/repositories/media.repository.js';
import { NotFoundError, ValidationError } from '../../core/types/errors.js';

function extractUserIdSafely(request: FastifyRequest): string | undefined {
  const cookieToken = request.cookies?.cinely_access;
  const authHeader = request.headers.authorization;

  let token: string | undefined;
  if (cookieToken) {
    token = cookieToken;
  } else if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  }

  if (!token) return undefined;

  try {
    const profile = verifyAccessToken(token, config.CINELY_MASTER_KEY);
    return profile.id;
  } catch {
    return undefined;
  }
}

export const playbackRoutes: FastifyPluginAsync = async (fastify) => {
  const resolverService = new StreamResolverService();
  const mediaRepo = new MediaRepository();

  /**
   * GET /v1/media/:id/playback
   * 
   * Resolves and selects the optimal web-playable stream source along with
   * ranked failover alternatives and sanitized playback headers.
   * 
   * Query params:
   *  - season: optional season number (for TV series, must be >= 1)
   *  - episode: optional episode number (for TV series, must be >= 1)
   */
  fastify.get(
    '/media/:id/playback',
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = request.query as { season?: string; episode?: string };

    if (!id || typeof id !== 'string') {
      throw new ValidationError('A canonical media ID is required.');
    }

    const canonicalMediaId = decodeURIComponent(id).trim();

    // Enforce canonical ID pattern (raw IMDb/TMDB IDs rejected with 404)
    if (!canonicalMediaId.startsWith('cinely:item:')) {
      throw new NotFoundError('MediaItem', canonicalMediaId);
    }

    // Lookup media metadata
    const media = await mediaRepo.findById(canonicalMediaId);
    if (!media) {
      throw new NotFoundError('MediaItem', canonicalMediaId);
    }

    let seasonNumber = 0;
    let episodeNumber = 0;

    if (media.mediaKind === 'movie') {
      if (query.season !== undefined || query.episode !== undefined) {
        throw new ValidationError('Movies do not support season or episode coordinates.');
      }
    } else if (media.mediaKind === 'series') {
      if (query.season !== undefined) {
        const parsed = parseInt(query.season, 10);
        if (isNaN(parsed) || parsed < 1) {
          throw new ValidationError('season must be a positive integer >= 1.');
        }
        seasonNumber = parsed;
      } else {
        seasonNumber = 1;
      }

      if (query.episode !== undefined) {
        const parsed = parseInt(query.episode, 10);
        if (isNaN(parsed) || parsed < 1) {
          throw new ValidationError('episode must be a positive integer >= 1.');
        }
        episodeNumber = parsed;
      } else {
        episodeNumber = 1;
      }
    }

    const userId = extractUserIdSafely(request);

    // Resolve candidates via Phase 3A Stream Resolver
    const resolution = await resolverService.resolveStreams(canonicalMediaId, {
      seasonNumber,
      episodeNumber,
      userId,
    });

    // Select optimal web-playable source and alternatives (preserving Phase 3A ranking)
    const playbackData = selectPlaybackSource(
      resolution.streams,
      { id: media.id, mediaKind: media.mediaKind, title: media.defaultTitle },
      { seasonNumber, episodeNumber }
    );

    return reply.status(200).send({
      data: playbackData,
    });
  });
};
