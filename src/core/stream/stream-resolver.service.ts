import crypto from 'crypto';
import { MediaRepository } from '../../db/repositories/media.repository.js';
import { AddonRepository } from '../../db/repositories/addon.repository.js';
import { NotFoundError, ValidationError } from '../types/errors.js';
import { StreamCandidate, MediaStreamsResponse } from '../types/stream.js';
import { AddonExecutionService, ExecutableAddon, sharedAddonExecutionService } from '../addons/addon-execution.service.js';
import { normalizeStremioStream } from '../normalizer/stream-normalizer.js';
import { rankStreams } from './stream-ranker.js';
import { LruCache } from '../utils/lru-cache.js';
import { Singleflight } from '../utils/singleflight.js';

export class StreamResolverService {
  private mediaRepo: MediaRepository;
  private addonRepo: AddonRepository;
  private addonExecutionService: AddonExecutionService;
  private cache: LruCache<MediaStreamsResponse>;
  private singleflight: Singleflight<MediaStreamsResponse>;
  private cacheTtlMs: number;

  constructor(options: {
    mediaRepo?: MediaRepository;
    addonRepo?: AddonRepository;
    addonExecutionService?: AddonExecutionService;
    cacheTtlMs?: number;
    cacheMaxSize?: number;
  } = {}) {
    this.mediaRepo = options.mediaRepo ?? new MediaRepository();
    this.addonRepo = options.addonRepo ?? new AddonRepository();
    this.addonExecutionService = options.addonExecutionService ?? sharedAddonExecutionService;

    this.cacheTtlMs = options.cacheTtlMs ?? 5 * 60 * 1000; // 5 minutes default
    this.cache = new LruCache<MediaStreamsResponse>({
      maxSize: options.cacheMaxSize ?? 500,
      defaultTtlMs: this.cacheTtlMs,
    });
    this.singleflight = new Singleflight<MediaStreamsResponse>();
  }

  /**
   * Clears in-memory stream resolution cache and singleflight tracker.
   */
  clearCache(): void {
    this.cache.clear();
    this.singleflight.clear();
  }

  /**
   * Returns provider health telemetry report from the addon execution layer.
   */
  getProviderHealth() {
    return this.addonExecutionService.getHealthReport();
  }

  /**
   * Resolves stream candidates for a canonical media ID and episode coordinates.
   * Concurrently deduplicated via Singleflight and cached in bounded LRU memory.
   */
  async resolveStreams(
    canonicalMediaId: string,
    options: {
      seasonNumber?: number;
      episodeNumber?: number;
      userId?: string;
    } = {}
  ): Promise<MediaStreamsResponse> {
    const seasonNumber = options.seasonNumber ?? 0;
    const episodeNumber = options.episodeNumber ?? 0;

    // 1. Validate numeric inputs
    if (seasonNumber < 0 || !Number.isInteger(seasonNumber)) {
      throw new ValidationError('seasonNumber must be a non-negative integer.');
    }
    if (episodeNumber < 0 || !Number.isInteger(episodeNumber)) {
      throw new ValidationError('episodeNumber must be a non-negative integer.');
    }

    // 2. Fetch canonical media metadata
    const media = await this.mediaRepo.findById(canonicalMediaId);
    if (!media) {
      throw new NotFoundError('MediaItem', canonicalMediaId);
    }

    // For TV series, if season/episode coordinates are omitted or 0, default to Season 1 Episode 1
    const effectiveSeason = media.mediaKind === 'series' && seasonNumber === 0 ? 1 : seasonNumber;
    const effectiveEpisode = media.mediaKind === 'series' && episodeNumber === 0 ? 1 : episodeNumber;

    // 3. Resolve external identifier for Stremio protocol (prefer IMDb, fallback to TMDB)
    const imdbId = media.externalIds.imdbId;
    const tmdbId = media.externalIds.tmdbId;

    if (!imdbId && !tmdbId) {
      return {
        mediaId: canonicalMediaId,
        seasonNumber: effectiveSeason,
        episodeNumber: effectiveEpisode,
        total: 0,
        streams: [],
      };
    }

    const targetId = imdbId || `tmdb:${tmdbId}`;

    // 4. Load enabled stream-capable addons
    let addonsToExecute: ExecutableAddon[] = [];

    if (options.userId) {
      const userAddons = await this.addonRepo.getUserAddons(options.userId);
      addonsToExecute = userAddons
        .filter((a) => a.userEnabled && a.enabled && a.capabilities.stream)
        .map((a) => ({
          id: a.id,
          name: a.name,
          manifestUrl: a.manifestUrl,
          priorityOrder: a.priorityOrder,
          configuration: a.userConfiguration,
        }));
    } else {
      const catalog = await this.addonRepo.getCatalog();
      addonsToExecute = catalog
        .filter((a) => a.enabled && a.capabilities.stream)
        .map((a, idx) => ({
          id: a.id,
          name: a.name,
          manifestUrl: a.manifestUrl,
          priorityOrder: idx + 1,
          configuration: undefined,
        }));
    }

    // If no stream addons are available/enabled, return empty list gracefully
    if (addonsToExecute.length === 0) {
      return {
        mediaId: canonicalMediaId,
        seasonNumber: effectiveSeason,
        episodeNumber: effectiveEpisode,
        total: 0,
        streams: [],
      };
    }

    // 5. Generate secure cache key (SHA-256 hash of normalized addon configs)
    // Ensures different addon configurations never share cached results without storing secrets
    const configHash = crypto
      .createHash('sha256')
      .update(
        JSON.stringify(
          addonsToExecute.map((a) => ({
            id: a.id,
            priority: a.priorityOrder,
            cfgHash: a.configuration
              ? crypto.createHash('sha256').update(JSON.stringify(a.configuration)).digest('hex')
              : null,
          }))
        )
      )
      .digest('hex')
      .slice(0, 16);

    const cacheKey = `stream:${canonicalMediaId}:${effectiveSeason}:${effectiveEpisode}:${configHash}`;

    // 6. Check LRU Cache
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // 7. Singleflight in-flight request deduplication
    return this.singleflight.do(cacheKey, async () => {
      // Re-check cache inside singleflight lock
      const doubleCheck = this.cache.get(cacheKey);
      if (doubleCheck) return doubleCheck;

      const coordinates = {
        mediaKind: media.mediaKind === 'series' ? ('series' as const) : ('movie' as const),
        targetId: media.mediaKind === 'series'
          ? `${targetId}:${effectiveSeason}:${effectiveEpisode}`
          : targetId,
      };

      // Execute addons concurrently via AddonExecutionService
      const executionResults = await this.addonExecutionService.executeAll(
        addonsToExecute,
        coordinates,
        5000 // 5s per-addon timeout
      );

      const candidates: StreamCandidate[] = [];
      for (const res of executionResults) {
        if (res.success && res.rawStreams) {
          for (const rawItem of res.rawStreams) {
            candidates.push(
              normalizeStremioStream(
                rawItem,
                res.addon.id,
                res.addon.name,
                res.addon.priorityOrder
              )
            );
          }
        }
      }

      // Rank stream candidates
      const rankedStreams = rankStreams(candidates);

      const response: MediaStreamsResponse = {
        mediaId: canonicalMediaId,
        seasonNumber: effectiveSeason,
        episodeNumber: effectiveEpisode,
        total: rankedStreams.length,
        streams: rankedStreams,
      };

      // Store in bounded LRU cache (secrets/credentials never stored)
      this.cache.set(cacheKey, response, this.cacheTtlMs);

      return response;
    });
  }
}
