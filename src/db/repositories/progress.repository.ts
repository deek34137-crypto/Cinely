import crypto from "crypto";
import { getDatabase } from "../index.js";
import { PlaybackProgress, ProgressRecord, UpdateProgressPayload } from "../../core/types/progress.js";

export class ProgressRepository {
  /**
   * Upserts playback progress for a movie or TV episode.
   * Computes progressPercent and handles completion semantics.
   */
  async upsertProgress(
    userId: string,
    mediaId: string,
    payload: UpdateProgressPayload
  ): Promise<PlaybackProgress> {
    const db = getDatabase();
    const seasonNumber = Number(payload.seasonNumber || 0);
    const episodeNumber = Number(payload.episodeNumber || 0);
    const positionSeconds = Math.max(0, Number(payload.positionSeconds));
    const durationSeconds = Math.max(0, Number(payload.durationSeconds));

    const progressPercent = durationSeconds > 0
      ? Number(Math.min(100, (positionSeconds / durationSeconds) * 100).toFixed(2))
      : 0;

    const completed = payload.completed !== undefined
      ? (payload.completed ? 1 : 0)
      : (durationSeconds > 0 && positionSeconds / durationSeconds >= 0.90 ? 1 : 0);

    const now = new Date().toISOString();
    const id = `cinely:prog:${crypto.randomUUID()}`;
    const clientSequence = payload.clientSequence !== undefined ? Number(payload.clientSequence) : undefined;

    // Check if an existing record has a newer clientSequence to enforce monotonic write ordering
    const existing = await this.getProgress(userId, mediaId, seasonNumber, episodeNumber);
    if (
      existing &&
      clientSequence !== undefined &&
      existing.clientSequence !== undefined &&
      clientSequence < existing.clientSequence
    ) {
      // Ignore stale out-of-order write and return latest existing state
      return existing;
    }

    await db.run(
      `INSERT INTO user_progress (
        id, user_id, media_id, season_number, episode_number,
        position_seconds, duration_seconds, completed, updated_at, client_sequence
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, media_id, season_number, episode_number) DO UPDATE SET
        position_seconds = excluded.position_seconds,
        duration_seconds = excluded.duration_seconds,
        completed = excluded.completed,
        updated_at = excluded.updated_at,
        client_sequence = excluded.client_sequence`,
      [
        id,
        userId,
        mediaId,
        seasonNumber,
        episodeNumber,
        positionSeconds,
        durationSeconds,
        completed,
        now,
        clientSequence
      ]
    );

    return {
      mediaId,
      seasonNumber,
      episodeNumber,
      positionSeconds,
      durationSeconds,
      progressPercent,
      completed: Boolean(completed),
      clientSequence,
      updatedAt: now
    };
  }

  /**
   * Retrieves playback progress for a specific movie or episode.
   */
  async getProgress(
    userId: string,
    mediaId: string,
    seasonNumber = 0,
    episodeNumber = 0
  ): Promise<PlaybackProgress | null> {
    const db = getDatabase();
    const row = await db.get<ProgressRecord>(
      `SELECT * FROM user_progress
       WHERE user_id = ? AND media_id = ? AND season_number = ? AND episode_number = ?`,
      [userId, mediaId, Number(seasonNumber), Number(episodeNumber)]
    );

    if (!row) return null;

    const progressPercent = row.duration_seconds > 0
      ? Number(Math.min(100, (row.position_seconds / row.duration_seconds) * 100).toFixed(2))
      : 0;

    return {
      mediaId: row.media_id,
      seasonNumber: row.season_number,
      episodeNumber: row.episode_number,
      positionSeconds: row.position_seconds,
      durationSeconds: row.duration_seconds,
      progressPercent,
      completed: Boolean(row.completed),
      clientSequence: row.client_sequence,
      updatedAt: row.updated_at
    };
  }

  /**
   * Retrieves all playback progress items for a user, sorted newest updated first.
   */
  async getUserProgress(userId: string): Promise<PlaybackProgress[]> {
    const db = getDatabase();
    const rows = await db.query<ProgressRecord>(
      `SELECT * FROM user_progress WHERE user_id = ? ORDER BY updated_at DESC`,
      [userId]
    );

    return rows.map((row) => {
      const progressPercent = row.duration_seconds > 0
        ? Number(Math.min(100, (row.position_seconds / row.duration_seconds) * 100).toFixed(2))
        : 0;

      return {
        mediaId: row.media_id,
        seasonNumber: row.season_number,
        episodeNumber: row.episode_number,
        positionSeconds: row.position_seconds,
        durationSeconds: row.duration_seconds,
        progressPercent,
        completed: Boolean(row.completed),
        clientSequence: row.client_sequence,
        updatedAt: row.updated_at
      };
    });
  }

  /**
   * Deletes playback progress for a specific episode, or all progress for a media item.
   */
  async deleteProgress(
    userId: string,
    mediaId: string,
    seasonNumber?: number,
    episodeNumber?: number
  ): Promise<boolean> {
    const db = getDatabase();

    if (seasonNumber !== undefined && episodeNumber !== undefined) {
      const result = await db.run(
        `DELETE FROM user_progress
         WHERE user_id = ? AND media_id = ? AND season_number = ? AND episode_number = ?`,
        [userId, mediaId, Number(seasonNumber), Number(episodeNumber)]
      );
      return result.changes > 0;
    }

    const result = await db.run(
      `DELETE FROM user_progress WHERE user_id = ? AND media_id = ?`,
      [userId, mediaId]
    );
    return result.changes > 0;
  }
}
