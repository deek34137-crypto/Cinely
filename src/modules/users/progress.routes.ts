import { FastifyPluginAsync, FastifyRequest } from "fastify";
import { config } from "../../config/env.js";
import { NotFoundError, UnauthorizedError, ValidationError } from "../../core/types/errors.js";
import { verifyAccessToken } from "../../core/utils/crypto.js";
import { MediaRepository } from "../../db/repositories/media.repository.js";
import { ProgressRepository } from "../../db/repositories/progress.repository.js";
import { UserProfile } from "../../core/types/auth.js";
import { UpdateProgressPayload } from "../../core/types/progress.js";

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

export const progressRoutes: FastifyPluginAsync = async (fastify) => {
  const progressRepo = new ProgressRepository();
  const mediaRepo = new MediaRepository();

  /**
   * GET /v1/users/me/progress
   * Retrieves all playback progress records for the authenticated user, newest first.
   */
  fastify.get("/users/me/progress", async (request, reply) => {
    const user = authenticateUser(request);
    const items = await progressRepo.getUserProgress(user.id);

    return reply.status(200).send({
      data: {
        items,
        total: items.length
      }
    });
  });

  /**
   * Handler for updating playback progress (PUT and POST /v1/users/me/progress/:id)
   */
  const handleUpdateProgress = async (request: FastifyRequest, reply: any) => {
    const user = authenticateUser(request);
    const { id } = request.params as { id: string };
    const body = request.body as UpdateProgressPayload | undefined;

    if (!id || typeof id !== "string") {
      throw new ValidationError("A canonical media ID is required.");
    }

    if (!body || typeof body !== "object") {
      throw new ValidationError("A valid request body is required.");
    }

    const { positionSeconds, durationSeconds, seasonNumber = 0, episodeNumber = 0, completed } = body;

    // Validate numeric boundaries
    if (typeof positionSeconds !== "number" || isNaN(positionSeconds) || positionSeconds < 0) {
      throw new ValidationError("positionSeconds must be a non-negative number.", [
        { name: "positionSeconds", reason: "Must be >= 0." }
      ]);
    }

    if (typeof durationSeconds !== "number" || isNaN(durationSeconds) || durationSeconds <= 0) {
      throw new ValidationError("durationSeconds must be a positive number greater than zero.", [
        { name: "durationSeconds", reason: "Must be > 0." }
      ]);
    }

    if (positionSeconds > durationSeconds) {
      throw new ValidationError("positionSeconds cannot exceed durationSeconds.", [
        { name: "positionSeconds", reason: "Cannot exceed durationSeconds." }
      ]);
    }

    if (typeof seasonNumber !== "number" || seasonNumber < 0) {
      throw new ValidationError("seasonNumber must be a non-negative integer.", [
        { name: "seasonNumber", reason: "Must be >= 0." }
      ]);
    }

    if (typeof episodeNumber !== "number" || episodeNumber < 0) {
      throw new ValidationError("episodeNumber must be a non-negative integer.", [
        { name: "episodeNumber", reason: "Must be >= 0." }
      ]);
    }

    const canonicalId = decodeURIComponent(id).trim();

    // Verify canonical media exists
    const mediaItem = await mediaRepo.findById(canonicalId);
    if (!mediaItem || mediaItem.id !== canonicalId) {
      throw new NotFoundError("Media item", canonicalId);
    }

    // Media type validation
    if (mediaItem.mediaKind === "movie") {
      if (seasonNumber > 0 || episodeNumber > 0) {
        throw new ValidationError("Movie media items do not accept season or episode numbers.", [
          { name: "seasonNumber", reason: "Must be 0 for movies." },
          { name: "episodeNumber", reason: "Must be 0 for movies." }
        ]);
      }
    } else if (mediaItem.mediaKind === "series") {
      if (seasonNumber > 0 || episodeNumber > 0) {
        // Verify season and episode exist
        const seasonDetail = await mediaRepo.getSeasonDetail(canonicalId, seasonNumber);
        if (!seasonDetail) {
          throw new NotFoundError("Season", `Season ${seasonNumber} of ${canonicalId}`);
        }

        const episodeExists = seasonDetail.episodes.some(
          (ep) => ep.episodeNumber === episodeNumber
        );

        if (!episodeExists) {
          throw new NotFoundError("Episode", `S${seasonNumber}E${episodeNumber} of ${canonicalId}`);
        }
      }
    }

    const progress = await progressRepo.upsertProgress(user.id, canonicalId, {
      positionSeconds,
      durationSeconds,
      seasonNumber,
      episodeNumber,
      completed,
      clientSequence: body.clientSequence,
    });

    return reply.status(200).send({
      data: progress
    });
  };

  /**
   * PUT /v1/users/me/progress/:id
   */
  fastify.put("/users/me/progress/:id", handleUpdateProgress);

  /**
   * POST /v1/users/me/progress/:id
   */
  fastify.post("/users/me/progress/:id", handleUpdateProgress);

  /**
   * DELETE /v1/users/me/progress/:id
   * Removes playback progress for a specific episode or the entire media item.
   */
  fastify.delete("/users/me/progress/:id", async (request, reply) => {
    const user = authenticateUser(request);
    const { id } = request.params as { id: string };
    const query = request.query as { season?: string; episode?: string };

    if (!id || typeof id !== "string") {
      throw new ValidationError("A canonical media ID is required.");
    }

    const canonicalId = decodeURIComponent(id).trim();
    const seasonNumber = query.season !== undefined ? parseInt(query.season, 10) : undefined;
    const episodeNumber = query.episode !== undefined ? parseInt(query.episode, 10) : undefined;

    await progressRepo.deleteProgress(user.id, canonicalId, seasonNumber, episodeNumber);

    return reply.status(200).send({
      data: {
        mediaId: canonicalId,
        deleted: true
      }
    });
  });
};
