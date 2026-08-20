import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SearchPage from '../page';
import { apiClient } from '../../../lib/api-client';
import { ModalProvider } from '../../../context/ModalContext';
import { AuthProvider } from '../../../context/AuthContext';
import { SearchResponse } from '../../../lib/types';

const searchPushMock = vi.fn();
let mockSearchParamQ = 'Inception';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: searchPushMock,
    replace: vi.fn(),
  }),
  usePathname: () => '/search',
  useSearchParams: () => new URLSearchParams(`q=${mockSearchParamQ}`),
}));

const mockSearchResponse: SearchResponse = {
  query: 'Inception',
  count: 1,
  results: [
    {
      canonicalId: 'cinely:item:mov_tt1375666',
      mediaKind: 'movie',
      title: 'Inception',
      releaseYear: 2010,
      posterUrl: 'https://image.tmdb.org/t/p/w500/inception.jpg',
      backdropUrl: 'https://image.tmdb.org/t/p/original/inception_bg.jpg',
      rating: 8.4,
      overview: 'A thief enters dreams.',
      genres: ['Sci-Fi'],
      externalIds: { imdbId: 'tt1375666' },
    },
  ],
};

function renderSearchPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ModalProvider>
          <SearchPage />
        </ModalProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('SearchPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParamQ = 'Inception';
    vi.spyOn(apiClient, 'getMe').mockRejectedValue(new Error('Unauthorized'));
  });

  it('renders search input and queries results from API', async () => {
    vi.spyOn(apiClient, 'search').mockResolvedValueOnce(mockSearchResponse);

    renderSearchPage();

    await waitFor(() => {
      expect(screen.getByText(/Found 1 result for “Inception”/i)).toBeInTheDocument();
      expect(screen.getByText('Inception')).toBeInTheDocument();
    });
  });

  it('submits new search query via form', async () => {
    vi.spyOn(apiClient, 'search').mockResolvedValueOnce(mockSearchResponse);

    renderSearchPage();

    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'Interstellar' } });

    const submitBtn = screen.getByRole('button', { name: /submit search/i });
    fireEvent.click(submitBtn);

    expect(searchPushMock).toHaveBeenCalledWith('/search?q=Interstellar');
  });

  it('handles empty results state gracefully', async () => {
    vi.spyOn(apiClient, 'search').mockResolvedValueOnce({
      query: 'Nonexistent',
      count: 0,
      results: [],
    });
    mockSearchParamQ = 'Nonexistent';

    renderSearchPage();

    await waitFor(() => {
      expect(screen.getByText(/No canonical items found matching “Nonexistent”/i)).toBeInTheDocument();
    });
  });
});
