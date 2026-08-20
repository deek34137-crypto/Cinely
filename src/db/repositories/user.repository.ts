import { getDatabase } from "../index.js";
import { UserRecord, RefreshTokenRecord } from "../../core/types/auth.js";

export class UserRepository {
  /**
   * Finds a user by email address (case-insensitive).
   */
  async findByEmail(email: string): Promise<UserRecord | null> {
    const db = getDatabase();
    return db.get<UserRecord>("SELECT * FROM users WHERE email = ?", [email.toLowerCase().trim()]);
  }

  /**
   * Finds a user by their canonical ID.
   */
  async findById(id: string): Promise<UserRecord | null> {
    const db = getDatabase();
    return db.get<UserRecord>("SELECT * FROM users WHERE id = ?", [id]);
  }

  /**
   * Creates a new user record in the database.
   */
  async createUser(user: {
    id: string;
    email: string;
    passwordHash: string;
    displayName: string;
    role?: string;
  }): Promise<UserRecord> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const role = user.role || "user";
    const email = user.email.toLowerCase().trim();

    await db.run(
      `INSERT INTO users (id, email, password_hash, display_name, role, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user.id, email, user.passwordHash, user.displayName, role, now, now]
    );

    return {
      id: user.id,
      email,
      password_hash: user.passwordHash,
      display_name: user.displayName,
      role,
      created_at: now,
      updated_at: now
    };
  }

  /**
   * Saves a hashed refresh token.
   * Note: tokenHash is SHA-256(rawToken), rawToken is NEVER stored.
   */
  async saveRefreshToken(record: {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: string;
  }): Promise<void> {
    const db = getDatabase();
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO user_refresh_tokens (id, user_id, token_hash, expires_at, created_at, revoked_at)
       VALUES (?, ?, ?, ?, ?, NULL)`,
      [record.id, record.userId, record.tokenHash, record.expiresAt, now]
    );
  }

  /**
   * Finds a refresh token record by its SHA-256 hash.
   */
  async findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const db = getDatabase();
    return db.get<RefreshTokenRecord>("SELECT * FROM user_refresh_tokens WHERE token_hash = ?", [tokenHash]);
  }

  /**
   * Revokes a specific refresh token by its SHA-256 hash.
   */
  async revokeRefreshToken(tokenHash: string): Promise<void> {
    const db = getDatabase();
    const now = new Date().toISOString();
    await db.run("UPDATE user_refresh_tokens SET revoked_at = ? WHERE token_hash = ?", [now, tokenHash]);
  }

  /**
   * Revokes all active refresh tokens for a user.
   */
  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    const db = getDatabase();
    const now = new Date().toISOString();
    await db.run("UPDATE user_refresh_tokens SET revoked_at = ? WHERE user_id = ?", [now, userId]);
  }
}
