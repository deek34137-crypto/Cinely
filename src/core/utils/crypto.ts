import crypto from "crypto";
import { UserProfile } from "../types/auth.js";
import { UnauthorizedError } from "../types/errors.js";

/**
 * Hashes a plaintext password using crypto.scrypt with a random 16-byte salt.
 * Returns format: `${salt}:${derivedKey}`
 */
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

/**
 * Verifies a plaintext password against a stored `salt:hash` string using constant-time comparison.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  return new Promise((resolve) => {
    const parts = storedHash.split(":");
    if (parts.length !== 2) return resolve(false);

    const [salt, key] = parts;
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return resolve(false);
      const keyBuffer = Buffer.from(key, "hex");
      if (keyBuffer.length !== derivedKey.length) return resolve(false);
      resolve(crypto.timingSafeEqual(keyBuffer, derivedKey));
    });
  });
}

/**
 * Generates an opaque random refresh token and its SHA-256 hash.
 * The raw token is returned to the client in an httpOnly cookie.
 * The hash is stored in the database.
 */
export function generateRefreshToken(): { rawToken: string; tokenHash: string } {
  const rawToken = "rt_" + crypto.randomBytes(32).toString("hex");
  const tokenHash = hashRefreshToken(rawToken);
  return { rawToken, tokenHash };
}

/**
 * Hashes a raw refresh token using SHA-256.
 */
export function hashRefreshToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf8");
}

interface JWTPayload {
  sub: string;
  email: string;
  displayName: string;
  role: string;
  iat: number;
  exp: number;
}

/**
 * Creates a stateless signed JWT access token.
 */
export function createAccessToken(
  user: UserProfile,
  secret: string,
  expiresInSeconds: number = 900 // 15 minutes
): string {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload: JWTPayload = {
    sub: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    iat: now,
    exp: now + expiresInSeconds
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verifies and decodes a signed JWT access token.
 * Throws UnauthorizedError if invalid or expired.
 */
export function verifyAccessToken(token: string, secret: string): UserProfile {
  if (!token || typeof token !== "string") {
    throw new UnauthorizedError("Missing access token.");
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new UnauthorizedError("Malformed access token.");
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    throw new UnauthorizedError("Invalid access token signature.");
  }

  try {
    const payload: JWTPayload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw new UnauthorizedError("Access token has expired.");
    }

    return {
      id: payload.sub,
      email: payload.email,
      displayName: payload.displayName,
      role: payload.role,
      createdAt: "" // Not stored in payload; can be queried if needed
    };
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
    throw new UnauthorizedError("Invalid access token payload.");
  }
}
