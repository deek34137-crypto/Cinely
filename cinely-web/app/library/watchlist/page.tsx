'use client';

import React from 'react';
import Link from 'next/link';
import { Navbar } from '../../../components/layout/Navbar';
import { PosterCard } from '../../../components/home/PosterCard';
import { useWatchlist } from '../../../hooks/useWatchlist';
import { useAuth } from '../../../hooks/useAuth';
import styles from './WatchlistPage.module.css';

export default function WatchlistPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { items, total, isLoading: isWatchlistLoading, isError, error, refetch } = useWatchlist();

  return (
    <div className={styles.pageContainer}>
      <Navbar />

      <main>
        {isAuthLoading ? (
          <div>
            <div className={styles.headerRow}>
              <div className={styles.titleArea}>
                <h1 className={styles.pageTitle}>My Watchlist</h1>
              </div>
            </div>
            <div className={styles.skeletonGrid} data-testid="watchlist-skeleton">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className={styles.skeletonCard} />
              ))}
            </div>
          </div>
        ) : !isAuthenticated ? (
          <div className={styles.authPromptContainer} data-testid="watchlist-auth-prompt">
            <svg
              className={styles.authPromptIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            <h1 className={styles.authPromptTitle}>Sign in to view your Watchlist</h1>
            <p className={styles.authPromptText}>
              Keep track of movies and series you want to watch. Your watchlist is synced securely across all your devices.
            </p>
            <Link
              href="/login?returnUrl=/library/watchlist"
              className={styles.signInBtn}
            >
              Sign In to Cinely
            </Link>
          </div>
        ) : (
          <div>
            <header className={styles.headerRow}>
              <div className={styles.titleArea}>
                <h1 className={styles.pageTitle}>My Watchlist</h1>
                <span className={styles.countBadge} data-testid="watchlist-count">
                  {total} {total === 1 ? 'title' : 'titles'}
                </span>
              </div>
            </header>

            {isWatchlistLoading ? (
              <div className={styles.skeletonGrid} data-testid="watchlist-skeleton">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className={styles.skeletonCard} />
                ))}
              </div>
            ) : isError ? (
              <div className={styles.errorContainer} role="alert">
                <p>
                  {error instanceof Error
                    ? error.message
                    : 'Failed to load your watchlist. Please try again.'}
                </p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className={styles.retryBtn}
                >
                  Retry
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className={styles.emptyContainer} data-testid="watchlist-empty">
                <svg
                  className={styles.emptyIcon}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
                <h2 className={styles.emptyTitle}>Your Watchlist is empty</h2>
                <p className={styles.emptySubtitle}>
                  Explore movies and TV series from the discovery feed and add them to your watchlist to track what to watch next.
                </p>
                <Link href="/" className={styles.exploreBtn}>
                  Explore Catalog
                </Link>
              </div>
            ) : (
              <div className={styles.mediaGrid} data-testid="watchlist-grid">
                {items.map((item) => (
                  <PosterCard key={item.canonicalId} item={item} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
