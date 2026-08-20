import { useState, useCallback, useMemo, useRef } from 'react';
import { PlaybackSource } from '../../../lib/types';

export interface UseSourceFailoverOptions {
  selected: PlaybackSource | null;
  alternatives: PlaybackSource[];
  onFailoverTriggered?: (failedSource: PlaybackSource, nextSource: PlaybackSource | null) => void;
}

export function useSourceFailover({
  selected,
  alternatives,
  onFailoverTriggered,
}: UseSourceFailoverOptions) {
  const [failedSourceIds, setFailedSourceIds] = useState<Set<string>>(new Set());
  const [manuallySelectedSourceId, setManuallySelectedSourceId] = useState<string | null>(null);
  const [isSwitchingSource, setIsSwitchingSource] = useState(false);

  // All valid web-playable sources in Phase 3B rank order
  const allSources = useMemo<PlaybackSource[]>(() => {
    const list: PlaybackSource[] = [];
    if (selected) list.push(selected);
    if (alternatives && alternatives.length > 0) list.push(...alternatives);
    return list;
  }, [selected, alternatives]);

  // Determine current active source:
  // 1. Manually selected source if specified by user
  // 2. First candidate in rank order that has NOT failed
  const activeSource = useMemo<PlaybackSource | null>(() => {
    if (manuallySelectedSourceId) {
      const manual = allSources.find((s) => s.id === manuallySelectedSourceId);
      if (manual) return manual;
    }

    // Auto-selection: first non-failed source in Phase 3A/3B rank order
    return allSources.find((s) => !failedSourceIds.has(s.id)) || null;
  }, [allSources, manuallySelectedSourceId, failedSourceIds]);

  const activeSourceRef = useRef(activeSource);
  activeSourceRef.current = activeSource;

  const failedSourceIdsRef = useRef(failedSourceIds);
  failedSourceIdsRef.current = failedSourceIds;

  /**
   * Advances to the next viable playback candidate when the current source fails.
   */
  const triggerFailover = useCallback(
    (lastKnownPosition = 0) => {
      const current = activeSourceRef.current;
      if (!current) return null;

      setIsSwitchingSource(true);
      const updatedFailed = new Set(failedSourceIdsRef.current);
      updatedFailed.add(current.id);
      setFailedSourceIds(updatedFailed);

      // If user had manually selected this failed source, reset manual preference
      if (manuallySelectedSourceId === current.id) {
        setManuallySelectedSourceId(null);
      }

      // Find next candidate
      const next = allSources.find((s) => !updatedFailed.has(s.id)) || null;
      onFailoverTriggered?.(current, next);

      setTimeout(() => setIsSwitchingSource(false), 800);
      return next;
    },
    [manuallySelectedSourceId, allSources, onFailoverTriggered]
  );

  /**
   * Allows the user to manually switch to any available stream without marking others failed.
   */
  const selectSourceManually = useCallback((sourceId: string) => {
    setManuallySelectedSourceId(sourceId);
  }, []);

  /**
   * Resets failure tracking (e.g. on manual user retry button click).
   */
  const resetFailover = useCallback(() => {
    setFailedSourceIds(new Set());
    setManuallySelectedSourceId(null);
    setIsSwitchingSource(false);
  }, []);

  return {
    activeSource,
    allSources,
    failedSourceIds,
    isSwitchingSource,
    hasAvailableSource: activeSource !== null,
    triggerFailover,
    selectSourceManually,
    resetFailover,
  };
}
