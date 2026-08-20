'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { useProgress, useDeleteProgress } from '../../hooks/useProgress';
import { useAuth } from '../../hooks/useAuth';
import { ProgressBar } from '../progress/ProgressBar';
import { PlaybackProgress } from '../../lib/types';
import { buildWatchUrl } from '../../lib/utils/url';
import styles from './ContinueWatchingRow.module.css';

/**
 * Format progress metadata line for a progress record.
 * Movies: "72% watched"
 * TV episodes: "S02 E04 · 42% watched"
 */
function formatProgressLabel(progress: PlaybackProgress): string {
  const pct = Math.round(progress.progressPercent);
  if (progress.seasonNumber > 0 || progress.episodeNumber > 0) {
    const s = String(progress.seasonNumber).padStart(2, '0');
    const e = String(progress.episodeNumber).padStart(2, '0');
    return `S${s} E${e} · ${pct}%`;
  }
  return `${pct}% watched`;
}

/** Format episode identity line separately for TV (used in card below title). */
function formatEpisodeTag(progress: PlaybackProgress): string | null {
  if (progress.seasonNumber > 0 || progress.episodeNumber > 0) {
    const s = String(progress.seasonNumber).padStart(2, '0');
    const e = String(progress.episodeNumber).padStart(2, '0');
    return `S${s} E${e}`;
  }
  return null;
}

interface ContinueWatchingCardProps {
  progress: PlaybackProgress;
  /** Resolved canonical title from the progress record's mediaId */
  title: string;
  posterUrl?: string | null;
  onRemove: (progress: PlaybackProgress) => void;
  isRemoving: boolean;
}

function ContinueWatchingCard({
  progress,
  title,
  posterUrl,
  onRemove,
  isRemoving,
}: ContinueWatchingCardProps) {
  const episodeTag = formatEpisodeTag(progress);

  return (
    <article
      className={styles.card}
      data-testid={`continue-card-${progress.mediaId}`}
      aria-label={`${title}${episodeTag ? ` ${episodeTag}` : ''} — ${Math.round(progress.progressPercent)}% watched`}
    >
      {/* Poster image */}
      <div className={styles.cardImageWrapper}>
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={title}
            className={styles.cardImage}
            loading="lazy"
          />
        ) : (
          <div className={styles.cardFallback}>
            <span className={styles.cardFallbackTitle}>{title}</span>
          </div>
        )}

        {/* Progress strip at bottom of poster */}
        <div className={styles.progressStrip}>
          <ProgressBar
            progressPercent={progress.progressPercent}
            variant="thin"
            aria-label={`${title} playback progress`}
          />
        </div>

        {/* Hover overlay with resume button */}
        <div className={styles.hoverOverlay} aria-hidden="true">
          <Link
            href={buildWatchUrl(progress.mediaId, progress.seasonNumber, progress.episodeNumber)}
            className={styles.resumeBtn}
            tabIndex={-1}
            aria-label={`Resume ${title}`}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
            Resume
          </Link>
        </div>

        {/* Remove (×) button */}
        <button
          type="button"
          className={styles.removeBtn}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(progress);
          }}
          disabled={isRemoving}
          aria-label={`Remove ${title} from Continue Watching`}
          title="Remove from Continue Watching"
          data-testid={`remove-progress-${progress.mediaId}`}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Card metadata below poster */}
      <div className={styles.cardMeta}>
        <span className={styles.cardTitle}>{title}</span>
        {episodeTag && (
          <span className={styles.cardEpisode}>{episodeTag}</span>
        )}
        <span className={styles.cardPercent}>{Math.round(progress.progressPercent)}% watched</span>
      </div>
    </article>
  );
}

/**
 * ContinueWatchingRow renders in-progress content on the homepage.
 *
 * Architecture invariants:
 * - Server-owned state: progressPercent is NEVER recomputed client-side.
 * - Completed records (completed === true) are excluded by useProgress.
 * - Deletion invalidates the ["progress"] TanStack Query cache.
 * - The resume button links to /watch/[id] (Phase 3 will own the player).
 */
export function ContinueWatchingRow() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { items, isLoading, isError } = useProgress({ includeCompleted: false });
  const deleteProgress = useDeleteProgress();
  const trackRef = useRef<HTMLDivElement>(null);

  // Don't render for unauthenticated users or while auth is bootstrapping
  if (!isAuthenticated && !isAuthLoading) return null;

  // Loading skeleton
  if (isAuthLoading || isLoading) {
    return (
      <section className={styles.rowWrapper} aria-label="Continue Watching">
        <h2 className={styles.rowTitle}>Continue Watching</h2>
        <div className={styles.skeletonTrack} aria-hidden="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard} />
          ))}
        </div>
      </section>
    );
  }

  // Error state — don't crash the homepage; fail silently
  if (isError) return null;

  // Empty: no in-progress items — hide the row entirely
  if (items.length === 0) return null;

  const handleScroll = (direction: 'left' | 'right') => {
    if (trackRef.current) {
      const scrollAmount = trackRef.current.clientWidth * 0.75;
      trackRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const handleRemove = (progress: PlaybackProgress) => {
    deleteProgress.mutate({
      canonicalMediaId: progress.mediaId,
      seasonNumber: progress.seasonNumber || undefined,
      episodeNumber: progress.episodeNumber || undefined,
    });
  };

  return (
    <section className={styles.rowWrapper} aria-label="Continue Watching" data-testid="continue-watching-row">
      <h2 className={styles.rowTitle}>Continue Watching</h2>

      <div className={styles.carouselContainer}>
        <button
          type="button"
          className={`${styles.chevronButton} ${styles.chevronLeft}`}
          onClick={() => handleScroll('left')}
          aria-label="Scroll Continue Watching left"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div
          ref={trackRef}
          className={styles.track}
          role="region"
          aria-label="Continue Watching items"
          data-testid="continue-watching-track"
        >
          {items.map((progress) => (
            <ContinueWatchingCard
              key={`${progress.mediaId}-s${progress.seasonNumber}-e${progress.episodeNumber}`}
              progress={progress}
              title={progress.mediaId} // resolved by parent via TanStack Query media cache; passed as-is initially
              posterUrl={null}
              onRemove={handleRemove}
              isRemoving={deleteProgress.isPending}
            />
          ))}
        </div>

        <button
          type="button"
          className={`${styles.chevronButton} ${styles.chevronRight}`}
          onClick={() => handleScroll('right')}
          aria-label="Scroll Continue Watching right"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </section>
  );
}
