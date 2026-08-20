import Fastify, { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import sensible from "@fastify/sensible";
import rateLimit from "@fastify/rate-limit";
import cookie from "@fastify/cookie";
import { config, parseAllowedOrigins } from "./config/env.js";
import { CinelyError, ProblemDetails } from "./core/types/errors.js";
import { discoveryRoutes } from "./modules/discovery/discovery.routes.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { watchlistRoutes } from "./modules/users/watchlist.routes.js";
import { progressRoutes } from "./modules/users/progress.routes.js";
import { addonRoutes } from "./modules/addons/addon.routes.js";
import { streamRoutes } from "./modules/media/stream.routes.js";
import { playbackRoutes } from "./modules/media/playback.routes.js";
import { diagnosticsRoutes } from "./modules/diagnostics/diagnostics.routes.js";
import { initDatabase, closeDatabase } from "./db/index.js";

export interface BuildAppOptions {
  enableLogging?: boolean;
  dbPath?: string;
}

/**
 * Sanitizes URL strings to prevent signed tokens, API keys, or secrets from leaking into logs.
 */
export function sanitizeLogUrl(url: string): string {
  try {
    return url.replace(/([?&](?:token|signature|key|secret|api_key|auth)=)[^&]+/gi, "$1[REDACTED]");
  } catch {
    return url;
  }
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  // Initialize Database
  await initDatabase(options.dbPath);

  const allowedOrigins = parseAllowedOrigins(config.CORS_ALLOWED_ORIGINS);

  const app = Fastify({
    logger: options.enableLogging
      ? {
          level: config.LOG_LEVEL || (config.NODE_ENV === "production" ? "info" : "debug"),
          redact: {
            paths: [
              "req.headers.authorization",
              "req.headers.cookie",
              'res.headers["set-cookie"]',
              "req.body.password",
              "req.body.token",
              "req.body.encryptedConfig",
              "req.body.masterKey",
              "*.password",
              "*.token",
              "*.encryptedConfig",
              "*.masterKey"
            ],
            censor: "[REDACTED]"
          }
        }
      : false,
    trustProxy: true
  });

  // Database cleanup on server close
  app.addHook("onClose", async () => {
    await closeDatabase();
  });

  // Core Security & Utilities Plugins
  await app.register(cookie);
  await app.register(sensible);

  await app.register(cors, {
    origin: (origin, cb) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return cb(null, true);

      // In development / test, allow localhost origins
      if (config.NODE_ENV !== "production") {
        if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
          return cb(null, true);
        }
      }

      // Check against configured allowed origins
      if (allowedOrigins.includes(origin)) {
        return cb(null, true);
      }

      cb(new Error(`Origin '${origin}' not allowed by CORS policy`), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Client-Key", "Idempotency-Key"]
  });

  await app.register(helmet, {
    contentSecurityPolicy: false, // Fastify is an API engine; Next.js serves HTML/CSP
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    noSniff: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xFrameOptions: { action: "deny" }
  });

  await app.register(rateLimit, {
    max: 200,
    timeWindow: "1 minute"
  });

  // RFC 7807 Global Error Handler
  app.setErrorHandler((error: FastifyError | CinelyError | Error, request: FastifyRequest, reply: FastifyReply) => {
    const instance = sanitizeLogUrl(request.url);
    let problem: ProblemDetails;
    let statusCode = 500;

    if (error instanceof CinelyError) {
      problem = error.toProblemDetails(instance);
      statusCode = error.status;
    } else if ("validation" in error) {
      statusCode = 400;
      problem = {
        type: "https://api.cinely.io/errors/SCHEMA_VALIDATION_ERROR",
        title: "Validation Error",
        status: 400,
        detail: (error as any).message,
        instance,
        code: "VALIDATION_FAILED",
        timestamp: new Date().toISOString()
      };
    } else {
      request.log.error(error);
      statusCode = (error as FastifyError).statusCode || 500;
      problem = {
        type: "https://api.cinely.io/errors/INTERNAL_SERVER_ERROR",
        title: "Internal Server Error",
        status: statusCode,
        detail: process.env.NODE_ENV === "production" ? "An unexpected internal server error occurred." : error.message,
        instance,
        code: "INTERNAL_ERROR",
        timestamp: new Date().toISOString()
      };
    }

    reply.raw.setHeader("content-type", "application/problem+json; charset=utf-8");
    return reply.code(statusCode).header("content-type", "application/problem+json; charset=utf-8").send(problem);
  });

  // 404 Route Handler
  app.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    const problem: ProblemDetails = {
      type: "https://api.cinely.io/errors/ROUTE_NOT_FOUND",
      title: "Not Found",
      status: 404,
      detail: `Route '${request.method} ${sanitizeLogUrl(request.url)}' does not exist.`,
      instance: sanitizeLogUrl(request.url),
      code: "ROUTE_NOT_FOUND",
      timestamp: new Date().toISOString()
    };
    reply.raw.setHeader("content-type", "application/problem+json; charset=utf-8");
    return reply.code(404).header("content-type", "application/problem+json; charset=utf-8").send(problem);
  });

  // Legacy health check (preserved for backward compatibility)
  app.get("/health", async (_request, reply) => {
    return reply.status(200).send({
      status: "healthy",
      service: "Cinely Media Engine",
      version: "0.1.0",
      timestamp: new Date().toISOString()
    });
  });

  // Diagnostics & Probes (/healthz, /readyz, /v1/diagnostics/providers)
  await app.register(diagnosticsRoutes);

  // API v1 Routes
  await app.register(discoveryRoutes, { prefix: "/v1" });
  await app.register(authRoutes, { prefix: "/v1" });
  await app.register(watchlistRoutes, { prefix: "/v1" });
  await app.register(progressRoutes, { prefix: "/v1" });
  await app.register(addonRoutes, { prefix: "/v1" });
  await app.register(streamRoutes, { prefix: "/v1" });
  await app.register(playbackRoutes, { prefix: "/v1" });

  return app;
}
