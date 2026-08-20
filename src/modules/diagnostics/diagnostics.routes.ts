import { FastifyPluginAsync, FastifyRequest } from "fastify";
import { getDatabase } from "../../db/index.js";
import { sharedAddonExecutionService } from "../../core/addons/addon-execution.service.js";
import { config } from "../../config/env.js";
import { UnauthorizedError } from "../../core/types/errors.js";
import { verifyAccessToken } from "../../core/utils/crypto.js";
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
    throw new UnauthorizedError("Authentication required to access operational telemetry.");
  }

  return verifyAccessToken(token, config.CINELY_MASTER_KEY);
}

/**
 * Executes a promise bounded by a strict timeout (in ms).
 */
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Operation timed out")), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

export const diagnosticsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /healthz
   * Liveness probe. Returns 200 OK immediately if the process and event loop are responsive.
   */
  fastify.get("/healthz", async (_request, reply) => {
    return reply.status(200).send({
      status: "ok",
      service: "Cinely Media Engine",
      timestamp: new Date().toISOString()
    });
  });

  /**
   * GET /readyz
   * Readiness probe with a bounded 2-second timeout.
   * Checks critical infrastructure (database connectivity).
   * Upstream streaming provider health NEVER impacts application readiness.
   * Internal database error details are logged server-side, never exposed to unauthenticated callers.
   */
  fastify.get("/readyz", async (request, reply) => {
    try {
      const db = getDatabase();
      const isDbReady = await withTimeout(db.ping(), 2000);

      if (isDbReady) {
        return reply.status(200).send({
          status: "ready",
          timestamp: new Date().toISOString()
        });
      } else {
        request.log.warn("Readiness check failed: database ping returned false");
        return reply.status(503).send({
          status: "not_ready",
          timestamp: new Date().toISOString()
        });
      }
    } catch (err) {
      request.log.error({ err }, "Readiness check failed with exception");
      return reply.status(503).send({
        status: "not_ready",
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * GET /v1/diagnostics/providers
   * Protected provider telemetry. Exposes in-memory circuit-breaker counters.
   * Requires authentication. Rate limited to 10 requests/minute.
   * Zero secret tokens, passwords, or stream URLs are exposed.
   */
  fastify.get(
    "/v1/diagnostics/providers",
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 minute"
        }
      }
    },
    async (request, reply) => {
      // Must be authenticated operator/user
      authenticateUser(request);

      const providers = sharedAddonExecutionService.getHealthReport();

      return reply.status(200).send({
        data: {
          providers,
          total: providers.length,
          timestamp: new Date().toISOString()
        }
      });
    }
  );
};
