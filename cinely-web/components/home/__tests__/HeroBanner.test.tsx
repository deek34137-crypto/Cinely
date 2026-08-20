import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { HeroBanner } from '../HeroBanner';
import { ModalProvider } from '../../../context/ModalContext';
import { NormalizedMediaSummary } from '../../../lib/types';

const mockHeroItem: NormalizedMediaSummary = {
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

describe('HeroBanner Component', () => {
  it('renders featured media title, match rating, and action buttons', () => {
    render(
      <ModalProvider>
        <HeroBanner item={mockHeroItem} />
      </ModalProvider>
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Inception' })).toBeInTheDocument();
    expect(screen.getByText('84% Match')).toBeInTheDocument();
    expect(screen.getByText('2010')).toBeInTheDocument();
    expect(screen.getByText('Sci-Fi')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /play inception/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /more information about inception/i })).toBeInTheDocument();
  });

  it('renders skeleton loading state when isLoading is true', () => {
    render(
      <ModalProvider>
        <HeroBanner isLoading={true} />
      </ModalProvider>
    );

    expect(screen.getByLabelText('Loading featured media')).toBeInTheDocument();
  });
});
