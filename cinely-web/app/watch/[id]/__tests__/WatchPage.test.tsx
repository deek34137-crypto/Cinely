import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import WatchPage from '../page';
import { apiClient } from '../../../../lib/api-client';
import { AuthProvider } from '../../../../context/AuthContext';
import { PlaybackResponse } from '../../../../lib/types';

const routerPushMock = vi.fn();
let mockParamsId = encodeURIComponent('cinely:item:mov_tt1375666');
let mockSearchParamsStr = '';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: routerPushMock,
    back: vi.fn(),
    replace: vi.fn(),
  }),
  useParams: () => ({
    id: mockParamsId,
  }),
  useSearchParams: () => new URLSearchParams(mockSearchParamsStr),
}));

describe('WatchPage Component (Phase 3C)', () => {
  let queryClient: QueryClient;

  const mockPlaybackMovie: PlaybackResponse = {
    mediaId: 'cinely:item:mov_tt1375666',
    mediaKind: 'movie',
    title: 'Inception',
    seasonNumber: 0,
    episodeNumber: 0,
    selected: {
      id: 'cinely:str:comet:1080',
      providerId: 'comet',
      providerName: 'Comet',
      name: 'Comet 1080p',
      title: 'Inception.1080p.MP4',
      protocol: 'http',
      url: 'https://cdn.example.com/inception.mp4',
      isWebPlayable: true,
      quality: '1080p',
      score: 10_000,
    },
    alternatives: [],
    totalPlayable: 1,
    hasPlayableSource: true,
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.restoreAllMocks();
    mockParamsId = encodeURIComponent('cinely:item:mov_tt1375666');
    mockSearchParamsStr = '';
  });

  const renderPage = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <WatchPage />
        </AuthProvider>
      </QueryClientProvider>
    );
  };

  it('renders loading state initially and then displays video player', async () => {
    vi.spyOn(apiClient, 'getPlayback').mockResolvedValueOnce(mockPlaybackMovie);

    renderPage();

    // Verify loading skeleton
    expect(screen.getByTestId('watch-loading-skeleton')).toBeInTheDocument();

    // Verify player resolves
    await waitFor(() => {
      expect(screen.getByTestId('cinely-video-player')).toBeInTheDocument();
    });

    expect(screen.getByText('Inception')).toBeInTheDocument();
  });

  it('handles TV series coordinates from query params', async () => {
    mockParamsId = encodeURIComponent('cinely:item:ser_tt0903747');
    mockSearchParamsStr = 'season=1&episode=3';

    vi.spyOn(apiClient, 'getPlayback').mockResolvedValueOnce({
      ...mockPlaybackMovie,
      mediaId: 'cinely:item:ser_tt0903747',
      mediaKind: 'series',
      title: 'Breaking Bad',
      seasonNumber: 1,
      episodeNumber: 3,
    });

    vi.spyOn(apiClient, 'getSeason').mockResolvedValueOnce({
      id: 'cinely:season:ser_tt0903747:1',
      seriesId: 'cinely:item:ser_tt0903747',
      seasonNumber: 1,
      title: 'Season 1',
      overview: 'Overview',
      posterUrl: null,
      airDate: null,
      episodes: [
        {
          id: 'cinely:ep:ser_tt0903747:1:3',
          seriesId: 'cinely:item:ser_tt0903747',
          seasonNumber: 1,
          episodeNumber: 3,
          title: '...And the Bag\'s in the River',
          overview: 'Walt and Jesse clean up.',
          stillUrl: null,
          airDate: null,
          runtimeMinutes: 48,
          externalIds: {},
        },
        {
          id: 'cinely:ep:ser_tt0903747:1:4',
          seriesId: 'cinely:item:ser_tt0903747',
          seasonNumber: 1,
          episodeNumber: 4,
          title: 'Cancer Man',
          overview: 'Walt tells the rest of his family about his cancer.',
          stillUrl: null,
          airDate: null,
          runtimeMinutes: 48,
          externalIds: {},
        },
      ],
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('cinely-video-player')).toBeInTheDocument();
    });

    expect(screen.getByText('Breaking Bad')).toBeInTheDocument();
    expect(screen.getByTestId('player-episode-badge')).toHaveTextContent('S01 E03');

    await waitFor(() => {
      expect(screen.getByTestId('player-next-episode-btn')).toBeInTheDocument();
    });
  });
});
