'use client';

import React, { useMemo } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client';
import { useMergedPlayback } from '../../../hooks/useMergedPlayback';
import { VideoPlayer, NextEpisodeInfo } from '../../../components/player/VideoPlayer';
import { buildWatchUrl } from '../../../lib/utils/url';
import styles from './WatchPage.module.css';

export default function WatchPage() {
  const params = useParams() as { id: string };
  const searchParams = useSearchParams();
  const router = useRouter();

  const canonicalMediaId = useMemo(() => {
    return params?.id ? decodeURIComponent(params.id) : '';
  }, [params?.id]);

  const seasonNumber = useMemo(() => {
    const s = searchParams.get('season');
    return s ? parseInt(s, 10) : 0;
  }, [searchParams]);

  const episodeNumber = useMemo(() => {
    const e = searchParams.get('episode');
    return e ? parseInt(e, 10) : 0;
  }, [searchParams]);

  // 1. Load media detail — usually already cached by React Query from the /media/:id page.
  //    Required so useCustomAddonStreams can resolve the Stremio ID from externalIds.imdbId.
  const { data: mediaDetail } = useQuery({
    queryKey: ['media', canonicalMediaId],
    queryFn: () => apiClient.getMedia(canonicalMediaId),
    enabled: Boolean(canonicalMediaId),
    staleTime: 10 * 60 * 1000,
  });

  // 2. Resolve merged playback: Phase 3B server sources + Phase 4 custom addon sources.
  //    VideoPlayer receives PlaybackSource[] regardless of source origin.
  const { playback: playbackData, isLoading, serverError: error } = useMergedPlayback(
    canonicalMediaId,
    mediaDetail,
    {
      season: seasonNumber > 0 ? seasonNumber : undefined,
      episode: episodeNumber > 0 ? episodeNumber : undefined,
      enabled: Boolean(canonicalMediaId),
    }
  );

  // 3. Discover TV episode metadata from catalog to identify authoritative next episode
  const isSeries = playbackData?.mediaKind === 'series';
  const effectiveSeason = isSeries ? (seasonNumber > 0 ? seasonNumber : 1) : 0;
  const effectiveEpisode = isSeries ? (episodeNumber > 0 ? episodeNumber : 1) : 0;

  const { data: seasonDetail } = useQuery({
    queryKey: ['season', canonicalMediaId, effectiveSeason],
    queryFn: () => apiClient.getSeason(canonicalMediaId, effectiveSeason),
    enabled: isSeries && effectiveSeason > 0,
    staleTime: 10 * 60 * 1000,
  });

  // Determine next episode by actual catalog list order
  const nextEpisode = useMemo<NextEpisodeInfo | null>(() => {
    if (!isSeries || !seasonDetail?.episodes || seasonDetail.episodes.length === 0) {
      return null;
    }

    const currIdx = seasonDetail.episodes.findIndex(
      (ep) => ep.episodeNumber === effectiveEpisode
    );

    if (currIdx !== -1 && currIdx < seasonDetail.episodes.length - 1) {
      const next = seasonDetail.episodes[currIdx + 1];
      return {
        seasonNumber: effectiveSeason,
        episodeNumber: next.episodeNumber,
        title: next.title,
      };
    }

    return null;
  }, [isSeries, seasonDetail, effectiveSeason, effectiveEpisode]);

  const handleBack = () => {
    if (canonicalMediaId) {
      router.push(`/media/${encodeURIComponent(canonicalMediaId)}`);
    } else {
      router.back();
    }
  };

  const handleNavigateToEpisode = (s: number, e: number) => {
    router.push(buildWatchUrl(canonicalMediaId, s, e));
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer} data-testid="watch-loading-skeleton">
        <div className={styles.spinner} />
        <p className={styles.loadingText}>Initializing cinematic playback...</p>
      </div>
    );
  }

  if (error || !playbackData) {
    return (
      <div className={styles.watchContainer}>
        <div className={styles.loadingContainer} data-testid="watch-error-container">
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Playback Error</h2>
          <p style={{ color: '#aaa', maxWidth: '400px', textAlign: 'center' }}>
            {error?.message || 'Unable to load playback streams for this media.'}
          </p>
          <button
            type="button"
            className={styles.spinner}
            style={{ width: 'auto', height: 'auto', border: 'none', background: '#e50914', padding: '0.75rem 1.5rem', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}
            onClick={handleBack}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className={styles.watchContainer}>
      <VideoPlayer
        playbackData={playbackData}
        nextEpisode={nextEpisode}
        onBack={handleBack}
        onNavigateToEpisode={handleNavigateToEpisode}
      />
    </main>
  );
}
