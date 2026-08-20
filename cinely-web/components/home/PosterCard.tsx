'use client';

import React from 'react';
import { NormalizedMediaSummary } from '../../lib/types';
import { useMediaModal } from '../../context/ModalContext';
import styles from './PosterCard.module.css';

interface PosterCardProps {
  item: NormalizedMediaSummary;
}

export function PosterCard({ item }: PosterCardProps) {
  const { openModal } = useMediaModal();
  const imageUrl = item.backdropUrl || item.posterUrl;
  const ratingText = item.rating ? `★ ${item.rating.toFixed(1)}` : null;

  return (
    <article
      className={styles.card}
      onClick={() => openModal(item.canonicalId)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openModal(item.canonicalId);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`${item.title} (${item.releaseYear || 'Unknown year'})`}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={item.title}
          className={styles.cardImage}
          loading="lazy"
        />
      ) : (
        <div className={styles.cardFallback}>
          <span className={styles.cardFallbackTitle}>{item.title}</span>
        </div>
      )}

      <div className={styles.hoverOverlay} aria-hidden="true">
        <span className={styles.cardTitle}>{item.title}</span>
        <div className={styles.cardMeta}>
          {ratingText && <span className={styles.rating}>{ratingText}</span>}
          {item.releaseYear && <span>{item.releaseYear}</span>}
          <span>{item.mediaKind}</span>
        </div>
      </div>
    </article>
  );
}
