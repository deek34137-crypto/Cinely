/**
 * useMergedPlayback — composes server-side and browser-local custom addon
 * streams into a single PlaybackResponse-compatible object for the VideoPlayer.
 *
 * Merge ranking invariant:
 *   1. isWebPlayable DESC  — browser-playable sources always first
 *   2. priorityOrder ASC   — user-controlled; custom addons default after server addons
 *   3. score DESC          — quality/resolution score
 *   4. id ASC              — deterministic tiebreak
 *
 * Custom vs server origin is NOT a ranking factor — only priorityOrder matters.
 *
 * Phase 3B remains authoritative for server sources.
 * Phase 4C normalizes custom sources to the same PlaybackSource shape.
 * VideoPlayer is unchanged.
 */

import { useMemo } from 'react';
import { NormalizedMediaDetail, PlaybackResponse, PlaybackSource, CustomAddonError } from '../lib/types';
import { usePlayback, UsePlaybackOptions } from './usePlayback';
import { useCustomAddonStreams } from './useCustomAddonStreams';
import { CustomAddonStore } from '../lib/custom-addons/custom-addon-store';


export interface MergedPlaybackResult {
  /** Full PlaybackResponse-compatible object. The player receives this unchanged. */
  playback: PlaybackResponse | undefined;
  isLoading: boolean;
  /** Error from the server-side playback API, if any. */
  serverError: Error | null;
  /** Per-addon errors from custom addon execution. */
  customAddonErrors: CustomAddonError[];
  /** True if the server API is still loading. */
  isServerLoading: boolean;
  /** True if any custom addon stream fetch is in-flight. */
  isCustomLoading: boolean;
}

/**
 * Server addons are assigned a synthetic priorityOrder of 0 per source.score
 * (server already ranked them by Phase 3A). They are surfaced before custom
 * addons unless the user explicitly assigns a custom addon a lower priorityOrder.
 *
 * We use a sentinel of -1 for server sources so they appear before custom addons
 * when priority is equal.
 */
const SERVER_PRIORITY = -1;

function mergeSources(
  serverSelected: PlaybackSource | null,
  serverAlternatives: PlaybackSource[],
  customSources: PlaybackSource[]
): PlaybackSource[] {
  // Tag server sources with a synthetic priorityOrder for merge sorting
  const taggedServer: Array<PlaybackSource & { _priority: number }> = [
    ...(serverSelected ? [serverSelected] : []),
    ...serverAlternatives,
  ].map((s) => ({ ...s, _priority: SERVER_PRIORITY }));

  // Custom sources carry their addon's priorityOrder embedded in providerId.
  // Look up priorityOrder from the store; default to 9999 if not found.
  const taggedCustom: Array<PlaybackSource & { _priority: number }> = customSources.map((s) => {
    const record = CustomAddonStore.getById(s.providerId);
    return { ...s, _priority: record?.priorityOrder ?? 9999 };
  });

  const all = [...taggedServer, ...taggedCustom];

  // Sort: isWebPlayable DESC, _priority ASC, score DESC, id ASC
  all.sort((a, b) => {
    if (a.isWebPlayable !== b.isWebPlayable) return a.isWebPlayable ? -1 : 1;
    if (a._priority !== b._priority) return a._priority - b._priority;
    if (a.score !== b.score) return b.score - a.score;
    return a.id < b.id ? -1 : 1;
  });

  // Strip the synthetic tag
  return all.map(({ _priority: _p, ...rest }) => rest);
}

export function useMergedPlayback(
  canonicalMediaId: string,
  mediaDetail: NormalizedMediaDetail | undefined,
  playbackOptions: UsePlaybackOptions = {}
): MergedPlaybackResult {
  const {
    data: serverPlayback,
    isLoading: isServerLoading,
    error: serverError,
  } = usePlayback(canonicalMediaId, playbackOptions);

  const {
    sources: customSources,
    isLoading: isCustomLoading,
    errors: customAddonErrors,
  } = useCustomAddonStreams(mediaDetail, {
    season: playbackOptions.season,
    episode: playbackOptions.episode,
    enabled: playbackOptions.enabled,
  });

  const mergedPlayback = useMemo<PlaybackResponse | undefined>(() => {
    if (!serverPlayback) return undefined;

    if (customSources.length === 0) {
      // No custom sources — return server playback unchanged
      return serverPlayback;
    }

    const merged = mergeSources(
      serverPlayback.selected,
      serverPlayback.alternatives,
      customSources
    );

    const webPlayable = merged.filter((s) => s.isWebPlayable);
    const selected = webPlayable[0] ?? null;
    const alternatives = webPlayable.slice(1);

    return {
      ...serverPlayback,
      selected,
      alternatives,
      totalPlayable: webPlayable.length,
      hasPlayableSource: webPlayable.length > 0,
    };
  }, [serverPlayback, customSources]);

  return {
    playback: mergedPlayback,
    isLoading: isServerLoading,
    serverError: serverError ?? null,
    customAddonErrors,
    isServerLoading,
    isCustomLoading,
  };
}
