import { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { AuthService } from "./auth.service.js";
import { TokenPair } from "../../core/types/auth.js";
import { UnauthorizedError } from "../../core/types/errors.js";

const isProd = process.env.NODE_ENV === "production";

function setAuthCookies(reply: FastifyReply, tokens: TokenPair) {
  reply.setCookie("cinely_access", tokens.accessToken, {
    path: "/",
    httpOnly: true,
    secure: isProd,
    sameSite: "strict",
    maxAge: tokens.expiresIn
  });

  reply.setCookie("cinely_refresh", tokens.refreshToken, {
    path: "/",
    httpOnly: true,
    secure: isProd,
    sameSite: "strict",
    maxAge: 30 * 24 * 60 * 60 // 30 days
  });
}

function clearAuthCookies(reply: FastifyReply) {
  reply.clearCookie("cinely_access", { path: "/", httpOnly: true, maxAge: 0, expires: new Date(0) });
  reply.clearCookie("cinely_refresh", { path: "/", httpOnly: true, maxAge: 0, expires: new Date(0) });
}

function extractAccessToken(request: FastifyRequest): string | undefined {
  const cookieToken = request.cookies?.cinely_access;
  if (cookieToken) return cookieToken;

  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }

  return undefined;
}

function extractRefreshToken(request: FastifyRequest): string | undefined {
  const cookieToken = request.cookies?.cinely_refresh;
  if (cookieToken) return cookieToken;

  const body = request.body as { refreshToken?: string } | undefined;
  return body?.refreshToken;
}

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  const authService = new AuthService();

  /**
   * POST /v1/auth/register
   */
  fastify.post("/auth/register", async (request, reply) => {
    const body = request.body as {
      email?: string;
      password?: string;
      displayName?: string;
    };

    const result = await authService.register(body || {});
    setAuthCookies(reply, result.tokens);

    return reply.status(201).send({
      data: {
        user: result.user,
        tokens: result.tokens
      }
    });
  });

  /**
   * POST /v1/auth/login
   */
  fastify.post("/auth/login", async (request, reply) => {
    const body = request.body as {
      email?: string;
      password?: string;
    };

    const result = await authService.login(body || {});
    setAuthCookies(reply, result.tokens);

    return reply.status(200).send({
      data: {
        user: result.user,
        tokens: result.tokens
      }
    });
  });

  /**
   * POST /v1/auth/refresh
   */
  fastify.post("/auth/refresh", async (request, reply) => {
    const refreshToken = extractRefreshToken(request);
    const result = await authService.refresh(refreshToken);
    setAuthCookies(reply, result.tokens);

    return reply.status(200).send({
      data: {
        user: result.user,
        tokens: result.tokens
      }
    });
  });

  /**
   * POST /v1/auth/logout
   */
  fastify.post("/auth/logout", async (request, reply) => {
    const refreshToken = extractRefreshToken(request);
    await authService.logout(refreshToken);
    clearAuthCookies(reply);

    return reply.status(200).send({
      data: {
        message: "Logged out successfully"
      }
    });
  });

  /**
   * GET /v1/users/me
   */
  fastify.get("/users/me", async (request, reply) => {
    const accessToken = extractAccessToken(request);
    if (!accessToken) {
      throw new UnauthorizedError("Authentication required.");
    }

    const user = await authService.getMe(accessToken);
    return reply.status(200).send({
      data: { user }
    });
  });
};
