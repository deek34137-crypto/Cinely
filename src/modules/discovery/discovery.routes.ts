import { FastifyPluginAsync } from "fastify";
import { DiscoveryService } from "./discovery.service.js";
import { ValidationError } from "../../core/types/errors.js";
import { MediaKind } from "../../core/types/media.js";

export const discoveryRoutes: FastifyPluginAsync = async (fastify) => {
  const discoveryService = new DiscoveryService();

  /**
   * GET /v1/discover
   */
  fastify.get("/discover", async (request, reply) => {
    const query = request.query as {
      kind?: string;
      genre?: string;
      limit?: string;
    };

    const kind = query.kind as MediaKind | undefined;
    const genre = query.genre;
    const limit = query.limit ? parseInt(query.limit, 10) : 10;

    const result = await discoveryService.getDiscoverSections({ kind, genre, limit });

    return reply.status(200).send({
      data: result
    });
  });

  /**
   * GET /v1/search
   */
  fastify.get("/search", async (request, reply) => {
    const query = request.query as {
      q?: string;
      kind?: string;
      limit?: string;
    };

    if (!query.q || query.q.trim().length === 0) {
      throw new ValidationError("Search query parameter 'q' is required.", [
        { name: "q", reason: "Query string cannot be empty." }
      ]);
    }

    const kind = query.kind as MediaKind | undefined;
    const limit = query.limit ? parseInt(query.limit, 10) : 20;

    const results = await discoveryService.search(query.q, kind, limit);

    return reply.status(200).send({
      data: {
        query: query.q,
        results,
        count: results.length
      }
    });
  });

  /**
   * GET /v1/media/:id
   */
  fastify.get("/media/:id", async (request, reply) => {
    const params = request.params as { id: string };
    const media = await discoveryService.getMediaDetail(params.id);

    return reply.status(200).send({
      data: media
    });
  });

  /**
   * GET /v1/media/:id/seasons/:seasonNumber
   */
  fastify.get("/media/:id/seasons/:seasonNumber", async (request, reply) => {
    const params = request.params as { id: string; seasonNumber: string };
    const seasonNum = parseInt(params.seasonNumber, 10);

    if (isNaN(seasonNum)) {
      throw new ValidationError("Parameter 'seasonNumber' must be an integer.", [
        { name: "seasonNumber", reason: "Expected a valid integer." }
      ]);
    }

    const season = await discoveryService.getSeasonDetail(params.id, seasonNum);

    return reply.status(200).send({
      data: season
    });
  });
};
