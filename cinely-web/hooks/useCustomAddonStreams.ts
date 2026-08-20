/**
 * useCustomAddonStreams — fetches and normalizes streams from all enabled
 * browser-local custom addons for a given piece of media.
 *
 * Each addon executes in isolation via Promise.allSettled — one CORS/timeout
 * failure never blocks results from other addons.
 *
 * The caller must pass a NormalizedMediaDetail so the Stremio ID
 * (from externalIds.imdbId) can be resolved here without duplicating
 * media-ID resolution logic elsewhere.
 */

import { useQuery } from '@tanstack/react-query';
import { NormalizedMediaDetail, PlaybackSource, CustomAddonError } from '../lib/types';
import { CustomAddonStore } from '../lib/custom-addons/custom-addon-store';
import {
  fetchCustomAddonStreams,
  CustomAddonFetchError,
} from '../lib/custom-addons/browser-stremio-adapter';
import { normalizeCustomAddonStreams } from '../lib/custom-addons/custom-stream-normalizer';

export interface UseCustomAddonStreamsResult {
  sources: PlaybackSource[];
  isLoading: boolean;
  errors: CustomAddonError[];
}

export interface UseCustomAddonStreamsOptions {
  season?: number;
  episode?: number;
  enabled?: boolean;
}

export function useCustomAddonStreams(
  mediaDetail: NormalizedMediaDetail | undefined,
  options: UseCustomAddonStreamsOptions = {}
): UseCustomAddonStreamsResult {
  const { season, episode, enabled = true } = options;

  // Resolve Stremio ID from canonical media detail — no duplication of ID logic
  const imdbId = mediaDetail?.externalIds?.imdbId;
  const mediaKind = mediaDetail?.mediaKind;
  const canonicalId = mediaDetail?.id ?? '';

  // Build the full Stremio ID: "tt1375666" (movie) or "tt0903747:1:3" (series)
  const stremioId = (() => {
    if (!imdbId) return null;
    if (mediaKind === 'series' && season && season > 0 && episode && episode > 0) {
      return `${imdbId}:${season}:${episode}`;
    }
    return imdbId;
  })();

  const addonMediaType: 'movie' | 'series' =
    mediaKind === 'series' ? 'series' : 'movie';

  const enabledAddons = CustomAddonStore.getEnabledSorted();
  const isQueryEnabled =
    enabled &&
    Boolean(stremioId) &&
    enabledAddons.length > 0;

  const { data, isLoading } = useQuery<{
    sources: PlaybackSource[];
    errors: CustomAddonError[];
  }>({
    queryKey: ['customAddonStreams', canonicalId, season ?? 0, episode ?? 0],
    queryFn: async () => {
      if (!stremioId) return { sources: [], errors: [] };

      const results = await Promise.allSettled(
        enabledAddons.map(async (addon) => {
          const raw = await fetchCustomAddonStreams(addon, addonMediaType, stremioId);
          return normalizeCustomAddonStreams(raw, addon, canonicalId);
        })
      );

      const sources: PlaybackSource[] = [];
      const errors: CustomAddonError[] = [];

      results.forEach((result, idx) => {
        const addon = enabledAddons[idx];
        if (result.status === 'fulfilled') {
          sources.push(...result.value);
        } else {
          const err = result.reason;
          if (err instanceof CustomAddonFetchError) {
            errors.push({
              addonId: err.addonId,
              addonName: err.addonName,
              kind: err.kind,
              message: err.message,
            });
            // Update last test status in store
            CustomAddonStore.setTestStatus(
              addon.id,
              err.kind === 'CORS_BLOCKED'
                ? 'cors_blocked'
                : err.kind === 'TIMEOUT'
                ? 'timeout'
                : 'error'
            );
          } else {
            errors.push({
              addonId: addon.id,
              addonName: addon.manifest.name,
              kind: 'UNKNOWN',
              message: String(err?.message ?? err),
            });
            CustomAddonStore.setTestStatus(addon.id, 'error');
          }
        }
      });

      return { sources, errors };
    },
    enabled: isQueryEnabled,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  if (!isQueryEnabled) {
    return { sources: [], isLoading: false, errors: [] };
  }

  return {
    sources: data?.sources ?? [],
    isLoading,
    errors: data?.errors ?? [],
  };
}
