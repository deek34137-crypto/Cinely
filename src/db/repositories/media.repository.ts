import { getDatabase } from "../index.js";
import {
  NormalizedMediaSummary,
  NormalizedMediaDetail,
  NormalizedSeasonDetail,
  NormalizedEpisode,
  MediaKind,
  ExternalIds
} from "../../core/types/media.js";
import { normalizeTitle, stringSimilarity } from "../../core/utils/fuzzy.js";
import crypto from "crypto";

export class MediaRepository {
  /**
   * Upserts a canonical media item, its external mappings, genres, and credits.
   */
  async upsertMediaItem(item: NormalizedMediaDetail): Promise<void> {
    const db = getDatabase();
    const now = new Date().toISOString();

    // 1. Upsert media_items table
    await db.run(
      `INSERT INTO media_items (
        id, media_kind, original_title, default_title, overview, tagline,
        release_date, release_year, runtime_minutes, certification,
        poster_url, backdrop_url, trailer_url, rating, popularity_score, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        original_title = excluded.original_title,
        default_title = excluded.default_title,
        overview = COALESCE(excluded.overview, media_items.overview),
        tagline = COALESCE(excluded.tagline, media_items.tagline),
        release_date = COALESCE(excluded.release_date, media_items.release_date),
        release_year = COALESCE(excluded.release_year, media_items.release_year),
        runtime_minutes = COALESCE(excluded.runtime_minutes, media_items.runtime_minutes),
        certification = COALESCE(excluded.certification, media_items.certification),
        poster_url = COALESCE(excluded.poster_url, media_items.poster_url),
        backdrop_url = COALESCE(excluded.backdrop_url, media_items.backdrop_url),
        trailer_url = COALESCE(excluded.trailer_url, media_items.trailer_url),
        rating = COALESCE(excluded.rating, media_items.rating),
        popularity_score = COALESCE(excluded.popularity_score, media_items.popularity_score),
        updated_at = excluded.updated_at`,
      [
        item.id,
        item.mediaKind,
        item.originalTitle,
        item.defaultTitle,
        item.overview,
        item.tagline || null,
        item.releaseDate || null,
        item.releaseYear || null,
        item.runtimeMinutes || null,
        item.certification || null,
        item.artwork.posterUrl || null,
        item.artwork.backdropUrl || null,
        item.trailerUrl || null,
        item.rating || null,
        item.popularityScore || 0,
        now
      ]
    );

    // 2. Upsert external mappings
    const mappings: Array<{ provider: string; externalId: string }> = [];
    if (item.externalIds.imdbId) mappings.push({ provider: "imdb", externalId: item.externalIds.imdbId });
    if (item.externalIds.tmdbId) mappings.push({ provider: "tmdb", externalId: item.externalIds.tmdbId });
    if (item.externalIds.tvmazeId) mappings.push({ provider: "tvmaze", externalId: item.externalIds.tvmazeId });
    if (item.externalIds.kitsuId) mappings.push({ provider: "kitsu", externalId: item.externalIds.kitsuId });

    for (const m of mappings) {
      const mappingId = `map_${crypto.createHash("sha256").update(`${m.provider}:${m.externalId}`).digest("hex").slice(0, 16)}`;
      await db.run(
        `INSERT INTO media_external_mappings (id, media_item_id, provider_name, external_id, last_synced_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(provider_name, external_id) DO UPDATE SET
           media_item_id = excluded.media_item_id,
           last_synced_at = excluded.last_synced_at`,
        [mappingId, item.id, m.provider, m.externalId, now]
      );
    }

    // 3. Upsert genres
    if (item.genres && item.genres.length > 0) {
      for (const genre of item.genres) {
        await db.run(
          `INSERT OR IGNORE INTO media_genres (media_item_id, genre) VALUES (?, ?)`,
          [item.id, genre]
        );
      }
    }

    // 4. Upsert credits
    const allCredits = [
      ...(item.directors || []).map((p, idx) => ({ ...p, role: "director", order: idx })),
      ...(item.writers || []).map((p, idx) => ({ ...p, role: "writer", order: idx })),
      ...(item.cast || []).map((p, idx) => ({ ...p, role: "cast", order: idx }))
    ];

    for (const c of allCredits) {
      const creditId = `cred_${crypto.createHash("sha256").update(`${item.id}:${c.role}:${c.name}:${c.character || ""}`).digest("hex").slice(0, 16)}`;
      await db.run(
        `INSERT OR REPLACE INTO media_credits (id, media_item_id, name, role, character_name, profile_url, order_index)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [creditId, item.id, c.name, c.role, c.character || null, c.profileUrl || null, c.order]
      );
    }
  }

  /**
   * Retrieves a canonical media detail item by its Canonical ID.
   */
  async findById(canonicalId: string): Promise<NormalizedMediaDetail | null> {
    const db = getDatabase();

    const row = await db.get(
      `SELECT * FROM media_items WHERE id = ?`,
      [canonicalId]
    );

    if (!row) return null;

    // Load mappings
    const mappings = await db.query<{ provider_name: string; external_id: string }>(
      `SELECT provider_name, external_id FROM media_external_mappings WHERE media_item_id = ?`,
      [canonicalId]
    );
    const externalIds: ExternalIds = {};
    for (const m of mappings) {
      if (m.provider_name === "imdb") externalIds.imdbId = m.external_id;
      if (m.provider_name === "tmdb") externalIds.tmdbId = m.external_id;
      if (m.provider_name === "tvmaze") externalIds.tvmazeId = m.external_id;
      if (m.provider_name === "kitsu") externalIds.kitsuId = m.external_id;
    }

    // Load genres
    const genresRows = await db.query<{ genre: string }>(
      `SELECT genre FROM media_genres WHERE media_item_id = ?`,
      [canonicalId]
    );
    const genres = genresRows.map(g => g.genre);

    // Load credits
    const creditsRows = await db.query<{ name: string; role: string; character_name: string | null; profile_url: string | null }>(
      `SELECT name, role, character_name, profile_url FROM media_credits WHERE media_item_id = ? ORDER BY order_index ASC`,
      [canonicalId]
    );

    const directors = creditsRows.filter(c => c.role === "director").map(c => ({ name: c.name, role: "Director", profileUrl: c.profile_url }));
    const writers = creditsRows.filter(c => c.role === "writer").map(c => ({ name: c.name, role: "Writer", profileUrl: c.profile_url }));
    const cast = creditsRows.filter(c => c.role === "cast").map(c => ({ name: c.name, character: c.character_name || undefined, profileUrl: c.profile_url }));

    // Count seasons and episodes if series
    let seasonsCount = 0;
    let episodesCount = 0;
    if (row.media_kind === "series") {
      const sCount = await db.get<{ count: number }>(`SELECT COUNT(*) as count FROM seasons WHERE series_id = ?`, [canonicalId]);
      const eCount = await db.get<{ count: number }>(`SELECT COUNT(*) as count FROM episodes WHERE series_id = ?`, [canonicalId]);
      seasonsCount = sCount?.count || 0;
      episodesCount = eCount?.count || 0;
    }

    return {
      id: row.id,
      mediaKind: row.media_kind as MediaKind,
      originalTitle: row.original_title,
      defaultTitle: row.default_title,
      overview: row.overview,
      tagline: row.tagline,
      releaseDate: row.release_date,
      releaseYear: row.release_year,
      runtimeMinutes: row.runtime_minutes,
      certification: row.certification,
      genres,
      artwork: {
        posterUrl: row.poster_url,
        backdropUrl: row.backdrop_url,
        logoUrl: null,
        bannerUrl: null,
        thumbnailUrl: row.poster_url
      },
      trailerUrl: row.trailer_url,
      externalIds,
      rating: row.rating,
      popularityScore: row.popularity_score,
      directors,
      writers,
      cast,
      seasonsCount,
      episodesCount,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Finds a canonical media ID given an external provider ID (e.g. provider="imdb", id="tt1492048").
   */
  async findByExternalId(provider: string, externalId: string): Promise<string | null> {
    const db = getDatabase();
    const row = await db.get<{ media_item_id: string }>(
      `SELECT media_item_id FROM media_external_mappings WHERE provider_name = ? AND external_id = ?`,
      [provider, externalId]
    );
    return row?.media_item_id || null;
  }

  /**
   * Fuzzy search across media titles.
   */
  async search(query: string, options: { kind?: MediaKind; limit?: number } = {}): Promise<NormalizedMediaSummary[]> {
    const db = getDatabase();
    const limit = options.limit || 20;

    let sql = `SELECT * FROM media_items`;
    const params: any[] = [];

    if (options.kind) {
      sql += ` WHERE media_kind = ?`;
      params.push(options.kind);
    }

    sql += ` ORDER BY popularity_score DESC, rating DESC LIMIT 100`;

    const candidates = await db.query<any>(sql, params);
    const normalizedQuery = normalizeTitle(query);

    // Compute similarity scores
    const scored = candidates.map(item => {
      const normDefault = normalizeTitle(item.default_title);
      const normOriginal = normalizeTitle(item.original_title);

      const exactMatch = normDefault.includes(normalizedQuery) || normOriginal.includes(normalizedQuery);
      const simScore = Math.max(
        stringSimilarity(normalizedQuery, normDefault),
        stringSimilarity(normalizedQuery, normOriginal)
      );

      const finalScore = exactMatch ? simScore + 1.0 : simScore;
      return { item, score: finalScore };
    });

    // Filter and sort by score
    scored.sort((a, b) => b.score - a.score);
    const topItems = scored.filter(s => s.score > 0.15).slice(0, limit).map(s => s.item);

    const summaries: NormalizedMediaSummary[] = [];
    for (const row of topItems) {
      const mappings = await db.query<{ provider_name: string; external_id: string }>(
        `SELECT provider_name, external_id FROM media_external_mappings WHERE media_item_id = ?`,
        [row.id]
      );
      const externalIds: ExternalIds = {};
      for (const m of mappings) {
        if (m.provider_name === "imdb") externalIds.imdbId = m.external_id;
        if (m.provider_name === "tmdb") externalIds.tmdbId = m.external_id;
        if (m.provider_name === "tvmaze") externalIds.tvmazeId = m.external_id;
      }

      const genresRows = await db.query<{ genre: string }>(
        `SELECT genre FROM media_genres WHERE media_item_id = ?`,
        [row.id]
      );

      summaries.push({
        canonicalId: row.id,
        mediaKind: row.media_kind as MediaKind,
        title: row.default_title,
        releaseYear: row.release_year,
        posterUrl: row.poster_url,
        backdropUrl: row.backdrop_url,
        rating: row.rating,
        overview: row.overview,
        genres: genresRows.map(g => g.genre),
        externalIds
      });
    }

    return summaries;
  }

  /**
   * Retrieves discovery lists (trending, popular, top rated).
   */
  async getDiscoverList(options: { kind?: MediaKind; genre?: string; limit?: number; offset?: number } = {}): Promise<NormalizedMediaSummary[]> {
    const db = getDatabase();
    const limit = options.limit || 20;
    const offset = options.offset || 0;

    let sql = `
      SELECT DISTINCT m.* FROM media_items m
    `;
    const whereClauses: string[] = [];
    const params: any[] = [];

    if (options.genre) {
      sql += ` INNER JOIN media_genres g ON m.id = g.media_item_id`;
      whereClauses.push(`g.genre = ?`);
      params.push(options.genre);
    }

    if (options.kind) {
      whereClauses.push(`m.media_kind = ?`);
      params.push(options.kind);
    }

    if (whereClauses.length > 0) {
      sql += ` WHERE ` + whereClauses.join(" AND ");
    }

    sql += ` ORDER BY m.popularity_score DESC, m.rating DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const rows = await db.query<any>(sql, params);
    const summaries: NormalizedMediaSummary[] = [];

    for (const row of rows) {
      const mappings = await db.query<{ provider_name: string; external_id: string }>(
        `SELECT provider_name, external_id FROM media_external_mappings WHERE media_item_id = ?`,
        [row.id]
      );
      const externalIds: ExternalIds = {};
      for (const m of mappings) {
        if (m.provider_name === "imdb") externalIds.imdbId = m.external_id;
        if (m.provider_name === "tmdb") externalIds.tmdbId = m.external_id;
        if (m.provider_name === "tvmaze") externalIds.tvmazeId = m.external_id;
      }

      const genresRows = await db.query<{ genre: string }>(
        `SELECT genre FROM media_genres WHERE media_item_id = ?`,
        [row.id]
      );

      summaries.push({
        canonicalId: row.id,
        mediaKind: row.media_kind as MediaKind,
        title: row.default_title,
        releaseYear: row.release_year,
        posterUrl: row.poster_url,
        backdropUrl: row.backdrop_url,
        rating: row.rating,
        overview: row.overview,
        genres: genresRows.map(g => g.genre),
        externalIds
      });
    }

    return summaries;
  }

  /**
   * Upserts seasons and episodes for a TV series.
   */
  async upsertSeasons(seasons: NormalizedSeasonDetail[]): Promise<void> {
    const db = getDatabase();

    for (const season of seasons) {
      await db.run(
        `INSERT INTO seasons (id, series_id, season_number, title, overview, poster_url, air_date, episode_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(series_id, season_number) DO UPDATE SET
           title = excluded.title,
           overview = excluded.overview,
           poster_url = excluded.poster_url,
           air_date = excluded.air_date,
           episode_count = excluded.episode_count`,
        [
          season.id,
          season.seriesId,
          season.seasonNumber,
          season.title,
          season.overview || null,
          season.posterUrl || null,
          season.airDate || null,
          season.episodes.length
        ]
      );

      for (const ep of season.episodes) {
        await db.run(
          `INSERT INTO episodes (id, season_id, series_id, episode_number, title, overview, still_url, air_date, runtime_minutes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(season_id, episode_number) DO UPDATE SET
             title = excluded.title,
             overview = excluded.overview,
             still_url = excluded.still_url,
             air_date = excluded.air_date,
             runtime_minutes = excluded.runtime_minutes`,
          [
            ep.id,
            season.id,
            season.seriesId,
            ep.episodeNumber,
            ep.title,
            ep.overview,
            ep.stillUrl || null,
            ep.airDate || null,
            ep.runtimeMinutes || null
          ]
        );
      }
    }
  }

  /**
   * Retrieves season details with episodes.
   */
  async getSeasonDetail(seriesId: string, seasonNumber: number): Promise<NormalizedSeasonDetail | null> {
    const db = getDatabase();

    const seasonRow = await db.get(
      `SELECT * FROM seasons WHERE series_id = ? AND season_number = ?`,
      [seriesId, seasonNumber]
    );

    if (!seasonRow) return null;

    const episodesRows = await db.query(
      `SELECT * FROM episodes WHERE season_id = ? ORDER BY episode_number ASC`,
      [seasonRow.id]
    );

    const episodes: NormalizedEpisode[] = episodesRows.map(ep => ({
      id: ep.id,
      seriesId,
      seasonNumber,
      episodeNumber: ep.episode_number,
      title: ep.title,
      overview: ep.overview,
      stillUrl: ep.still_url,
      airDate: ep.air_date,
      runtimeMinutes: ep.runtime_minutes,
      externalIds: {}
    }));

    return {
      id: seasonRow.id,
      seriesId,
      seasonNumber: seasonRow.season_number,
      title: seasonRow.title,
      overview: seasonRow.overview,
      posterUrl: seasonRow.poster_url,
      airDate: seasonRow.air_date,
      episodes
    };
  }
}
