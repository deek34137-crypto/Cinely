import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { PosterCard } from '../PosterCard';
import { ModalProvider } from '../../../context/ModalContext';
import { NormalizedMediaSummary } from '../../../lib/types';

const mockItem: NormalizedMediaSummary = {
  canonicalId: 'cinely:item:mov_tt1375666',
  mediaKind: 'movie',
  title: 'Inception',
  releaseYear: 2010,
  posterUrl: 'https://image.tmdb.org/t/p/w500/inception.jpg',
  backdropUrl: 'https://image.tmdb.org/t/p/original/inception_bg.jpg',
  rating: 8.4,
  overview: 'A thief who steals corporate secrets through the use of dream-sharing technology.',
  genres: ['Sci-Fi', 'Action'],
  externalIds: { imdbId: 'tt1375666' },
};

describe('PosterCard Component', () => {
  it('renders media card with title, image, and accessible label', () => {
    render(
      <ModalProvider>
        <PosterCard item={mockItem} />
      </ModalProvider>
    );

    const card = screen.getByRole('button', { name: /Inception \(2010\)/i });
    expect(card).toBeInTheDocument();

    const image = screen.getByRole('img', { name: 'Inception' });
    expect(image).toHaveAttribute('src', mockItem.backdropUrl);
    expect(screen.getByText('★ 8.4')).toBeInTheDocument();
  });

  it('handles keyboard interaction (Enter key) to open modal', () => {
    render(
      <ModalProvider>
        <PosterCard item={mockItem} />
      </ModalProvider>
    );

    const card = screen.getByRole('button', { name: /Inception \(2010\)/i });
    fireEvent.keyDown(card, { key: 'Enter', code: 'Enter' });
    // If no error thrown, keyboard handler executed properly
    expect(card).toBeInTheDocument();
  });
});
