import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ContinueWatchingRow } from '../ContinueWatchingRow';
import { apiClient } from '../../../lib/api-client';
import { AuthProvider } from '../../../context/AuthContext';
import { ProgressResponse } from '../../../lib/types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

const mockProgressWithTV: ProgressResponse = {
  items: [
    {
      mediaId: 'cinely:item:mov_tt1375666',
      seasonNumber: 0,
      episodeNumber: 0,
      positionSeconds: 5184,
      durationSeconds: 8880,
      progressPercent: 58,
      completed: false,
      updatedAt: '2026-08-17T10:00:00.000Z',
    },
    {
      mediaId: 'cinely:item:ser_tt0903747',
      seasonNumber: 2,
      episodeNumber: 4,
      positionSeconds: 840,
      durationSeconds: 2820,
      progressPercent: 29,
      completed: false,
      updatedAt: '2026-08-17T09:00:00.000Z',
    },
  ],
  total: 2,
};

function renderContinueWatching() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ContinueWatchingRow />
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('ContinueWatchingRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing for unauthenticated users (auth 401)', async () => {
    vi.spyOn(apiClient, 'getMe').mockRejectedValueOnce(new Error('Unauthorized'));

    const { container } = renderContinueWatching();

    // Should render nothing for unauthenticated visitors
    await new Promise((r) => setTimeout(r, 50));
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when there are no in-progress items', async () => {
    vi.spyOn(apiClient, 'getMe').mockResolvedValueOnce({
      id: 'usr_1', email: 'alice@test.io', displayName: 'Alice', role: 'user', createdAt: '2026-08-17T00:00:00Z',
    });
    vi.spyOn(apiClient, 'getProgress').mockResolvedValueOnce({ items: [], total: 0 });

    const { container } = renderContinueWatching();

    await waitFor(() => {
      expect(container.querySelector('[data-testid="continue-watching-row"]')).toBeNull();
    });
  });

  it('renders Continue Watching row with movie and TV episode cards', async () => {
    vi.spyOn(apiClient, 'getMe').mockResolvedValueOnce({
      id: 'usr_1', email: 'alice@test.io', displayName: 'Alice', role: 'user', createdAt: '2026-08-17T00:00:00Z',
    });
    vi.spyOn(apiClient, 'getProgress').mockResolvedValueOnce(mockProgressWithTV);

    renderContinueWatching();

    await waitFor(() => {
      expect(screen.getByTestId('continue-watching-row')).toBeInTheDocument();
    });

    // Both in-progress items should appear
    expect(screen.getByTestId('continue-card-cinely:item:mov_tt1375666')).toBeInTheDocument();
    expect(screen.getByTestId('continue-card-cinely:item:ser_tt0903747')).toBeInTheDocument();

    // TV episode tag should be visible in card metadata
    expect(screen.getByText('S02 E04')).toBeInTheDocument();

    // Progress percentages
    expect(screen.getByText('58% watched')).toBeInTheDocument();
    expect(screen.getByText('29% watched')).toBeInTheDocument();
  });

  it('completed items are excluded from Continue Watching', async () => {
    vi.spyOn(apiClient, 'getMe').mockResolvedValueOnce({
      id: 'usr_1', email: 'alice@test.io', displayName: 'Alice', role: 'user', createdAt: '2026-08-17T00:00:00Z',
    });
    vi.spyOn(apiClient, 'getProgress').mockResolvedValueOnce({
      items: [
        {
          mediaId: 'cinely:item:mov_tt4154796',
          seasonNumber: 0,
          episodeNumber: 0,
          positionSeconds: 11160,
          durationSeconds: 11160,
          progressPercent: 100,
          completed: true,
          updatedAt: '2026-08-17T08:00:00.000Z',
        },
      ],
      total: 1,
    });

    const { container } = renderContinueWatching();

    // The completed item is excluded → row should not render
    await waitFor(() => {
      expect(container.querySelector('[data-testid="continue-watching-row"]')).toBeNull();
    });
  });

  it('remove button calls deleteProgress mutation', async () => {
    vi.spyOn(apiClient, 'getMe').mockResolvedValueOnce({
      id: 'usr_1', email: 'alice@test.io', displayName: 'Alice', role: 'user', createdAt: '2026-08-17T00:00:00Z',
    });
    vi.spyOn(apiClient, 'getProgress').mockResolvedValue(mockProgressWithTV);
    const deleteSpy = vi.spyOn(apiClient, 'deleteProgress').mockResolvedValueOnce({
      message: 'Deleted.',
    });

    renderContinueWatching();

    await waitFor(() => {
      expect(screen.getByTestId('continue-watching-row')).toBeInTheDocument();
    });

    const removeBtn = screen.getByTestId('remove-progress-cinely:item:mov_tt1375666');
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith('cinely:item:mov_tt1375666', {
        seasonNumber: undefined,
        episodeNumber: undefined,
      });
    });
  });
});
