import crypto from "crypto";
import { getDatabase } from "../index.js";
import { MediaRepository } from "./media.repository.js";
import { WatchlistItemRecord, WatchlistMediaItem } from "../../core/types/watchlist.js";
import { NormalizedMediaSummary } from "../../core/types/media.js";

export class WatchlistRepository {
  private mediaRepo: MediaRepository;

  constructor(mediaRepo = new MediaRepository()) {
    this.mediaRepo = mediaRepo;
  }

  /**
   * Adds a canonical media item to a user's watchlist.
   * If already present, preserves original addedAt timestamp (idempotent).
   */
  async addToWatchlist(
    userId: string,
    canonicalMediaId: string
  ): Promise<{ id: string; addedAt: string; alreadyExisted: boolean }> {
    const db = getDatabase();

    // Check if already in watchlist
    const existing = await db.get<WatchlistItemRecord>(
      "SELECT * FROM user_watchlist WHERE user_id = ? AND media_id = ?",
      [userId, canonicalMediaId]
    );

    if (existing) {
      return {
        id: existing.id,
        addedAt: existing.created_at,
        alreadyExisted: true
      };
    }

    const id = `cinely:watchlist:${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    await db.run(
      "INSERT INTO user_watchlist (id, user_id, media_id, created_at) VALUES (?, ?, ?, ?)",
      [id, userId, canonicalMediaId, now]
    );

    return {
      id,
      addedAt: now,
      alreadyExisted: false
    };
  }

  /**
   * Removes a canonical media item from a user's watchlist.
   * Idempotent (returns true if deleted, false if did not exist).
   */
  async removeFromWatchlist(userId: string, canonicalMediaId: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.run(
      "DELETE FROM user_watchlist WHERE user_id = ? AND media_id = ?",
      [userId, canonicalMediaId]
    );
    return result.changes > 0;
  }

  /**
   * Checks if a canonical media item is in the user's watchlist.
   */
  async isInWatchlist(userId: string, canonicalMediaId: string): Promise<boolean> {
    const db = getDatabase();
    const row = await db.get(
      "SELECT id FROM user_watchlist WHERE user_id = ? AND media_id = ?",
      [userId, canonicalMediaId]
    );
    return !!row;
  }

  /**
   * Retrieves a user's complete watchlist, sorted newest-added first.
   * Dynamically resolves canonical metadata via MediaRepository without storing duplicate metadata.
   */
  async getWatchlist(userId: string): Promise<WatchlistMediaItem[]> {
    const db = getDatabase();
    const rows = await db.query<{ media_id: string; created_at: string }>(
      "SELECT media_id, created_at FROM user_watchlist WHERE user_id = ? ORDER BY created_at DESC",
      [userId]
    );

    const items: WatchlistMediaItem[] = [];

    for (const row of rows) {
      const mediaDetail = await this.mediaRepo.findById(row.media_id);
      if (!mediaDetail) continue;

      const summary: NormalizedMediaSummary = {
        canonicalId: mediaDetail.id,
        mediaKind: mediaDetail.mediaKind,
        title: mediaDetail.defaultTitle,
        releaseYear: mediaDetail.releaseYear,
        posterUrl: mediaDetail.artwork.posterUrl,
        backdropUrl: mediaDetail.artwork.backdropUrl,
        rating: mediaDetail.rating,
        overview: mediaDetail.overview,
        genres: mediaDetail.genres,
        externalIds: mediaDetail.externalIds
      };

      items.push({
        ...summary,
        addedAt: row.created_at
      });
    }

    return items;
  }
}
