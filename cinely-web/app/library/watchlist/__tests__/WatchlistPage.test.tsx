import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import WatchlistPage from '../page';
import { apiClient } from '../../../../lib/api-client';
import { ModalProvider } from '../../../../context/ModalContext';
import { AuthProvider } from '../../../../context/AuthContext';
import { WatchlistResponse } from '../../../../lib/types';

// Mock useRouter
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  usePathname: () => '/library/watchlist',
  useSearchParams: () => new URLSearchParams(),
}));

const mockItems: WatchlistResponse = {
  items: [
    {
      canonicalId: 'cinely:item:mov_tt1375666',
      mediaKind: 'movie',
      title: 'Inception',
      releaseYear: 2010,
      posterUrl: 'https://image.tmdb.org/t/p/w500/inception.jpg',
      backdropUrl: 'https://image.tmdb.org/t/p/original/inception_bg.jpg',
      rating: 8.4,
      overview: 'A thief enters dreams.',
      genres: ['Sci-Fi', 'Action'],
      externalIds: { imdbId: 'tt1375666' },
      addedAt: '2026-08-17T10:00:00.000Z',
    },
    {
      canonicalId: 'cinely:item:ser_tt0903747',
      mediaKind: 'series',
      title: 'Breaking Bad',
      releaseYear: 2008,
      posterUrl: 'https://image.tmdb.org/t/p/w500/bb.jpg',
      backdropUrl: 'https://image.tmdb.org/t/p/original/bb_bg.jpg',
      rating: 9.5,
      overview: 'A chemistry teacher manufactures methamphetamine.',
      genres: ['Drama', 'Crime'],
      externalIds: { imdbId: 'tt0903747' },
      addedAt: '2026-08-17T10:05:00.000Z',
    },
  ],
  total: 2,
};

function renderWatchlistPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ModalProvider>
          <WatchlistPage />
        </ModalProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('WatchlistPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders sign-in prompt with returnUrl when user is unauthenticated', async () => {
    vi.spyOn(apiClient, 'getMe').mockRejectedValueOnce(new Error('Unauthorized'));

    renderWatchlistPage();

    await waitFor(() => {
      expect(screen.getByTestId('watchlist-auth-prompt')).toBeInTheDocument();
    });

    expect(screen.getByText('Sign in to view your Watchlist')).toBeInTheDocument();
    const signInBtn = screen.getByRole('link', { name: /sign in to cinely/i });
    expect(signInBtn).toHaveAttribute('href', '/login?returnUrl=/library/watchlist');
  });

  it('renders empty state when authenticated user has no watchlist items', async () => {
    vi.spyOn(apiClient, 'getMe').mockResolvedValueOnce({
      id: 'usr_1',
      email: 'alice@test.io',
      displayName: 'Alice',
      role: 'user',
      createdAt: '2026-08-17T00:00:00Z',
    });
    vi.spyOn(apiClient, 'getWatchlist').mockResolvedValueOnce({ items: [], total: 0 });

    renderWatchlistPage();

    await waitFor(() => {
      expect(screen.getByTestId('watchlist-empty')).toBeInTheDocument();
    });

    expect(screen.getByText('Your Watchlist is empty')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /explore catalog/i })).toHaveAttribute('href', '/');
  });

  it('renders responsive grid of PosterCard items and total count badge when populated', async () => {
    vi.spyOn(apiClient, 'getMe').mockResolvedValueOnce({
      id: 'usr_1',
      email: 'alice@test.io',
      displayName: 'Alice',
      role: 'user',
      createdAt: '2026-08-17T00:00:00Z',
    });
    vi.spyOn(apiClient, 'getWatchlist').mockResolvedValueOnce(mockItems);

    renderWatchlistPage();

    await waitFor(() => {
      expect(screen.getByTestId('watchlist-grid')).toBeInTheDocument();
    });

    expect(screen.getByTestId('watchlist-count')).toHaveTextContent('2 titles');
    expect(screen.getByText('Inception')).toBeInTheDocument();
    expect(screen.getByText('Breaking Bad')).toBeInTheDocument();
  });
});
