import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MediaDetailView } from '../MediaDetailView';
import { apiClient } from '../../../lib/api-client';
import { AuthProvider } from '../../../context/AuthContext';
import { NormalizedMediaDetail, NormalizedSeasonDetail } from '../../../lib/types';

// Mock Next.js navigation hooks
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
  }),
  usePathname: () => '/media/cinely:item:ser_tt0903747',
  useSearchParams: () => new URLSearchParams('season=1'),
}));

const mockMovieDetail: NormalizedMediaDetail = {
  id: 'cinely:item:mov_tt1375666',
  mediaKind: 'movie',
  originalTitle: 'Inception',
  defaultTitle: 'Inception',
  overview: 'A thief enters dreams to steal corporate secrets.',
  tagline: 'Your mind is the scene of the crime.',
  releaseDate: '2010-07-15',
  releaseYear: 2010,
  runtimeMinutes: 148,
  certification: 'PG-13',
  genres: ['Sci-Fi', 'Action'],
  artwork: {
    backdropUrl: 'https://image.tmdb.org/t/p/original/inception_bg.jpg',
    posterUrl: 'https://image.tmdb.org/t/p/w500/inception.jpg',
  },
  externalIds: { imdbId: 'tt1375666' },
  rating: 8.4,
  popularityScore: 150,
  directors: [{ name: 'Christopher Nolan', role: 'Director' }],
  writers: [{ name: 'Christopher Nolan', role: 'Writer' }],
  cast: [{ name: 'Leonardo DiCaprio', character: 'Cobb' }],
  createdAt: '2026-08-16T12:00:00Z',
  updatedAt: '2026-08-16T12:00:00Z',
};

const mockSeriesDetail: NormalizedMediaDetail = {
  id: 'cinely:item:ser_tt0903747',
  mediaKind: 'series',
  originalTitle: 'Breaking Bad',
  defaultTitle: 'Breaking Bad',
  overview: 'A high school chemistry teacher diagnosed with lung cancer turns to manufacturing methamphetamine.',
  tagline: 'All Hail the King.',
  releaseDate: '2008-01-20',
  releaseYear: 2008,
  runtimeMinutes: 47,
  certification: 'TV-MA',
  genres: ['Drama', 'Crime'],
  artwork: {
    backdropUrl: 'https://image.tmdb.org/t/p/original/bb_bg.jpg',
  },
  externalIds: { imdbId: 'tt0903747' },
  rating: 9.5,
  popularityScore: 200,
  directors: [{ name: 'Vince Gilligan', role: 'Director' }],
  writers: [{ name: 'Vince Gilligan', role: 'Writer' }],
  cast: [{ name: 'Bryan Cranston', character: 'Walter White' }],
  seasonsCount: 5,
  episodesCount: 62,
  createdAt: '2026-08-16T12:00:00Z',
  updatedAt: '2026-08-16T12:00:00Z',
};

const mockSeason1: NormalizedSeasonDetail = {
  id: 'cinely:season:ser_tt0903747:1',
  seriesId: 'cinely:item:ser_tt0903747',
  seasonNumber: 1,
  title: 'Season 1',
  episodes: [
    {
      id: 'cinely:ep:tt0903747:s1:e1',
      seriesId: 'cinely:item:ser_tt0903747',
      seasonNumber: 1,
      episodeNumber: 1,
      title: 'Pilot',
      overview: 'Walter White learns he has terminal cancer and teams up with Jesse Pinkman.',
      stillUrl: 'https://image.tmdb.org/t/p/w300/pilot.jpg',
      airDate: '2008-01-20',
      runtimeMinutes: 58,
      externalIds: {},
    },
  ],
};

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{ui}</AuthProvider>
    </QueryClientProvider>
  );
}

describe('MediaDetailView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders canonical movie details with cast, directors, genres, and synopsis', async () => {
    vi.spyOn(apiClient, 'getMedia').mockResolvedValueOnce(mockMovieDetail);

    renderWithClient(<MediaDetailView canonicalId="cinely:item:mov_tt1375666" />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Inception' })).toBeInTheDocument();
    });

    expect(screen.getByText('Your mind is the scene of the crime.')).toBeInTheDocument();
    expect(screen.getByText('84% Match')).toBeInTheDocument();
    expect(screen.getByText('148 min')).toBeInTheDocument();
    expect(screen.getByText('PG-13')).toBeInTheDocument();
    expect(screen.getAllByText('Christopher Nolan').length).toBe(2);
    expect(screen.getByText('Leonardo DiCaprio (Cobb)')).toBeInTheDocument();
    expect(screen.getByText('tt1375666')).toBeInTheDocument();
  });

  it('renders TV series details with season selector and episodic breakdown', async () => {
    vi.spyOn(apiClient, 'getMedia').mockResolvedValueOnce(mockSeriesDetail);
    vi.spyOn(apiClient, 'getSeason').mockResolvedValueOnce(mockSeason1);

    renderWithClient(<MediaDetailView canonicalId="cinely:item:ser_tt0903747" />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Breaking Bad' })).toBeInTheDocument();
    });

    // Season selector with 5 options
    const seasonSelect = screen.getByRole('combobox', { name: /select season/i });
    expect(seasonSelect).toBeInTheDocument();
    expect(seasonSelect).toHaveValue('1');

    // Episode 1 Pilot
    await waitFor(() => {
      expect(screen.getByText('1. Pilot')).toBeInTheDocument();
      expect(screen.getByText(/Walter White learns he has terminal cancer/i)).toBeInTheDocument();
    });
  });

  it('triggers query-driven navigation when season selection changes', async () => {
    vi.spyOn(apiClient, 'getMedia').mockResolvedValueOnce(mockSeriesDetail);
    vi.spyOn(apiClient, 'getSeason').mockResolvedValueOnce(mockSeason1);

    renderWithClient(<MediaDetailView canonicalId="cinely:item:ser_tt0903747" />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Breaking Bad' })).toBeInTheDocument();
    });

    const seasonSelect = screen.getByRole('combobox', { name: /select season/i });
    fireEvent.change(seasonSelect, { target: { value: '2' } });

    expect(pushMock).toHaveBeenCalledWith('/media/cinely:item:ser_tt0903747?season=2');
  });

  it('renders watchlist button and allows authenticated user to add to watchlist', async () => {
    vi.spyOn(apiClient, 'getMedia').mockResolvedValueOnce(mockMovieDetail);
    vi.spyOn(apiClient, 'getMe').mockResolvedValueOnce({
      id: 'usr_1',
      email: 'alice@test.io',
      displayName: 'Alice',
      role: 'user',
      createdAt: '2026-08-17T00:00:00Z',
    });
    vi.spyOn(apiClient, 'getWatchlist').mockResolvedValueOnce({ items: [], total: 0 });
    const addSpy = vi.spyOn(apiClient, 'addToWatchlist').mockResolvedValueOnce({
      mediaId: 'cinely:item:mov_tt1375666',
      inWatchlist: true,
    });

    renderWithClient(<MediaDetailView canonicalId="cinely:item:mov_tt1375666" />);

    await waitFor(() => {
      expect(screen.getByTestId('detail-watchlist-btn')).toBeInTheDocument();
    });

    const watchlistBtn = screen.getByTestId('detail-watchlist-btn');
    expect(watchlistBtn).toHaveTextContent('Add to Watchlist');

    fireEvent.click(watchlistBtn);

    await waitFor(() => {
      expect(addSpy).toHaveBeenCalledWith('cinely:item:mov_tt1375666');
    });
  });
});

