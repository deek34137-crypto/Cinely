import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MediaRow } from '../MediaRow';
import { ModalProvider } from '../../../context/ModalContext';
import { NormalizedMediaSummary } from '../../../lib/types';

const mockItems: NormalizedMediaSummary[] = [
  {
    canonicalId: 'cinely:item:mov_tt1375666',
    mediaKind: 'movie',
    title: 'Inception',
    releaseYear: 2010,
    posterUrl: 'https://image.tmdb.org/t/p/w500/inception.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/inception_bg.jpg',
    rating: 8.4,
    overview: 'Inception overview',
    genres: ['Sci-Fi'],
    externalIds: {},
  },
  {
    canonicalId: 'cinely:item:mov_tt0816692',
    mediaKind: 'movie',
    title: 'Interstellar',
    releaseYear: 2014,
    posterUrl: 'https://image.tmdb.org/t/p/w500/interstellar.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/interstellar_bg.jpg',
    rating: 8.7,
    overview: 'Interstellar overview',
    genres: ['Sci-Fi', 'Adventure'],
    externalIds: {},
  },
];

describe('MediaRow Component', () => {
  it('renders section title and poster cards', () => {
    render(
      <ModalProvider>
        <MediaRow title="Trending Worldwide" items={mockItems} />
      </ModalProvider>
    );

    expect(screen.getByRole('heading', { level: 2, name: 'Trending Worldwide' })).toBeInTheDocument();
    expect(screen.getByText('Inception')).toBeInTheDocument();
    expect(screen.getByText('Interstellar')).toBeInTheDocument();
  });

  it('renders chevron navigation buttons and handles clicks', () => {
    render(
      <ModalProvider>
        <MediaRow title="Trending Worldwide" items={mockItems} />
      </ModalProvider>
    );

    const leftButton = screen.getByRole('button', { name: /scroll trending worldwide left/i });
    const rightButton = screen.getByRole('button', { name: /scroll trending worldwide right/i });

    expect(leftButton).toBeInTheDocument();
    expect(rightButton).toBeInTheDocument();

    fireEvent.click(rightButton);
    fireEvent.click(leftButton);
  });

  it('returns null if items array is empty', () => {
    const { container } = render(
      <ModalProvider>
        <MediaRow title="Empty Row" items={[]} />
      </ModalProvider>
    );

    expect(container.firstChild).toBeNull();
  });
});
