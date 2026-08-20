import { MediaRepository } from "../../db/repositories/media.repository.js";
import { MetadataNormalizerEngine } from "../../core/normalizer/metadata-normalizer.js";
import {
  NormalizedMediaSummary,
  NormalizedMediaDetail,
  NormalizedSeasonDetail,
  MediaKind
} from "../../core/types/media.js";
import { NotFoundError } from "../../core/types/errors.js";

export interface DiscoverSectionsResponse {
  sections: Array<{
    id: string;
    title: string;
    items: NormalizedMediaSummary[];
  }>;
  total: number;
}

export class DiscoveryService {
  private mediaRepo: MediaRepository;
  private normalizer: MetadataNormalizerEngine;

  constructor(mediaRepo?: MediaRepository, normalizer?: MetadataNormalizerEngine) {
    this.mediaRepo = mediaRepo || new MediaRepository();
    this.normalizer = normalizer || new MetadataNormalizerEngine(this.mediaRepo);
  }

  getNormalizer(): MetadataNormalizerEngine {
    return this.normalizer;
  }

  /**
   * Search canonical catalog with fuzzy matching.
   */
  async search(query: string, kind?: MediaKind, limit: number = 20): Promise<NormalizedMediaSummary[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }
    return this.mediaRepo.search(query.trim(), { kind, limit });
  }

  /**
   * Get curated discovery rows (Trending, Popular Movies, Top Series, Sci-Fi, Action, etc.).
   */
  async getDiscoverSections(options: { kind?: MediaKind; genre?: string; limit?: number } = {}): Promise<DiscoverSectionsResponse> {
    const limit = options.limit || 10;

    const [allTrending, topMovies, topSeries, sciFi, action] = await Promise.all([
      this.mediaRepo.getDiscoverList({ kind: options.kind, genre: options.genre, limit }),
      this.mediaRepo.getDiscoverList({ kind: "movie", limit }),
      this.mediaRepo.getDiscoverList({ kind: "series", limit }),
      this.mediaRepo.getDiscoverList({ genre: "Sci-Fi", limit }),
      this.mediaRepo.getDiscoverList({ genre: "Action", limit })
    ]);

    const sections = [];

    if (allTrending.length > 0) {
      sections.push({ id: "trending_now", title: "Trending Worldwide", items: allTrending });
    }
    if (topMovies.length > 0 && options.kind !== "series") {
      sections.push({ id: "popular_movies", title: "Popular Movies", items: topMovies });
    }
    if (topSeries.length > 0 && options.kind !== "movie") {
      sections.push({ id: "top_series", title: "Top Rated Series", items: topSeries });
    }
    if (sciFi.length > 0) {
      sections.push({ id: "genre_scifi", title: "Sci-Fi & Fantasy", items: sciFi });
    }
    if (action.length > 0) {
      sections.push({ id: "genre_action", title: "Action & Adventure", items: action });
    }

    const total = sections.reduce((acc, s) => acc + s.items.length, 0);
    return { sections, total };
  }

  /**
   * Get canonical media details by canonical ID or external ID.
   */
  async getMediaDetail(idOrExternalId: string): Promise<NormalizedMediaDetail> {
    // If it's already a canonical ID
    let canonicalId = idOrExternalId;

    if (!canonicalId.startsWith("cinely:item:")) {
      // Check if it's an IMDb ID or TMDB ID
      if (idOrExternalId.startsWith("tt")) {
        const found = await this.mediaRepo.findByExternalId("imdb", idOrExternalId);
        if (found) canonicalId = found;
      } else if (idOrExternalId.startsWith("tmdb:")) {
        const tmdbId = idOrExternalId.replace("tmdb:", "");
        const found = await this.mediaRepo.findByExternalId("tmdb", tmdbId);
        if (found) canonicalId = found;
      }
    }

    const item = await this.mediaRepo.findById(canonicalId);
    if (!item) {
      throw new NotFoundError("MediaItem", idOrExternalId);
    }

    return item;
  }

  /**
   * Get season breakdown with episodes for TV series.
   */
  async getSeasonDetail(seriesId: string, seasonNumber: number): Promise<NormalizedSeasonDetail> {
    // Verify series exists
    await this.getMediaDetail(seriesId);

    const season = await this.mediaRepo.getSeasonDetail(seriesId, seasonNumber);
    if (!season) {
      throw new NotFoundError(`Season ${seasonNumber} for Series`, seriesId);
    }

    return season;
  }
}
