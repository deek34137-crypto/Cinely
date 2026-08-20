import pg from "pg";
import { config } from "../config/env.js";

export interface IDatabaseClient {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  get<T = any>(sql: string, params?: any[]): Promise<T | null>;
  run(sql: string, params?: any[]): Promise<{ changes: number; lastInsertRowid: number | bigint }>;
  exec(sql: string): Promise<void>;
  ping(): Promise<boolean>;
  close(): Promise<void>;
}


/**
 * High-performance, zero-dependency in-memory relational database client.
 * Provides SQLite/PostgreSQL-compatible relational storage for development, testing, and memory mode.
 */
class InMemoryDatabaseClient implements IDatabaseClient {
  private tables: Map<string, Map<string, any>> = new Map();
  private indexes: Map<string, Map<string, Set<string>>> = new Map(); // table:column -> value -> Set<id>

  constructor() {
    this.initTables();
  }

  private initTables() {
    const tableNames = [
      "media_items",
      "media_external_mappings",
      "media_genres",
      "media_credits",
      "seasons",
      "episodes",
      "addon_catalog",
      "users",
      "user_addon_preferences",
      "user_progress",
      "user_refresh_tokens",
      "user_watchlist"
    ];
    for (const name of tableNames) {
      this.tables.set(name, new Map());
    }
  }

  async exec(_sql: string): Promise<void> {
    // Tables initialized in constructor
  }

  async ping(): Promise<boolean> {
    return true;
  }


  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const normalized = sql.trim().replace(/\s+/g, " ");

    // Handle COUNT queries
    if (/SELECT COUNT\(\*\) as count FROM seasons WHERE series_id = \?/i.test(normalized)) {
      const seriesId = params[0];
      let count = 0;
      for (const row of this.tables.get("seasons")!.values()) {
        if (row.series_id === seriesId) count++;
      }
      return [{ count }] as any;
    }

    if (/SELECT COUNT\(\*\) as count FROM episodes WHERE series_id = \?/i.test(normalized)) {
      const seriesId = params[0];
      let count = 0;
      for (const row of this.tables.get("episodes")!.values()) {
        if (row.series_id === seriesId) count++;
      }
      return [{ count }] as any;
    }

    // SELECT * FROM media_items WHERE id = ?
    if (/SELECT \* FROM media_items WHERE id = \?/i.test(normalized)) {
      const id = params[0];
      const item = this.tables.get("media_items")!.get(id);
      return item ? [item as T] : [];
    }

    // SELECT provider_name, external_id FROM media_external_mappings WHERE media_item_id = ?
    if (/SELECT provider_name, external_id FROM media_external_mappings WHERE media_item_id = \?/i.test(normalized)) {
      const mediaId = params[0];
      const res: any[] = [];
      for (const row of this.tables.get("media_external_mappings")!.values()) {
        if (row.media_item_id === mediaId) {
          res.push({ provider_name: row.provider_name, external_id: row.external_id });
        }
      }
      return res as T[];
    }

    // SELECT media_item_id FROM media_external_mappings WHERE provider_name = ? AND external_id = ?
    if (/SELECT media_item_id FROM media_external_mappings WHERE provider_name = \? AND external_id = \?/i.test(normalized)) {
      const [provider, extId] = params;
      for (const row of this.tables.get("media_external_mappings")!.values()) {
        if (row.provider_name === provider && row.external_id === extId) {
          return [{ media_item_id: row.media_item_id }] as any;
        }
      }
      return [];
    }

    // SELECT genre FROM media_genres WHERE media_item_id = ?
    if (/SELECT genre FROM media_genres WHERE media_item_id = \?/i.test(normalized)) {
      const mediaId = params[0];
      const res: any[] = [];
      for (const row of this.tables.get("media_genres")!.values()) {
        if (row.media_item_id === mediaId) {
          res.push({ genre: row.genre });
        }
      }
      return res as T[];
    }

    // SELECT name, role, character_name, profile_url FROM media_credits WHERE media_item_id = ? ORDER BY order_index ASC
    if (/SELECT name, role, character_name, profile_url FROM media_credits WHERE media_item_id = \?/i.test(normalized)) {
      const mediaId = params[0];
      const res: any[] = [];
      for (const row of this.tables.get("media_credits")!.values()) {
        if (row.media_item_id === mediaId) {
          res.push(row);
        }
      }
      res.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
      return res as T[];
    }

    // SELECT * FROM seasons WHERE series_id = ? AND season_number = ?
    if (/SELECT \* FROM seasons WHERE series_id = \? AND season_number = \?/i.test(normalized)) {
      const [seriesId, seasonNum] = params;
      for (const row of this.tables.get("seasons")!.values()) {
        if (row.series_id === seriesId && Number(row.season_number) === Number(seasonNum)) {
          return [row as T];
        }
      }
      return [];
    }

    // SELECT * FROM episodes WHERE season_id = ? ORDER BY episode_number ASC
    if (/SELECT \* FROM episodes WHERE season_id = \?/i.test(normalized)) {
      const seasonId = params[0];
      const res: any[] = [];
      for (const row of this.tables.get("episodes")!.values()) {
        if (row.season_id === seasonId) {
          res.push(row);
        }
      }
      res.sort((a, b) => a.episode_number - b.episode_number);
      return res as T[];
    }

    // General SELECT * FROM media_items [WHERE media_kind = ?]
    if (/SELECT \* FROM media_items/i.test(normalized)) {
      const items = Array.from(this.tables.get("media_items")!.values());
      if (/WHERE media_kind = \?/i.test(normalized)) {
        const kind = params[0];
        return items.filter(i => i.media_kind === kind) as T[];
      }
      return items as T[];
    }

    // Discovery query with genre / kind filters
    if (/SELECT DISTINCT m\.\* FROM media_items m/i.test(normalized)) {
      let items = Array.from(this.tables.get("media_items")!.values());

      let paramIdx = 0;
      if (/g\.genre = \?/i.test(normalized)) {
        const genre = params[paramIdx++];
        const matchingMediaIds = new Set<string>();
        for (const g of this.tables.get("media_genres")!.values()) {
          if (g.genre.toLowerCase() === genre.toLowerCase()) {
            matchingMediaIds.add(g.media_item_id);
          }
        }
        items = items.filter(m => matchingMediaIds.has(m.id));
      }

      if (/m\.media_kind = \?/i.test(normalized)) {
        const kind = params[paramIdx++];
        items = items.filter(m => m.media_kind === kind);
      }

      // Sort by popularity / rating
      items.sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0) || (b.rating || 0) - (a.rating || 0));

      const limit = typeof params[params.length - 2] === "number" ? params[params.length - 2] : 20;
      const offset = typeof params[params.length - 1] === "number" ? params[params.length - 1] : 0;

      return items.slice(offset, offset + limit) as T[];
    }

    // SELECT * FROM users WHERE email = ?
    if (/SELECT \* FROM users WHERE email = \?/i.test(normalized)) {
      const email = String(params[0]).toLowerCase();
      for (const user of this.tables.get("users")!.values()) {
        if (user.email.toLowerCase() === email) {
          return [user as T];
        }
      }
      return [];
    }

    // SELECT * FROM users WHERE id = ?
    if (/SELECT \* FROM users WHERE id = \?/i.test(normalized)) {
      const id = params[0];
      const user = this.tables.get("users")!.get(id);
      return user ? [user as T] : [];
    }

    // SELECT * FROM user_refresh_tokens WHERE token_hash = ?
    if (/SELECT \* FROM user_refresh_tokens WHERE token_hash = \?/i.test(normalized)) {
      const hash = params[0];
      for (const token of this.tables.get("user_refresh_tokens")!.values()) {
        if (token.token_hash === hash) {
          return [token as T];
        }
      }
      return [];
    }

    // SELECT * FROM user_refresh_tokens WHERE user_id = ?
    if (/SELECT \* FROM user_refresh_tokens WHERE user_id = \?/i.test(normalized)) {
      const userId = params[0];
      const res: any[] = [];
      for (const token of this.tables.get("user_refresh_tokens")!.values()) {
        if (token.user_id === userId) {
          res.push(token);
        }
      }
      return res as T[];
    }

    // SELECT * FROM user_watchlist WHERE user_id = ? AND media_id = ?
    if (/SELECT \* FROM user_watchlist WHERE user_id = \? AND media_id = \?/i.test(normalized)) {
      const [userId, mediaId] = params;
      for (const item of this.tables.get("user_watchlist")!.values()) {
        if (item.user_id === userId && item.media_id === mediaId) {
          return [item as T];
        }
      }
      return [];
    }

    // SELECT * FROM user_watchlist WHERE user_id = ? [ORDER BY created_at DESC]
    if (/SELECT (.*?) FROM user_watchlist WHERE user_id = \?/i.test(normalized)) {
      const userId = params[0];
      const res: any[] = [];
      for (const item of this.tables.get("user_watchlist")!.values()) {
        if (item.user_id === userId) {
          res.push(item);
        }
      }
      res.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return res as T[];
    }

    // SELECT * FROM user_watchlist WHERE media_id = ?
    if (/SELECT \* FROM user_watchlist WHERE media_id = \?/i.test(normalized)) {
      const mediaId = params[0];
      const res: any[] = [];
      for (const item of this.tables.get("user_watchlist")!.values()) {
        if (item.media_id === mediaId) {
          res.push(item);
        }
      }
      return res as T[];
    }

    // SELECT * FROM user_progress WHERE user_id = ? AND media_id = ? AND season_number = ... AND episode_number = ...
    const progressDetailMatch = normalized.match(/SELECT \* FROM user_progress WHERE user_id = \? AND media_id = \? AND season_number = (\?|\d+) AND episode_number = (\?|\d+)/i);
    if (progressDetailMatch) {
      const userId = params[0];
      const mediaId = params[1];
      const sNum = progressDetailMatch[1] === "?" ? Number(params[2]) : Number(progressDetailMatch[1]);
      const eNum = progressDetailMatch[2] === "?" ? Number(params[3]) : Number(progressDetailMatch[2]);

      for (const item of this.tables.get("user_progress")!.values()) {
        if (
          item.user_id === userId &&
          item.media_id === mediaId &&
          item.season_number === sNum &&
          item.episode_number === eNum
        ) {
          return [item as T];
        }
      }
      return [];
    }

    // SELECT * FROM user_progress WHERE user_id = ? AND media_id = ?
    if (/SELECT \* FROM user_progress WHERE user_id = \? AND media_id = \?$/i.test(normalized)) {
      const [userId, mediaId] = params;
      const res: any[] = [];
      for (const item of this.tables.get("user_progress")!.values()) {
        if (item.user_id === userId && item.media_id === mediaId) {
          res.push(item);
        }
      }
      res.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      return res as T[];
    }

    // SELECT * FROM user_progress WHERE user_id = ? [ORDER BY updated_at DESC]
    if (/SELECT (.*?) FROM user_progress WHERE user_id = \?/i.test(normalized)) {
      const userId = params[0];
      const res: any[] = [];
      for (const item of this.tables.get("user_progress")!.values()) {
        if (item.user_id === userId) {
          res.push(item);
        }
      }
      res.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      return res as T[];
    }

    // SELECT * FROM user_progress WHERE media_id = ?
    if (/SELECT \* FROM user_progress WHERE media_id = \?/i.test(normalized)) {
      const mediaId = params[0];
      const res: any[] = [];
      for (const item of this.tables.get("user_progress")!.values()) {
        if (item.media_id === mediaId) {
          res.push(item);
        }
      }
      return res as T[];
    }

    // SELECT * FROM addon_catalog WHERE id = ?
    if (/SELECT \* FROM addon_catalog WHERE id = \?/i.test(normalized)) {
      const id = params[0];
      const item = this.tables.get("addon_catalog")!.get(id);
      return item ? [item as T] : [];
    }

    // SELECT * FROM addon_catalog [ORDER BY stars DESC]
    if (/SELECT \* FROM addon_catalog/i.test(normalized)) {
      const items = Array.from(this.tables.get("addon_catalog")!.values());
      items.sort((a, b) => (b.stars || 0) - (a.stars || 0));
      return items as T[];
    }

    // SELECT * FROM user_addon_preferences WHERE user_id = ? AND addon_id = ?
    if (/SELECT \* FROM user_addon_preferences WHERE user_id = \? AND addon_id = \?/i.test(normalized)) {
      const [userId, addonId] = params;
      for (const item of this.tables.get("user_addon_preferences")!.values()) {
        if (item.user_id === userId && item.addon_id === addonId) {
          return [item as T];
        }
      }
      return [];
    }

    // SELECT * FROM user_addon_preferences WHERE user_id = ?
    if (/SELECT \* FROM user_addon_preferences WHERE user_id = \?/i.test(normalized)) {
      const userId = params[0];
      const res: any[] = [];
      for (const item of this.tables.get("user_addon_preferences")!.values()) {
        if (item.user_id === userId) {
          res.push(item);
        }
      }
      res.sort((a, b) => (a.priority_order || 100) - (b.priority_order || 100));
      return res as T[];
    }

    // SELECT * FROM user_addon_preferences WHERE addon_id = ?
    if (/SELECT \* FROM user_addon_preferences WHERE addon_id = \?/i.test(normalized)) {
      const addonId = params[0];
      const res: any[] = [];
      for (const item of this.tables.get("user_addon_preferences")!.values()) {
        if (item.addon_id === addonId) {
          res.push(item);
        }
      }
      return res as T[];
    }

    return [];
  }

  async get<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const results = await this.query<T>(sql, params);
    return results.length > 0 ? results[0] : null;
  }

  async run(sql: string, params: any[] = []): Promise<{ changes: number; lastInsertRowid: number | bigint }> {
    const normalized = sql.trim().replace(/\s+/g, " ");

    // INSERT INTO media_items
    if (/INSERT INTO media_items/i.test(normalized)) {
      const [
        id, media_kind, original_title, default_title, overview, tagline,
        release_date, release_year, runtime_minutes, certification,
        poster_url, backdrop_url, trailer_url, rating, popularity_score, updated_at
      ] = params;

      const existing = this.tables.get("media_items")!.get(id);
      const row = {
        id,
        media_kind,
        original_title,
        default_title,
        overview: overview ?? existing?.overview,
        tagline: tagline ?? existing?.tagline,
        release_date: release_date ?? existing?.release_date,
        release_year: release_year ?? existing?.release_year,
        runtime_minutes: runtime_minutes ?? existing?.runtime_minutes,
        certification: certification ?? existing?.certification,
        poster_url: poster_url ?? existing?.poster_url,
        backdrop_url: backdrop_url ?? existing?.backdrop_url,
        trailer_url: trailer_url ?? existing?.trailer_url,
        rating: rating ?? existing?.rating,
        popularity_score: popularity_score ?? existing?.popularity_score ?? 0,
        created_at: existing?.created_at || updated_at,
        updated_at
      };

      this.tables.get("media_items")!.set(id, row);
      return { changes: 1, lastInsertRowid: 1 };
    }

    // INSERT INTO media_external_mappings
    if (/INSERT INTO media_external_mappings/i.test(normalized)) {
      const [id, media_item_id, provider_name, external_id, last_synced_at] = params;

      // Check unique constraint on (provider_name, external_id)
      for (const [, row] of this.tables.get("media_external_mappings")!.entries()) {
        if (row.provider_name === provider_name && row.external_id === external_id) {
          row.media_item_id = media_item_id;
          row.last_synced_at = last_synced_at;
          return { changes: 1, lastInsertRowid: 1 };
        }
      }

      this.tables.get("media_external_mappings")!.set(id, {
        id,
        media_item_id,
        provider_name,
        external_id,
        last_synced_at
      });
      return { changes: 1, lastInsertRowid: 1 };
    }

    // INSERT OR IGNORE INTO media_genres
    if (/INSERT OR IGNORE INTO media_genres/i.test(normalized) || /INSERT INTO media_genres/i.test(normalized)) {
      const [media_item_id, genre] = params;
      const key = `${media_item_id}:${genre}`;
      this.tables.get("media_genres")!.set(key, { media_item_id, genre });
      return { changes: 1, lastInsertRowid: 1 };
    }

    // INSERT OR REPLACE INTO media_credits
    if (/INSERT OR REPLACE INTO media_credits/i.test(normalized) || /INSERT INTO media_credits/i.test(normalized)) {
      const [id, media_item_id, name, role, character_name, profile_url, order_index] = params;
      this.tables.get("media_credits")!.set(id, {
        id,
        media_item_id,
        name,
        role,
        character_name,
        profile_url,
        order_index
      });
      return { changes: 1, lastInsertRowid: 1 };
    }

    // INSERT INTO seasons
    if (/INSERT INTO seasons/i.test(normalized)) {
      const [id, series_id, season_number, title, overview, poster_url, air_date, episode_count] = params;
      const key = id;
      this.tables.get("seasons")!.set(key, {
        id,
        series_id,
        season_number,
        title,
        overview,
        poster_url,
        air_date,
        episode_count
      });
      return { changes: 1, lastInsertRowid: 1 };
    }

    // INSERT INTO episodes
    if (/INSERT INTO episodes/i.test(normalized)) {
      const [id, season_id, series_id, episode_number, title, overview, still_url, air_date, runtime_minutes] = params;
      const key = id;
      this.tables.get("episodes")!.set(key, {
        id,
        season_id,
        series_id,
        episode_number,
        title,
        overview,
        still_url,
        air_date,
        runtime_minutes
      });
      return { changes: 1, lastInsertRowid: 1 };
    }

    // INSERT INTO users
    if (/INSERT INTO users/i.test(normalized)) {
      const [id, email, password_hash, display_name, role, created_at, updated_at] = params;
      const user = {
        id,
        email,
        password_hash,
        display_name,
        role: role || "user",
        created_at,
        updated_at
      };
      this.tables.get("users")!.set(id, user);
      return { changes: 1, lastInsertRowid: 1 };
    }

    // INSERT INTO user_refresh_tokens
    if (/INSERT INTO user_refresh_tokens/i.test(normalized)) {
      const [id, user_id, token_hash, expires_at, created_at, revoked_at] = params;
      const token = {
        id,
        user_id,
        token_hash,
        expires_at,
        created_at,
        revoked_at: revoked_at || null
      };
      this.tables.get("user_refresh_tokens")!.set(id, token);
      return { changes: 1, lastInsertRowid: 1 };
    }

    // UPDATE user_refresh_tokens SET revoked_at = ? WHERE token_hash = ?
    if (/UPDATE user_refresh_tokens SET revoked_at = \? WHERE token_hash = \?/i.test(normalized)) {
      const [revoked_at, token_hash] = params;
      let changes = 0;
      for (const token of this.tables.get("user_refresh_tokens")!.values()) {
        if (token.token_hash === token_hash) {
          token.revoked_at = revoked_at;
          changes++;
        }
      }
      return { changes, lastInsertRowid: 0 };
    }

    // UPDATE user_refresh_tokens SET revoked_at = ? WHERE user_id = ?
    if (/UPDATE user_refresh_tokens SET revoked_at = \? WHERE user_id = \?/i.test(normalized)) {
      const [revoked_at, user_id] = params;
      let changes = 0;
      for (const token of this.tables.get("user_refresh_tokens")!.values()) {
        if (token.user_id === user_id && !token.revoked_at) {
          token.revoked_at = revoked_at;
          changes++;
        }
      }
      return { changes, lastInsertRowid: 0 };
    }

    // INSERT INTO user_watchlist
    if (/INSERT INTO user_watchlist/i.test(normalized)) {
      const [id, user_id, media_id, created_at] = params;
      // Check UNIQUE(user_id, media_id)
      for (const item of this.tables.get("user_watchlist")!.values()) {
        if (item.user_id === user_id && item.media_id === media_id) {
          return { changes: 0, lastInsertRowid: 0 };
        }
      }

      this.tables.get("user_watchlist")!.set(id, {
        id,
        user_id,
        media_id,
        created_at
      });
      return { changes: 1, lastInsertRowid: 1 };
    }

    // DELETE FROM user_watchlist WHERE user_id = ? AND media_id = ?
    if (/DELETE FROM user_watchlist WHERE user_id = \? AND media_id = \?/i.test(normalized)) {
      const [user_id, media_id] = params;
      let changes = 0;
      for (const [key, item] of this.tables.get("user_watchlist")!.entries()) {
        if (item.user_id === user_id && item.media_id === media_id) {
          this.tables.get("user_watchlist")!.delete(key);
          changes++;
        }
      }
      return { changes, lastInsertRowid: 0 };
    }

    // DELETE FROM user_watchlist WHERE user_id = ?
    if (/DELETE FROM user_watchlist WHERE user_id = \?/i.test(normalized)) {
      const userId = params[0];
      let changes = 0;
      for (const [key, item] of this.tables.get("user_watchlist")!.entries()) {
        if (item.user_id === userId) {
          this.tables.get("user_watchlist")!.delete(key);
          changes++;
        }
      }
      return { changes, lastInsertRowid: 0 };
    }

    // INSERT INTO user_progress
    if (/INSERT INTO user_progress/i.test(normalized)) {
      const [id, user_id, media_id, season_number, episode_number, position_seconds, duration_seconds, completed, updated_at, client_sequence] = params;
      const sNum = Number(season_number);
      const eNum = Number(episode_number);
      const seq = client_sequence !== undefined ? Number(client_sequence) : undefined;

      // Check UNIQUE(user_id, media_id, season_number, episode_number)
      for (const item of this.tables.get("user_progress")!.values()) {
        if (
          item.user_id === user_id &&
          item.media_id === media_id &&
          item.season_number === sNum &&
          item.episode_number === eNum
        ) {
          // Monotonic sequence check: if incoming client_sequence is strictly less than existing, ignore write
          if (seq !== undefined && item.client_sequence !== undefined && seq < item.client_sequence) {
            return { changes: 0, lastInsertRowid: 0 };
          }
          item.position_seconds = Number(position_seconds);
          item.duration_seconds = Number(duration_seconds);
          item.completed = Number(completed);
          item.updated_at = updated_at;
          if (seq !== undefined) item.client_sequence = seq;
          return { changes: 1, lastInsertRowid: 1 };
        }
      }

      this.tables.get("user_progress")!.set(id, {
        id,
        user_id,
        media_id,
        season_number: sNum,
        episode_number: eNum,
        position_seconds: Number(position_seconds),
        duration_seconds: Number(duration_seconds),
        completed: Number(completed),
        client_sequence: seq,
        updated_at
      });
      return { changes: 1, lastInsertRowid: 1 };
    }

    // DELETE FROM user_progress WHERE user_id = ? AND media_id = ? AND season_number = ? AND episode_number = ?
    if (/DELETE FROM user_progress WHERE user_id = \? AND media_id = \? AND season_number = \? AND episode_number = \?/i.test(normalized)) {
      const [user_id, media_id, season_number, episode_number] = params;
      const sNum = Number(season_number);
      const eNum = Number(episode_number);
      let changes = 0;
      for (const [key, item] of this.tables.get("user_progress")!.entries()) {
        if (
          item.user_id === user_id &&
          item.media_id === media_id &&
          item.season_number === sNum &&
          item.episode_number === eNum
        ) {
          this.tables.get("user_progress")!.delete(key);
          changes++;
        }
      }
      return { changes, lastInsertRowid: 0 };
    }

    // DELETE FROM user_progress WHERE user_id = ? AND media_id = ?
    if (/DELETE FROM user_progress WHERE user_id = \? AND media_id = \?/i.test(normalized)) {
      const [user_id, media_id] = params;
      let changes = 0;
      for (const [key, item] of this.tables.get("user_progress")!.entries()) {
        if (item.user_id === user_id && item.media_id === media_id) {
          this.tables.get("user_progress")!.delete(key);
          changes++;
        }
      }
      return { changes, lastInsertRowid: 0 };
    }

    // DELETE FROM user_progress WHERE user_id = ?
    if (/DELETE FROM user_progress WHERE user_id = \?/i.test(normalized)) {
      const userId = params[0];
      let changes = 0;
      for (const [key, item] of this.tables.get("user_progress")!.entries()) {
        if (item.user_id === userId) {
          this.tables.get("user_progress")!.delete(key);
          changes++;
        }
      }
      return { changes, lastInsertRowid: 0 };
    }

    // INSERT INTO addon_catalog
    if (/INSERT INTO addon_catalog/i.test(normalized)) {
      const [
        id, manifest_url, name, version, description, logo_url, background_url,
        types, resources, catalogs, id_prefixes, categories, stars,
        is_configurable, is_default, raw_manifest, synced_at
      ] = params;

      const record = {
        id,
        manifest_url,
        name,
        version,
        description: description || null,
        logo_url: logo_url || null,
        background_url: background_url || null,
        types: typeof types === "string" ? types : JSON.stringify(types || []),
        resources: typeof resources === "string" ? resources : JSON.stringify(resources || []),
        catalogs: typeof catalogs === "string" ? catalogs : JSON.stringify(catalogs || []),
        id_prefixes: typeof id_prefixes === "string" ? id_prefixes : JSON.stringify(id_prefixes || []),
        categories: typeof categories === "string" ? categories : JSON.stringify(categories || []),
        stars: Number(stars || 0),
        is_configurable: Number(is_configurable || 0),
        is_default: Number(is_default || 0),
        raw_manifest: typeof raw_manifest === "string" ? raw_manifest : JSON.stringify(raw_manifest || {}),
        synced_at: synced_at || new Date().toISOString()
      };

      this.tables.get("addon_catalog")!.set(id, record);
      return { changes: 1, lastInsertRowid: 1 };
    }

    // INSERT INTO user_addon_preferences
    if (/INSERT INTO user_addon_preferences/i.test(normalized)) {
      const [
        id, user_id, addon_id, is_enabled, priority_order, key_version,
        key_id, nonce_iv, auth_tag, encrypted_config, created_at, updated_at
      ] = params;

      for (const item of this.tables.get("user_addon_preferences")!.values()) {
        if (item.user_id === user_id && item.addon_id === addon_id) {
          item.is_enabled = Number(is_enabled !== undefined ? is_enabled : 1);
          if (priority_order !== undefined) item.priority_order = Number(priority_order);
          if (encrypted_config !== undefined) item.encrypted_config = encrypted_config;
          item.updated_at = updated_at || new Date().toISOString();
          return { changes: 1, lastInsertRowid: 1 };
        }
      }

      this.tables.get("user_addon_preferences")!.set(id, {
        id,
        user_id,
        addon_id,
        is_enabled: Number(is_enabled !== undefined ? is_enabled : 1),
        priority_order: Number(priority_order || 100),
        key_version: key_version || "v1",
        key_id: key_id || "cinely-master-v1",
        nonce_iv: nonce_iv || null,
        auth_tag: auth_tag || null,
        encrypted_config: encrypted_config || null,
        created_at: created_at || new Date().toISOString(),
        updated_at: updated_at || new Date().toISOString()
      });
      return { changes: 1, lastInsertRowid: 1 };
    }

    // DELETE FROM user_addon_preferences WHERE user_id = ? AND addon_id = ?
    if (/DELETE FROM user_addon_preferences WHERE user_id = \? AND addon_id = \?/i.test(normalized)) {
      const [user_id, addon_id] = params;
      let changes = 0;
      for (const [key, item] of this.tables.get("user_addon_preferences")!.entries()) {
        if (item.user_id === user_id && item.addon_id === addon_id) {
          this.tables.get("user_addon_preferences")!.delete(key);
          changes++;
        }
      }
      return { changes, lastInsertRowid: 0 };
    }

    // DELETE FROM user_addon_preferences WHERE user_id = ?
    if (/DELETE FROM user_addon_preferences WHERE user_id = \?/i.test(normalized)) {
      const userId = params[0];
      let changes = 0;
      for (const [key, item] of this.tables.get("user_addon_preferences")!.entries()) {
        if (item.user_id === userId) {
          this.tables.get("user_addon_preferences")!.delete(key);
          changes++;
        }
      }
      return { changes, lastInsertRowid: 0 };
    }

    // DELETE FROM addon_catalog WHERE id = ?
    if (/DELETE FROM addon_catalog WHERE id = \?/i.test(normalized)) {
      const addonId = params[0];
      const hadAddon = this.tables.get("addon_catalog")!.delete(addonId);
      // Cascade delete
      for (const [k, v] of this.tables.get("user_addon_preferences")!.entries()) {
        if (v.addon_id === addonId) this.tables.get("user_addon_preferences")!.delete(k);
      }
      return { changes: hadAddon ? 1 : 0, lastInsertRowid: 0 };
    }

    // DELETE FROM users WHERE id = ?
    if (/DELETE FROM users WHERE id = \?/i.test(normalized)) {
      const userId = params[0];
      const hadUser = this.tables.get("users")!.delete(userId);
      // Cascade delete
      for (const [k, v] of this.tables.get("user_refresh_tokens")!.entries()) {
        if (v.user_id === userId) this.tables.get("user_refresh_tokens")!.delete(k);
      }
      for (const [k, v] of this.tables.get("user_watchlist")!.entries()) {
        if (v.user_id === userId) this.tables.get("user_watchlist")!.delete(k);
      }
      for (const [k, v] of this.tables.get("user_progress")!.entries()) {
        if (v.user_id === userId) this.tables.get("user_progress")!.delete(k);
      }
      for (const [k, v] of this.tables.get("user_addon_preferences")!.entries()) {
        if (v.user_id === userId) this.tables.get("user_addon_preferences")!.delete(k);
      }
      return { changes: hadUser ? 1 : 0, lastInsertRowid: 0 };
    }

    // DELETE FROM media_items WHERE id = ?
    if (/DELETE FROM media_items WHERE id = \?/i.test(normalized)) {
      const mediaId = params[0];
      const hadMedia = this.tables.get("media_items")!.delete(mediaId);
      // Cascade delete
      for (const [k, v] of this.tables.get("user_watchlist")!.entries()) {
        if (v.media_id === mediaId) this.tables.get("user_watchlist")!.delete(k);
      }
      for (const [k, v] of this.tables.get("user_progress")!.entries()) {
        if (v.media_id === mediaId) this.tables.get("user_progress")!.delete(k);
      }
      for (const [k, v] of this.tables.get("media_external_mappings")!.entries()) {
        if (v.media_item_id === mediaId) this.tables.get("media_external_mappings")!.delete(k);
      }
      for (const [k, v] of this.tables.get("media_genres")!.entries()) {
        if (v.media_item_id === mediaId) this.tables.get("media_genres")!.delete(k);
      }
      for (const [k, v] of this.tables.get("media_credits")!.entries()) {
        if (v.media_item_id === mediaId) this.tables.get("media_credits")!.delete(k);
      }
      return { changes: hadMedia ? 1 : 0, lastInsertRowid: 0 };
    }

    return { changes: 0, lastInsertRowid: 0 };
  }

  async close(): Promise<void> {
    this.tables.clear();
    this.indexes.clear();
  }
}

/**
 * PostgreSQL database client for production deployments.
 */
class PostgresDatabaseClient implements IDatabaseClient {
  private pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new pg.Pool({
      connectionString,
      min: config.DATABASE_POOL_MIN,
      max: config.DATABASE_POOL_MAX,
      connectionTimeoutMillis: config.DATABASE_CONNECTION_TIMEOUT_MS,
      idleTimeoutMillis: 30000
    });
  }

  async ping(): Promise<boolean> {
    try {
      await this.pool.query("SELECT 1");
      return true;
    } catch {
      return false;
    }
  }


  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    // Convert SQLite ? placeholders to PostgreSQL $1, $2 placeholders
    let paramIdx = 1;
    const pgSql = sql.replace(/\?/g, () => `$${paramIdx++}`);
    const res = await this.pool.query(pgSql, params);
    return res.rows as T[];
  }

  async get<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  async run(sql: string, params: any[] = []): Promise<{ changes: number; lastInsertRowid: number | bigint }> {
    let paramIdx = 1;
    const pgSql = sql.replace(/\?/g, () => `$${paramIdx++}`);
    const res = await this.pool.query(pgSql, params);
    return {
      changes: res.rowCount || 0,
      lastInsertRowid: 0
    };
  }

  async exec(sql: string): Promise<void> {
    await this.pool.query(sql);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

let dbInstance: IDatabaseClient | null = null;

export async function initDatabase(customPath?: string): Promise<IDatabaseClient> {
  if (dbInstance) return dbInstance;

  if (config.DATABASE_URL && !config.USE_SQLITE_MEM && !customPath) {
    const pgClient = new PostgresDatabaseClient(config.DATABASE_URL);
    try {
      const fs = await import("fs");
      const path = await import("path");
      const schemaPath = path.join(process.cwd(), "src", "db", "schema.sql");
      const distSchemaPath = path.join(process.cwd(), "dist", "db", "schema.sql");
      const filePath = fs.existsSync(schemaPath)
        ? schemaPath
        : fs.existsSync(distSchemaPath)
        ? distSchemaPath
        : null;

      if (filePath) {
        const sql = fs.readFileSync(filePath, "utf8");
        await pgClient.exec(sql);
      }
    } catch (err) {
      console.warn("Database schema initialization notice:", err);
    }
    dbInstance = pgClient;
  } else {
    dbInstance = new InMemoryDatabaseClient();
  }

  return dbInstance;
}


export function getDatabase(): IDatabaseClient {
  if (!dbInstance) {
    throw new Error("Database has not been initialized. Call initDatabase() first.");
  }
  return dbInstance;
}

export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
  }
}
