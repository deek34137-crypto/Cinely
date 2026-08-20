'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navbar } from '../components/layout/Navbar';
import { HeroBanner } from '../components/home/HeroBanner';
import { MediaRow } from '../components/home/MediaRow';
import { ContinueWatchingRow } from '../components/home/ContinueWatchingRow';
import { apiClient } from '../lib/api-client';
import { queryKeys } from '../lib/query-keys';

export default function HomePage() {
  const {
    data: discoverData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.discovery.sections(),
    queryFn: () => apiClient.getDiscover(),
  });

  const featuredItem = discoverData?.sections?.[0]?.items?.[0];

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <Navbar />

      <main>
        <HeroBanner item={featuredItem} isLoading={isLoading} />

        {isError && (
          <div
            style={{
              padding: 'var(--space-8) var(--row-padding-x)',
              textAlign: 'center',
              backgroundColor: 'var(--bg-surface)',
              margin: 'var(--space-8) var(--row-padding-x)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-2)', color: 'var(--danger)' }}>
              Unable to load catalog
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-4)', fontSize: 'var(--text-sm)' }}>
              {error instanceof Error ? error.message : 'Please check your connection to the Cinely Media Engine.'}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              style={{
                backgroundColor: 'var(--text-primary)',
                color: '#000',
                fontWeight: 'var(--weight-bold)',
                padding: '0.5rem 1.25rem',
                borderRadius: 'var(--radius-md)',
              }}
            >
              Retry Connection
            </button>
          </div>
        )}

        <div style={{ position: 'relative', marginTop: '-3rem', zIndex: 10 }}>
          <ContinueWatchingRow />
          {discoverData?.sections?.map((section) => (
            <MediaRow
              key={section.id}
              title={section.title}
              items={section.items}
            />
          ))}
        </div>
      </main>

      <footer
        style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: 'var(--space-12) var(--row-padding-x)',
          marginTop: 'var(--space-16)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-4)',
          color: 'var(--text-disabled)',
          fontSize: 'var(--text-xs)',
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'flex', gap: 'var(--space-6)', color: 'var(--text-muted)' }}>
          <span>Canonical Discovery Engine</span>
          <span>•</span>
          <span>RFC 7807 Standardized</span>
          <span>•</span>
          <span>Stremio-Compatible Playback</span>
        </div>
        <p>© 2026 Cinely. All rights reserved. Decentralized Media &amp; Stream Resolution Architecture.</p>
      </footer>
    </div>
  );
}
