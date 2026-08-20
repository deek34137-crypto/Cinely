'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Navbar } from '../../components/layout/Navbar';
import { PosterCard } from '../../components/home/PosterCard';
import { apiClient } from '../../lib/api-client';
import { queryKeys } from '../../lib/query-keys';
import styles from './Search.module.css';

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [searchTerm, setSearchTerm] = useState(initialQuery);

  useEffect(() => {
    setSearchTerm(initialQuery);
  }, [initialQuery]);

  const {
    data: searchData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: queryKeys.discovery.search(initialQuery),
    queryFn: () => apiClient.search(initialQuery),
    enabled: initialQuery.trim().length > 0,
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  const results = searchData?.results || [];

  return (
    <div className={styles.searchContainer}>
      <header className={styles.searchHeader}>
        <h1 className={styles.heading}>Search Catalog</h1>
        <form className={styles.searchForm} onSubmit={handleSearchSubmit} role="search">
          <label htmlFor="search-input" className="sr-only">
            Search for movies, series, and genres
          </label>
          <input
            id="search-input"
            type="search"
            className={styles.searchInput}
            placeholder="Search titles, actors, genres..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
          <button type="submit" className={styles.searchSubmitBtn} aria-label="Submit search">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        </form>
      </header>

      <main>
        {initialQuery.trim().length === 0 ? (
          <div className={styles.emptyState}>
            <p>Enter a query above to explore movies, series, and canonical titles.</p>
          </div>
        ) : isLoading ? (
          <div className={styles.emptyState} aria-busy="true">
            <p>Searching canonical catalog for &ldquo;{initialQuery}&rdquo;...</p>
          </div>
        ) : isError ? (
          <div className={styles.emptyState}>
            <p style={{ color: 'var(--danger)' }}>
              {error instanceof Error ? error.message : 'Error searching catalog.'}
            </p>
          </div>
        ) : results.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No canonical items found matching &ldquo;{initialQuery}&rdquo;.</p>
          </div>
        ) : (
          <>
            <p className={styles.resultsMeta}>
              Found {results.length} result{results.length === 1 ? '' : 's'} for &ldquo;{initialQuery}&rdquo;
            </p>
            <div className={styles.resultsGrid} role="region" aria-label="Search Results">
              {results.map((item) => (
                <PosterCard key={item.canonicalId} item={item} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <>
      <Navbar />
      <Suspense fallback={<div style={{ minHeight: '100dvh', backgroundColor: 'var(--bg-base)' }} />}>
        <SearchContent />
      </Suspense>
    </>
  );
}
