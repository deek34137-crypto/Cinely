'use client';

import React, { useRef } from 'react';
import { NormalizedMediaSummary } from '../../lib/types';
import { PosterCard } from './PosterCard';
import styles from './MediaRow.module.css';

interface MediaRowProps {
  title: string;
  items: NormalizedMediaSummary[];
}

export function MediaRow({ title, items }: MediaRowProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  if (!items || items.length === 0) {
    return null;
  }

  const handleScroll = (direction: 'left' | 'right') => {
    if (trackRef.current) {
      const scrollAmount = trackRef.current.clientWidth * 0.75;
      if (typeof trackRef.current.scrollBy === 'function') {
        trackRef.current.scrollBy({
          left: direction === 'left' ? -scrollAmount : scrollAmount,
          behavior: 'smooth',
        });
      } else {
        trackRef.current.scrollLeft += direction === 'left' ? -scrollAmount : scrollAmount;
      }
    }
  };

  return (
    <section className={styles.rowWrapper} aria-label={title}>
      <h2 className={styles.rowTitle}>{title}</h2>

      <div className={styles.carouselContainer}>
        <button
          type="button"
          className={`${styles.chevronButton} ${styles.chevronLeft}`}
          onClick={() => handleScroll('left')}
          aria-label={`Scroll ${title} left`}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div ref={trackRef} className={styles.track} role="region" aria-label={`${title} items`}>
          {items.map((item) => (
            <PosterCard key={item.canonicalId} item={item} />
          ))}
        </div>

        <button
          type="button"
          className={`${styles.chevronButton} ${styles.chevronRight}`}
          onClick={() => handleScroll('right')}
          aria-label={`Scroll ${title} right`}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </section>
  );
}
