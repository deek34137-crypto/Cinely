import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VideoPlayer } from '../VideoPlayer';
import { PlaybackResponse } from '../../../lib/types';
import { AuthProvider } from '../../../context/AuthContext';

describe('VideoPlayer Component (Phase 3C)', () => {
  let queryClient: QueryClient;

  const mockPlayback: PlaybackResponse = {
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
      title: 'Inception.1080p.HLS',
      protocol: 'http',
      url: 'https://cdn.example.com/inception.mp4',
      isWebPlayable: true,
      quality: '1080p',
      score: 10_000,
    },
    alternatives: [
      {
        id: 'cinely:str:mf:720',
        providerId: 'mediafusion',
        providerName: 'MediaFusion',
        name: 'MediaFusion 720p',
        title: 'Inception.720p.MP4',
        protocol: 'http',
        url: 'https://cdn.example.com/inception720.mp4',
        isWebPlayable: true,
        quality: '720p',
        score: 9_000,
      },
    ],
    totalPlayable: 2,
    hasPlayableSource: true,
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.restoreAllMocks();
  });

  const renderComponent = (props: Partial<React.ComponentProps<typeof VideoPlayer>> = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <VideoPlayer
            playbackData={mockPlayback}
            onBack={vi.fn()}
            {...props}
          />
        </AuthProvider>
      </QueryClientProvider>
    );
  };

  it('renders video element and controls with media title and provider badge', () => {
    renderComponent();

    expect(screen.getByTestId('cinely-video-player')).toBeInTheDocument();
    expect(screen.getByTestId('html5-video-element')).toBeInTheDocument();
    expect(screen.getByText('Inception')).toBeInTheDocument();
    expect(screen.getByTestId('source-selector-btn')).toHaveTextContent('Comet');
  });

  it('renders empty fallback screen when zero playable streams exist', () => {
    renderComponent({
      playbackData: {
        ...mockPlayback,
        selected: null,
        alternatives: [],
        totalPlayable: 0,
        hasPlayableSource: false,
      },
    });

    expect(screen.getByTestId('player-no-streams')).toBeInTheDocument();
    expect(screen.getByText(/No Playable Streams Available/i)).toBeInTheDocument();
    expect(screen.getByTestId('player-retry-btn')).toBeInTheDocument();
  });

  it('allows opening manual source selector modal and switching active source', () => {
    renderComponent();

    const sourceBtn = screen.getByTestId('source-selector-btn');
    fireEvent.click(sourceBtn);

    expect(screen.getByTestId('source-switcher-modal')).toBeInTheDocument();
    expect(screen.getByTestId('source-item-cinely:str:mf:720')).toBeInTheDocument();

    // Click alternative stream
    fireEvent.click(screen.getByTestId('source-item-cinely:str:mf:720'));

    // Modal closes and active source updates
    expect(screen.queryByTestId('source-switcher-modal')).not.toBeInTheDocument();
    expect(screen.getByTestId('source-selector-btn')).toHaveTextContent('MediaFusion');
  });

  it('calls onBack handler when back button is clicked', () => {
    const onBack = vi.fn();
    renderComponent({ onBack });

    const backBtn = screen.getByTestId('player-back-btn');
    fireEvent.click(backBtn);

    expect(onBack).toHaveBeenCalled();
  });
});
