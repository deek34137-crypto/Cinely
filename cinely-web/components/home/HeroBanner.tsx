'use client';

import React from 'react';
import { NormalizedMediaSummary } from '../../lib/types';
import { useMediaModal } from '../../context/ModalContext';
import styles from './HeroBanner.module.css';

interface HeroBannerProps {
  item?: NormalizedMediaSummary;
  isLoading?: boolean;
}

export function HeroBanner({ item, isLoading }: HeroBannerProps) {
  const { openModal } = useMediaModal();

  if (isLoading || !item) {
    return (
      <div className={styles.skeletonContainer} aria-busy="true" aria-label="Loading featured media">
        <div className={styles.skeletonShimmer} />
        <div className={styles.contentWrapper}>
          <div className={styles.skeletonTitle} />
          <div className={styles.skeletonText} />
          <div className={styles.skeletonText} style={{ width: '380px' }} />
          <div className={styles.skeletonButtons}>
            <div className={styles.skeletonBtn} />
            <div className={styles.skeletonBtn} />
          </div>
        </div>
      </div>
    );
  }

  const backdrop = item.backdropUrl || item.posterUrl;
  const ratingPercent = item.rating ? Math.round(item.rating * 10) : null;
  const primaryGenre = item.genres && item.genres.length > 0 ? item.genres[0] : null;

  return (
    <section className={styles.heroContainer} aria-label={`Featured: ${item.title}`}>
      {backdrop && (
        <div
          className={styles.backdropLayer}
          style={{ backgroundImage: `url(${backdrop})` }}
          role="img"
          aria-label={item.title}
        />
      )}
      <div className={styles.gradientVignette} />
      <div className={styles.gradientSideScrim} />
      <div className={styles.gradientBottomFade} />

      <div className={styles.contentWrapper}>
        <div className={styles.metadataRow}>
          {ratingPercent !== null && (
            <span className={styles.matchScore} title={`Rating: ${item.rating}/10`}>
              {ratingPercent}% Match
            </span>
          )}
          {item.releaseYear && <span className={styles.releaseYear}>{item.releaseYear}</span>}
          {primaryGenre && <span className={styles.genreBadge}>{primaryGenre}</span>}
          <span className={styles.genreBadge}>{item.mediaKind.toUpperCase()}</span>
        </div>

        <h1 className={styles.title}>{item.title}</h1>

        {item.overview && <p className={styles.overview}>{item.overview}</p>}

        <div className={styles.buttonGroup}>
          <button
            type="button"
            className={styles.playButton}
            onClick={() => openModal(item.canonicalId)}
            aria-label={`Play ${item.title}`}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
            Play
          </button>

          <button
            type="button"
            className={styles.moreInfoButton}
            onClick={() => openModal(item.canonicalId)}
            aria-label={`More information about ${item.title}`}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            More Info
          </button>
        </div>
      </div>
    </section>
  );
}
