import { FastifyPluginAsync, FastifyRequest } from "fastify";
import { config } from "../../config/env.js";
import { NotFoundError, UnauthorizedError, ValidationError } from "../../core/types/errors.js";
import { verifyAccessToken } from "../../core/utils/crypto.js";
import { MediaRepository } from "../../db/repositories/media.repository.js";
import { WatchlistRepository } from "../../db/repositories/watchlist.repository.js";
import { UserProfile } from "../../core/types/auth.js";

function authenticateUser(request: FastifyRequest): UserProfile {
  const cookieToken = request.cookies?.cinely_access;
  const authHeader = request.headers.authorization;

  let token: string | undefined;
  if (cookieToken) {
    token = cookieToken;
  } else if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7).trim();
  }

  if (!token) {
    throw new UnauthorizedError("Authentication required.");
  }

  return verifyAccessToken(token, config.CINELY_MASTER_KEY);
}

export const watchlistRoutes: FastifyPluginAsync = async (fastify) => {
  const watchlistRepo = new WatchlistRepository();
  const mediaRepo = new MediaRepository();

  /**
   * GET /v1/users/me/watchlist
   * Retrieves the authenticated user's watchlist, newest first.
   */
  fastify.get("/users/me/watchlist", async (request, reply) => {
    const user = authenticateUser(request);
    const items = await watchlistRepo.getWatchlist(user.id);

    return reply.status(200).send({
      data: {
        items,
        total: items.length
      }
    });
  });

  /**
   * POST /v1/users/me/watchlist/:id
   * Adds a canonical media item to the user's watchlist. Idempotent.
   */
  fastify.post("/users/me/watchlist/:id", async (request, reply) => {
    const user = authenticateUser(request);
    const { id } = request.params as { id: string };

    if (!id || typeof id !== "string") {
      throw new ValidationError("A canonical media ID is required.");
    }

    const canonicalId = decodeURIComponent(id).trim();

    // Invariant: Accepts ONLY canonical Cinely media identifiers (media_items.id)
    const mediaItem = await mediaRepo.findById(canonicalId);
    if (!mediaItem || mediaItem.id !== canonicalId) {
      throw new NotFoundError("Media item", canonicalId);
    }

    const result = await watchlistRepo.addToWatchlist(user.id, canonicalId);

    const statusCode = result.alreadyExisted ? 200 : 201;
    return reply.status(statusCode).send({
      data: {
        mediaId: canonicalId,
        inWatchlist: true,
        addedAt: result.addedAt
      }
    });
  });

  /**
   * DELETE /v1/users/me/watchlist/:id
   * Removes a canonical media item from the user's watchlist. Idempotent.
   */
  fastify.delete("/users/me/watchlist/:id", async (request, reply) => {
    const user = authenticateUser(request);
    const { id } = request.params as { id: string };

    if (!id || typeof id !== "string") {
      throw new ValidationError("A canonical media ID is required.");
    }

    const canonicalId = decodeURIComponent(id).trim();

    await watchlistRepo.removeFromWatchlist(user.id, canonicalId);

    return reply.status(200).send({
      data: {
        mediaId: canonicalId,
        inWatchlist: false
      }
    });
  });
};
