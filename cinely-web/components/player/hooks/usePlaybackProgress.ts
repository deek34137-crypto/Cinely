import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import {
  useMediaProgress,
  useEpisodeProgress,
  useUpdateProgress,
} from '../../../hooks/useProgress';

export interface UsePlaybackProgressOptions {
  mediaId: string;
  seasonNumber?: number;
  episodeNumber?: number;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
}

export function usePlaybackProgress({
  mediaId,
  seasonNumber = 0,
  episodeNumber = 0,
  currentTime,
  duration,
  isPlaying,
}: UsePlaybackProgressOptions) {
  const { isAuthenticated } = useAuth();
  const updateMutation = useUpdateProgress();

  const isTv = seasonNumber > 0 && episodeNumber > 0;

  // Retrieve saved progress from Phase 2B
  const mediaProgress = useMediaProgress(isAuthenticated && !isTv ? mediaId : null);
  const episodeProgress = useEpisodeProgress(
    isAuthenticated && isTv ? mediaId : null,
    seasonNumber,
    episodeNumber
  );

  const savedRecord = isTv ? episodeProgress : mediaProgress;

  // Compute safe initial resume position
  const initialResumePosition = useRef<number | null>(null);
  if (initialResumePosition.current === null && savedRecord !== undefined) {
    if (savedRecord && !savedRecord.completed && savedRecord.progressPercent < 90) {
      initialResumePosition.current = savedRecord.positionSeconds;
    } else {
      initialResumePosition.current = 0;
    }
  }

  // Monotonic sequence counter for ordering writes safely
  const clientSequenceRef = useRef(1);

  // Ref tracking latest state for non-stale callbacks and unload handlers
  const stateRef = useRef({ currentTime, duration, isAuthenticated, isUpdating: false });
  stateRef.current = { currentTime, duration, isAuthenticated, isUpdating: stateRef.current.isUpdating };

  /**
   * Dispatches serialized progress update to the backend with monotonic clientSequence.
   */
  const flushProgress = useCallback(async () => {
    const { currentTime: pos, duration: dur, isAuthenticated: isAuth, isUpdating } = stateRef.current;
    if (!isAuth || isUpdating || !mediaId || dur <= 0) return;

    stateRef.current.isUpdating = true;
    const seq = clientSequenceRef.current++;

    try {
      await updateMutation.mutateAsync({
        canonicalMediaId: mediaId,
        payload: {
          positionSeconds: Math.floor(pos),
          durationSeconds: Math.floor(dur),
          seasonNumber: seasonNumber > 0 ? seasonNumber : undefined,
          episodeNumber: episodeNumber > 0 ? episodeNumber : undefined,
          clientSequence: seq,
        },
      });
    } catch {
      // Background sync errors ignored
    } finally {
      stateRef.current.isUpdating = false;
    }
  }, [mediaId, seasonNumber, episodeNumber, updateMutation]);

  // 1. Periodic sync (~8s) during active playback
  useEffect(() => {
    if (!isPlaying || !isAuthenticated) return;

    const interval = setInterval(() => {
      flushProgress();
    }, 8000);

    return () => clearInterval(interval);
  }, [isPlaying, isAuthenticated, flushProgress]);

  // 2. Lifecycle flush: visibilitychange and pagehide
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        flushProgress();
      }
    };

    const handlePageHide = () => {
      flushProgress();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', handlePageHide);
      flushProgress(); // Flush on component unmount
    };
  }, [isAuthenticated, flushProgress]);

  return {
    initialResumePosition: initialResumePosition.current ?? 0,
    flushProgress,
  };
}
