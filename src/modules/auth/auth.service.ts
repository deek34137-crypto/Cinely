import crypto from "crypto";
import { config } from "../../config/env.js";
import { AuthResult, UserProfile } from "../../core/types/auth.js";
import {
  EmailAlreadyExistsError,
  InvalidCredentialsError,
  RefreshTokenInvalidError,
  UnauthorizedError,
  ValidationError
} from "../../core/types/errors.js";
import {
  createAccessToken,
  generateRefreshToken,
  hashPassword,
  hashRefreshToken,
  verifyAccessToken,
  verifyPassword
} from "../../core/utils/crypto.js";
import { UserRepository } from "../../db/repositories/user.repository.js";

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes
const REFRESH_TOKEN_TTL_DAYS = 30; // 30 days

export class AuthService {
  private userRepo: UserRepository;
  private secret: string;

  constructor(userRepo = new UserRepository(), secret = config.CINELY_MASTER_KEY) {
    this.userRepo = userRepo;
    this.secret = secret;
  }

  /**
   * Registers a new user account.
   */
  async register(payload: {
    email?: string;
    password?: string;
    displayName?: string;
  }): Promise<AuthResult> {
    const email = payload.email?.toLowerCase().trim();
    const password = payload.password;
    const displayName = payload.displayName?.trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ValidationError("A valid email address is required.", [
        { name: "email", reason: "Must be a valid email format." }
      ]);
    }

    if (!password || password.length < 8) {
      throw new ValidationError("Password must be at least 8 characters long.", [
        { name: "password", reason: "Must contain at least 8 characters." }
      ]);
    }

    if (!displayName || displayName.length < 1 || displayName.length > 100) {
      throw new ValidationError("Display name is required (1-100 characters).", [
        { name: "displayName", reason: "Must be between 1 and 100 characters." }
      ]);
    }

    // Check email uniqueness
    const existing = await this.userRepo.findByEmail(email);
    if (existing) {
      throw new EmailAlreadyExistsError();
    }

    const passwordHash = await hashPassword(password);
    const userId = `cinely:user:${crypto.randomUUID()}`;

    const userRecord = await this.userRepo.createUser({
      id: userId,
      email,
      passwordHash,
      displayName,
      role: "user"
    });

    const userProfile: UserProfile = {
      id: userRecord.id,
      email: userRecord.email,
      displayName: userRecord.display_name,
      role: userRecord.role,
      createdAt: userRecord.created_at
    };

    // Issue tokens
    const accessToken = createAccessToken(userProfile, this.secret, ACCESS_TOKEN_TTL_SECONDS);
    const { rawToken: refreshToken, tokenHash } = generateRefreshToken();

    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
    await this.userRepo.saveRefreshToken({
      id: `cinely:token:${crypto.randomUUID()}`,
      userId: userRecord.id,
      tokenHash,
      expiresAt
    });

    return {
      user: userProfile,
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: ACCESS_TOKEN_TTL_SECONDS,
        tokenType: "Bearer"
      }
    };
  }

  /**
   * Authenticates user credentials and issues token pair.
   */
  async login(payload: { email?: string; password?: string }): Promise<AuthResult> {
    const email = payload.email?.toLowerCase().trim();
    const password = payload.password;

    if (!email || !password) {
      throw new InvalidCredentialsError();
    }

    const userRecord = await this.userRepo.findByEmail(email);
    if (!userRecord) {
      throw new InvalidCredentialsError();
    }

    const isMatch = await verifyPassword(password, userRecord.password_hash);
    if (!isMatch) {
      throw new InvalidCredentialsError();
    }

    const userProfile: UserProfile = {
      id: userRecord.id,
      email: userRecord.email,
      displayName: userRecord.display_name,
      role: userRecord.role,
      createdAt: userRecord.created_at
    };

    // Issue new tokens
    const accessToken = createAccessToken(userProfile, this.secret, ACCESS_TOKEN_TTL_SECONDS);
    const { rawToken: refreshToken, tokenHash } = generateRefreshToken();

    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
    await this.userRepo.saveRefreshToken({
      id: `cinely:token:${crypto.randomUUID()}`,
      userId: userRecord.id,
      tokenHash,
      expiresAt
    });

    return {
      user: userProfile,
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: ACCESS_TOKEN_TTL_SECONDS,
        tokenType: "Bearer"
      }
    };
  }

  /**
   * Performs single-use refresh token rotation.
   */
  async refresh(rawRefreshToken?: string): Promise<AuthResult> {
    if (!rawRefreshToken || typeof rawRefreshToken !== "string" || !rawRefreshToken.trim()) {
      throw new RefreshTokenInvalidError();
    }

    const tokenHash = hashRefreshToken(rawRefreshToken);
    const record = await this.userRepo.findRefreshTokenByHash(tokenHash);

    if (!record) {
      throw new RefreshTokenInvalidError();
    }

    if (record.revoked_at !== null) {
      throw new RefreshTokenInvalidError();
    }

    if (new Date(record.expires_at).getTime() <= Date.now()) {
      throw new RefreshTokenInvalidError();
    }

    const userRecord = await this.userRepo.findById(record.user_id);
    if (!userRecord) {
      throw new RefreshTokenInvalidError();
    }

    // Invalidate / Revoke old token
    await this.userRepo.revokeRefreshToken(tokenHash);

    const userProfile: UserProfile = {
      id: userRecord.id,
      email: userRecord.email,
      displayName: userRecord.display_name,
      role: userRecord.role,
      createdAt: userRecord.created_at
    };

    // Issue new token pair
    const accessToken = createAccessToken(userProfile, this.secret, ACCESS_TOKEN_TTL_SECONDS);
    const { rawToken: newRefreshToken, tokenHash: newTokenHash } = generateRefreshToken();

    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
    await this.userRepo.saveRefreshToken({
      id: `cinely:token:${crypto.randomUUID()}`,
      userId: userRecord.id,
      tokenHash: newTokenHash,
      expiresAt
    });

    return {
      user: userProfile,
      tokens: {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn: ACCESS_TOKEN_TTL_SECONDS,
        tokenType: "Bearer"
      }
    };
  }

  /**
   * Revokes the refresh token.
   */
  async logout(rawRefreshToken?: string): Promise<void> {
    if (rawRefreshToken) {
      const tokenHash = hashRefreshToken(rawRefreshToken);
      await this.userRepo.revokeRefreshToken(tokenHash);
    }
  }

  /**
   * Retrieves the authenticated user profile using their access token.
   */
  async getMe(accessToken?: string): Promise<UserProfile> {
    if (!accessToken) {
      throw new UnauthorizedError("Authentication required.");
    }

    const payload = verifyAccessToken(accessToken, this.secret);
    const userRecord = await this.userRepo.findById(payload.id);
    if (!userRecord) {
      throw new UnauthorizedError("User account not found.");
    }

    return {
      id: userRecord.id,
      email: userRecord.email,
      displayName: userRecord.display_name,
      role: userRecord.role,
      createdAt: userRecord.created_at
    };
  }
}
