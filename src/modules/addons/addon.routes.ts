import { FastifyPluginAsync, FastifyRequest } from "fastify";
import { config } from "../../config/env.js";
import { UnauthorizedError, ValidationError } from "../../core/types/errors.js";
import { verifyAccessToken } from "../../core/utils/crypto.js";
import { AddonRepository } from "../../db/repositories/addon.repository.js";
import { UserProfile } from "../../core/types/auth.js";
import { UpdateUserAddonPayload } from "../../core/types/addon.js";

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

export const addonRoutes: FastifyPluginAsync = async (fastify) => {
  const addonRepo = new AddonRepository();

  /**
   * GET /v1/addons/catalog
   * Public endpoint returning server-approved Stremio addons catalog.
   */
  fastify.get("/addons/catalog", async (_request, reply) => {
    const items = await addonRepo.getCatalog();
    return reply.status(200).send({
      data: {
        items,
        total: items.length
      }
    });
  });

  /**
   * GET /v1/users/me/addons
   * Retrieves the authenticated user's addon configurations.
   */
  fastify.get("/users/me/addons", async (request, reply) => {
    const user = authenticateUser(request);
    const items = await addonRepo.getUserAddons(user.id);

    return reply.status(200).send({
      data: {
        items,
        total: items.length
      }
    });
  });

  /**
   * POST /v1/users/me/addons/:id/enable
   * Enables an addon for the authenticated user. Idempotent.
   */
  fastify.post("/users/me/addons/:id/enable", async (request, reply) => {
    const user = authenticateUser(request);
    const { id } = request.params as { id: string };

    if (!id || typeof id !== "string") {
      throw new ValidationError("An addon ID is required.");
    }

    const addonId = decodeURIComponent(id).trim();
    const result = await addonRepo.enableUserAddon(user.id, addonId);

    return reply.status(200).send({
      data: {
        addonId: result.addonId,
        enabled: result.enabled
      }
    });
  });

  /**
   * POST /v1/users/me/addons/:id/disable
   * Disables an addon for the authenticated user. Idempotent.
   */
  fastify.post("/users/me/addons/:id/disable", async (request, reply) => {
    const user = authenticateUser(request);
    const { id } = request.params as { id: string };

    if (!id || typeof id !== "string") {
      throw new ValidationError("An addon ID is required.");
    }

    const addonId = decodeURIComponent(id).trim();
    const result = await addonRepo.disableUserAddon(user.id, addonId);

    return reply.status(200).send({
      data: {
        addonId: result.addonId,
        enabled: result.enabled
      }
    });
  });

  /**
   * DELETE /v1/users/me/addons/:id
   * Disables/removes an addon for the authenticated user. Idempotent.
   */
  fastify.delete("/users/me/addons/:id", async (request, reply) => {
    const user = authenticateUser(request);
    const { id } = request.params as { id: string };

    if (!id || typeof id !== "string") {
      throw new ValidationError("An addon ID is required.");
    }

    const addonId = decodeURIComponent(id).trim();
    const result = await addonRepo.disableUserAddon(user.id, addonId);

    return reply.status(200).send({
      data: {
        addonId: result.addonId,
        enabled: result.enabled
      }
    });
  });

  /**
   * PUT /v1/users/me/addons/:id
   * Updates configuration or priority order for an addon.
   */
  fastify.put("/users/me/addons/:id", async (request, reply) => {
    const user = authenticateUser(request);
    const { id } = request.params as { id: string };
    const body = request.body as UpdateUserAddonPayload | undefined;

    if (!id || typeof id !== "string") {
      throw new ValidationError("An addon ID is required.");
    }

    if (!body || typeof body !== "object") {
      throw new ValidationError("A valid request body is required.");
    }

    if (body.priorityOrder !== undefined && (typeof body.priorityOrder !== "number" || body.priorityOrder < 0)) {
      throw new ValidationError("priorityOrder must be a non-negative number.");
    }

    if (body.configuration !== undefined && (typeof body.configuration !== "object" || body.configuration === null)) {
      throw new ValidationError("configuration must be a valid JSON object.");
    }

    const addonId = decodeURIComponent(id).trim();
    const result = await addonRepo.updateUserAddon(user.id, addonId, body);

    return reply.status(200).send({
      data: result
    });
  });
};
