import {
  NormalizedMediaDetail,
  NormalizedMediaSummary,
  ExternalIds,
  ArtworkSet,
  MediaKind
} from "../types/media.js";
import { generateCanonicalId } from "../utils/id.js";
import { MediaRepository } from "../../db/repositories/media.repository.js";

export class MetadataNormalizerEngine {
  private mediaRepo: MediaRepository;

  constructor(mediaRepo?: MediaRepository) {
    this.mediaRepo = mediaRepo || new MediaRepository();
  }

  /**
   * Reconciles two metadata representations of the same title (e.g. TMDB + TVMaze),
   * producing a single deterministic Canonical NormalizedMediaDetail.
   */
  reconcile(primary: NormalizedMediaDetail, secondary?: Partial<NormalizedMediaDetail>): NormalizedMediaDetail {
    if (!secondary) return primary;

    // Merge external IDs
    const externalIds: ExternalIds = {
      ...primary.externalIds,
      ...secondary.externalIds
    };

    // Determine authoritative canonical ID
    // Priority: IMDb ID -> TMDB ID -> TVMaze ID
    const primaryId = externalIds.imdbId || (externalIds.tmdbId ? `tmdb:${externalIds.tmdbId}` : primary.id);
    const canonicalId = generateCanonicalId(primary.mediaKind, primaryId);

    // Merge artwork
    const artwork: ArtworkSet = {
      posterUrl: primary.artwork.posterUrl || secondary.artwork?.posterUrl || null,
      backdropUrl: primary.artwork.backdropUrl || secondary.artwork?.backdropUrl || null,
      logoUrl: primary.artwork.logoUrl || secondary.artwork?.logoUrl || null,
      bannerUrl: primary.artwork.bannerUrl || secondary.artwork?.bannerUrl || null,
      thumbnailUrl: primary.artwork.thumbnailUrl || secondary.artwork?.thumbnailUrl || null
    };

    // Merge genres
    const genreSet = new Set([...primary.genres, ...(secondary.genres || [])]);

    // Merge credits
    const directors = primary.directors.length > 0 ? primary.directors : (secondary.directors || []);
    const writers = primary.writers.length > 0 ? primary.writers : (secondary.writers || []);
    const cast = primary.cast.length > 0 ? primary.cast : (secondary.cast || []);

    return {
      id: canonicalId,
      mediaKind: primary.mediaKind || (secondary.mediaKind as MediaKind) || "movie",
      originalTitle: primary.originalTitle || secondary.originalTitle || primary.defaultTitle,
      defaultTitle: primary.defaultTitle || secondary.defaultTitle || primary.originalTitle,
      overview: primary.overview || secondary.overview || null,
      tagline: primary.tagline || secondary.tagline || null,
      releaseDate: primary.releaseDate || secondary.releaseDate || null,
      releaseYear: primary.releaseYear || secondary.releaseYear || null,
      runtimeMinutes: primary.runtimeMinutes || secondary.runtimeMinutes || null,
      certification: primary.certification || secondary.certification || null,
      genres: Array.from(genreSet),
      artwork,
      trailerUrl: primary.trailerUrl || secondary.trailerUrl || null,
      externalIds,
      rating: primary.rating || secondary.rating || null,
      popularityScore: Math.max(primary.popularityScore || 0, secondary.popularityScore || 0),
      directors,
      writers,
      cast,
      seasonsCount: primary.seasonsCount || secondary.seasonsCount || 0,
      episodesCount: primary.episodesCount || secondary.episodesCount || 0,
      createdAt: primary.createdAt,
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Ingests, reconciles, and stores a normalized media detail into the canonical repository.
   */
  async ingestMediaDetail(detail: NormalizedMediaDetail): Promise<NormalizedMediaDetail> {
    // Check if item already exists by external ID
    let existingId: string | null = null;
    if (detail.externalIds.imdbId) {
      existingId = await this.mediaRepo.findByExternalId("imdb", detail.externalIds.imdbId);
    }
    if (!existingId && detail.externalIds.tmdbId) {
      existingId = await this.mediaRepo.findByExternalId("tmdb", detail.externalIds.tmdbId);
    }

    let finalItem = detail;
    if (existingId) {
      const existing = await this.mediaRepo.findById(existingId);
      if (existing) {
        finalItem = this.reconcile(existing, detail);
      }
    }

    await this.mediaRepo.upsertMediaItem(finalItem);
    return finalItem;
  }

  /**
   * Converts a Canonical NormalizedMediaDetail to a lightweight summary for catalog rows.
   */
  toSummary(detail: NormalizedMediaDetail): NormalizedMediaSummary {
    return {
      canonicalId: detail.id,
      mediaKind: detail.mediaKind,
      title: detail.defaultTitle,
      releaseYear: detail.releaseYear,
      posterUrl: detail.artwork.posterUrl,
      backdropUrl: detail.artwork.backdropUrl,
      rating: detail.rating,
      overview: detail.overview,
      genres: detail.genres,
      externalIds: detail.externalIds
    };
  }
}
