'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useMediaModal } from '../../context/ModalContext';
import { useAuth } from '../../hooks/useAuth';
import { useToggleWatchlist } from '../../hooks/useWatchlist';
import { apiClient } from '../../lib/api-client';
import { queryKeys } from '../../lib/query-keys';
import styles from './MediaDetailModal.module.css';

export function MediaDetailModal() {
  const router = useRouter();
  const { isOpen, canonicalId, closeModal } = useMediaModal();
  const { isAuthenticated } = useAuth();
  const { toggleWatchlist, isInWatchlist, isPending: isWatchlistPending } = useToggleWatchlist(canonicalId);

  const { data: media, isLoading, isError } = useQuery({
    queryKey: canonicalId ? queryKeys.discovery.detail(canonicalId) : ['media', 'none'],
    queryFn: () => (canonicalId ? apiClient.getMedia(canonicalId) : null),
    enabled: isOpen && !!canonicalId,
  });

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeModal]);

  if (!isOpen || !canonicalId) {
    return null;
  }

  const backdrop = media?.artwork?.backdropUrl || media?.artwork?.posterUrl;
  const ratingPercent = media?.rating ? Math.round(media.rating * 10) : null;
  const castNames = media?.cast?.map((c) => c.name).join(', ') || 'N/A';
  const directorNames = media?.directors?.map((d) => d.name).join(', ') || 'N/A';

  const handleWatchlistClick = async () => {
    if (!media) return;
    if (!isAuthenticated) {
      closeModal();
      router.push(`/login?returnUrl=/media/${encodeURIComponent(media.id)}`);
      return;
    }
    await toggleWatchlist();
  };

  return (
    <div
      className={styles.overlay}
      onClick={closeModal}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={styles.modalCard}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className={styles.closeButton}
          onClick={closeModal}
          aria-label="Close modal"
        >
          <svg
            width="18"
            height="18"
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

        {isLoading ? (
          <div className={styles.modalSkeleton}>
            <div className={styles.skelLine} style={{ width: '60%', height: '32px' }} />
            <div className={styles.skelLine} style={{ width: '40%' }} />
            <div className={styles.skelLine} style={{ width: '100%', height: '80px' }} />
          </div>
        ) : isError || !media ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--danger)', marginBottom: '1rem' }}>Failed to load media details.</p>
            <button
              type="button"
              className={styles.playActionBtn}
              onClick={closeModal}
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div className={styles.mediaHeader}>
              {backdrop && (
                <img
                  src={backdrop}
                  alt={media.defaultTitle}
                  className={styles.headerBackdrop}
                />
              )}
              <div className={styles.headerGradient} />
              <div className={styles.headerContent}>
                <h2 id="modal-title" className={styles.modalTitle}>
                  {media.defaultTitle}
                </h2>
                <div className={styles.headerActions}>
                  <Link
                    href={`/watch/${encodeURIComponent(media.id)}`}
                    className={styles.playActionBtn}
                    onClick={closeModal}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Play
                  </Link>

                  <Link
                    href={`/media/${encodeURIComponent(media.id)}`}
                    className={styles.fullDetailsBtn}
                    onClick={closeModal}
                    aria-label={`View full details for ${media.defaultTitle}`}
                  >
                    Full Details &amp; Episodes
                  </Link>

                  <button
                    type="button"
                    className={styles.watchlistActionBtn}
                    onClick={handleWatchlistClick}
                    disabled={isWatchlistPending}
                    aria-label={isInWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
                    title={isInWatchlist ? 'In Watchlist (Click to remove)' : 'Add to Watchlist'}
                    data-in-watchlist={isInWatchlist}
                    data-testid="modal-watchlist-btn"
                  >
                    {isInWatchlist ? (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.detailsGrid}>
                <div className={styles.mainCol}>
                  <div className={styles.metaRow}>
                    {ratingPercent !== null && (
                      <span className={styles.matchBadge}>{ratingPercent}% Match</span>
                    )}
                    {media.releaseYear && <span>{media.releaseYear}</span>}
                    {media.runtimeMinutes && (
                      <span className={styles.runtime}>{media.runtimeMinutes}m</span>
                    )}
                    {media.certification && <span>{media.certification}</span>}
                    <span>{media.mediaKind.toUpperCase()}</span>
                  </div>

                  {media.overview && <p className={styles.overviewText}>{media.overview}</p>}
                </div>

                <div className={styles.sideCol}>
                  {media.cast && media.cast.length > 0 && (
                    <div className={styles.sideItem}>
                      <span className={styles.sideLabel}>Cast:</span>
                      <span className={styles.sideValue}>{castNames}</span>
                    </div>
                  )}

                  {media.directors && media.directors.length > 0 && (
                    <div className={styles.sideItem}>
                      <span className={styles.sideLabel}>Director:</span>
                      <span className={styles.sideValue}>{directorNames}</span>
                    </div>
                  )}

                  {media.genres && media.genres.length > 0 && (
                    <div className={styles.sideItem}>
                      <span className={styles.sideLabel}>Genres:</span>
                      <div className={styles.genreChips}>
                        {media.genres.map((g) => (
                          <span key={g} className={styles.genreChip}>
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
