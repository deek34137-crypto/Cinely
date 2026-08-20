import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { config } from '../../config/env.js';
import { verifyAccessToken } from '../../core/utils/crypto.js';
import { StreamResolverService } from '../../core/stream/stream-resolver.service.js';
import { ValidationError } from '../../core/types/errors.js';

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

export const streamRoutes: FastifyPluginAsync = async (fastify) => {
  const resolverService = new StreamResolverService();

  /**
   * GET /v1/media/:id/streams
   * 
   * Resolves, normalizes, and ranks stream candidates for a canonical media item.
   * Query params:
   *  - season: optional season number (for TV series)
   *  - episode: optional episode number (for TV series)
   */
  fastify.get(
    '/media/:id/streams',
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

    let seasonNumber: number | undefined;
    let episodeNumber: number | undefined;

    if (query.season !== undefined) {
      const parsed = parseInt(query.season, 10);
      if (isNaN(parsed) || parsed < 0) {
        throw new ValidationError('season must be a non-negative integer.');
      }
      seasonNumber = parsed;
    }

    if (query.episode !== undefined) {
      const parsed = parseInt(query.episode, 10);
      if (isNaN(parsed) || parsed < 0) {
        throw new ValidationError('episode must be a non-negative integer.');
      }
      episodeNumber = parsed;
    }

    const userId = extractUserIdSafely(request);

    const result = await resolverService.resolveStreams(canonicalMediaId, {
      seasonNumber,
      episodeNumber,
      userId,
    });

    return reply.status(200).send({
      data: result,
    });
  });
};
