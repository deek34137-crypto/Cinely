'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';
import { useToggleWatchlist } from '../../hooks/useWatchlist';
import { apiClient } from '../../lib/api-client';
import { queryKeys } from '../../lib/query-keys';
import { buildWatchUrl } from '../../lib/utils/url';
import styles from './MediaDetailView.module.css';

interface MediaDetailViewProps {
  canonicalId: string;
}

export function MediaDetailView({ canonicalId }: MediaDetailViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { toggleWatchlist, isInWatchlist, isPending: isWatchlistPending } = useToggleWatchlist(canonicalId);

  // Query canonical media details
  const {
    data: media,
    isLoading: isMediaLoading,
    isError: isMediaError,
    error: mediaError,
  } = useQuery({
    queryKey: queryKeys.discovery.detail(canonicalId),
    queryFn: () => apiClient.getMedia(canonicalId),
  });

  // Query-driven season selection
  const seasonParam = searchParams.get('season');
  const selectedSeasonNumber = seasonParam ? parseInt(seasonParam, 10) || 1 : 1;

  // Query season details if this is a series
  const isSeries = media?.mediaKind === 'series';
  const {
    data: seasonDetail,
    isLoading: isSeasonLoading,
    isError: isSeasonError,
  } = useQuery({
    queryKey: queryKeys.discovery.season(canonicalId, selectedSeasonNumber),
    queryFn: () => apiClient.getSeason(canonicalId, selectedSeasonNumber),
    enabled: isSeries && !!media,
  });

  const handleSeasonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSeason = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    params.set('season', newSeason);
    router.push(`${pathname}?${params.toString()}`);
  };

  if (isMediaLoading) {
    return (
      <div className={styles.detailContainer} aria-busy="true" aria-label="Loading media details">
        <div className={styles.skeletonHeader}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '48rem' }}>
            <div className={styles.skelLine} style={{ width: '60%', height: '48px' }} />
            <div className={styles.skelLine} style={{ width: '40%', height: '24px' }} />
            <div className={styles.skelLine} style={{ width: '100%', height: '80px' }} />
          </div>
        </div>
      </div>
    );
  }

  if (isMediaError || !media) {
    return (
      <div className={styles.detailContainer} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80dvh' }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h1 style={{ fontSize: 'var(--text-2xl)', color: 'var(--danger)', marginBottom: '1rem' }}>
            Media Not Found
          </h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            {mediaError instanceof Error ? mediaError.message : `Unable to locate media '${canonicalId}'.`}
          </p>
          <Link
            href="/"
            style={{
              display: 'inline-block',
              backgroundColor: 'var(--text-primary)',
              color: '#000',
              fontWeight: 'var(--weight-bold)',
              padding: '0.65rem 1.5rem',
              borderRadius: 'var(--radius-md)',
            }}
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  const backdrop = media.artwork?.backdropUrl || media.artwork?.posterUrl;
  const ratingPercent = media.rating ? Math.round(media.rating * 10) : null;
  const castList = media.cast || [];
  const directorsList = media.directors || [];
  const writersList = media.writers || [];
  const totalSeasons = media.seasonsCount || (isSeries ? 1 : 0);

  return (
    <article className={styles.detailContainer}>
      <header
        className={styles.heroBackdrop}
        style={{ backgroundImage: backdrop ? `url(${backdrop})` : 'none' }}
      >
        <div className={styles.backdropVignette} />
        <div className={styles.backdropBottomFade} />

        <div className={styles.heroContent}>
          <div className={styles.metaRow}>
            {ratingPercent !== null && (
              <span className={styles.ratingBadge} title={`Rating: ${media.rating}/10`}>
                {ratingPercent}% Match
              </span>
            )}
            {media.releaseYear && <span>{media.releaseYear}</span>}
            {media.runtimeMinutes && <span>{media.runtimeMinutes} min</span>}
            {media.certification && <span className={styles.kindBadge}>{media.certification}</span>}
            <span className={styles.kindBadge}>{media.mediaKind.toUpperCase()}</span>
          </div>

          <h1 className={styles.title}>{media.defaultTitle}</h1>
          {media.tagline && <p className={styles.tagline}>{media.tagline}</p>}

          <div className={styles.actionsRow}>
            <Link
              href={buildWatchUrl(media.id, isSeries ? selectedSeasonNumber : undefined, isSeries ? 1 : undefined)}
              className={styles.playBtn}
              aria-label={`Watch ${media.defaultTitle}`}
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
              Watch
            </Link>

            <button
              type="button"
              className={styles.watchlistBtn}
              onClick={async () => {
                if (!isAuthenticated) {
                  router.push(`/login?returnUrl=/media/${encodeURIComponent(canonicalId)}`);
                  return;
                }
                await toggleWatchlist();
              }}
              disabled={isWatchlistPending}
              data-in-watchlist={isInWatchlist}
              aria-label={isInWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
              data-testid="detail-watchlist-btn"
            >
              {isInWatchlist ? (
                <>
                  <svg
                    width="20"
                    height="20"
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
                  <span>In Watchlist</span>
                </>
              ) : (
                <>
                  <svg
                    width="20"
                    height="20"
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
                  <span>Add to Watchlist</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <section className={styles.bodySection}>
        <div className={styles.infoGrid}>
          <div className={styles.synopsisCol}>
            <h2 className={styles.sectionHeading}>Synopsis</h2>
            <p className={styles.overviewText}>
              {media.overview || 'No synopsis is available for this title.'}
            </p>
          </div>

          <aside className={styles.creditsCol} aria-label="Media Credits & Details">
            {castList.length > 0 && (
              <div className={styles.creditItem}>
                <span className={styles.creditLabel}>Cast</span>
                <span className={styles.creditValue}>
                  {castList.slice(0, 8).map((c) => (c.character ? `${c.name} (${c.character})` : c.name)).join(', ')}
                </span>
              </div>
            )}

            {directorsList.length > 0 && (
              <div className={styles.creditItem}>
                <span className={styles.creditLabel}>Director</span>
                <span className={styles.creditValue}>
                  {directorsList.map((d) => d.name).join(', ')}
                </span>
              </div>
            )}

            {writersList.length > 0 && (
              <div className={styles.creditItem}>
                <span className={styles.creditLabel}>Writer</span>
                <span className={styles.creditValue}>
                  {writersList.map((w) => w.name).join(', ')}
                </span>
              </div>
            )}

            {media.genres && media.genres.length > 0 && (
              <div className={styles.creditItem}>
                <span className={styles.creditLabel}>Genres</span>
                <div className={styles.genreChips}>
                  {media.genres.map((g) => (
                    <span key={g} className={styles.genreChip}>
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {media.externalIds?.imdbId && (
              <div className={styles.creditItem}>
                <span className={styles.creditLabel}>IMDb ID</span>
                <span className={styles.creditValue}>{media.externalIds.imdbId}</span>
              </div>
            )}
          </aside>
        </div>

        {/* Episodic / Seasons Breakdown for TV Series */}
        {isSeries && totalSeasons > 0 && (
          <section className={styles.seasonsSection} aria-label="Seasons and Episodes">
            <div className={styles.seasonsHeader}>
              <h2 className={styles.sectionHeading}>Episodes</h2>
              <label htmlFor="season-select" className="sr-only">
                Select Season
              </label>
              <select
                id="season-select"
                className={styles.seasonSelect}
                value={selectedSeasonNumber}
                onChange={handleSeasonChange}
                aria-label="Select Season"
              >
                {Array.from({ length: totalSeasons }, (_, i) => i + 1).map((sNum) => (
                  <option key={sNum} value={sNum}>
                    Season {sNum}
                  </option>
                ))}
              </select>
            </div>

            {isSeasonLoading ? (
              <p style={{ color: 'var(--text-muted)' }}>Loading season episodes...</p>
            ) : isSeasonError || !seasonDetail ? (
              <p style={{ color: 'var(--text-muted)' }}>No episodes found for Season {selectedSeasonNumber}.</p>
            ) : (
              <div className={styles.episodeList}>
                {seasonDetail.episodes.map((ep) => (
                  <Link
                    key={ep.id}
                    href={buildWatchUrl(media.id, selectedSeasonNumber, ep.episodeNumber)}
                    className={styles.episodeCard}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                    aria-label={`Play Season ${selectedSeasonNumber} Episode ${ep.episodeNumber}: ${ep.title}`}
                  >
                    <div className={styles.episodeStillWrapper}>
                      {ep.stillUrl ? (
                        <img
                          src={ep.stillUrl}
                          alt={ep.title}
                          className={styles.episodeStill}
                          loading="lazy"
                        />
                      ) : (
                        <div className={styles.episodeStillFallback}>No Preview</div>
                      )}
                    </div>

                    <div className={styles.episodeContent}>
                      <div className={styles.episodeHeader}>
                        <h3 className={styles.episodeNumberTitle}>
                          {ep.episodeNumber}. {ep.title}
                        </h3>
                        {ep.runtimeMinutes && (
                          <span className={styles.episodeRuntime}>{ep.runtimeMinutes}m</span>
                        )}
                      </div>
                      {ep.overview && <p className={styles.episodeOverview}>{ep.overview}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}
      </section>
    </article>
  );
}
