import { test, expect } from '@playwright/test';

test.describe('Media Navigation & Detail View Flow', () => {
  test('home page renders catalog rows and allows quick-preview modal', async ({ page }) => {
    // Intercept /v1/discover with canonical test fixtures
    await page.route('**/v1/discover*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            sections: [
              {
                id: 'trending_now',
                title: 'Trending Worldwide',
                items: [
                  {
                    canonicalId: 'cinely:item:mov_tt1375666',
                    mediaKind: 'movie',
                    title: 'Inception',
                    releaseYear: 2010,
                    backdropUrl: 'https://image.tmdb.org/t/p/original/inception_bg.jpg',
                    posterUrl: 'https://image.tmdb.org/t/p/w500/inception.jpg',
                    rating: 8.4,
                    overview: 'A thief enters dreams.',
                    genres: ['Sci-Fi'],
                    externalIds: { imdbId: 'tt1375666' },
                  },
                ],
              },
            ],
            total: 1,
          },
        }),
      });
    });

    await page.route('**/v1/media/cinely%3Aitem%3Amov_tt1375666', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 'cinely:item:mov_tt1375666',
            mediaKind: 'movie',
            originalTitle: 'Inception',
            defaultTitle: 'Inception',
            overview: 'A thief enters dreams to steal corporate secrets.',
            tagline: 'Your mind is the scene of the crime.',
            releaseYear: 2010,
            runtimeMinutes: 148,
            certification: 'PG-13',
            genres: ['Sci-Fi', 'Action'],
            artwork: {
              backdropUrl: 'https://image.tmdb.org/t/p/original/inception_bg.jpg',
            },
            externalIds: { imdbId: 'tt1375666' },
            rating: 8.4,
            popularityScore: 150,
            directors: [{ name: 'Christopher Nolan' }],
            writers: [{ name: 'Christopher Nolan' }],
            cast: [{ name: 'Leonardo DiCaprio', character: 'Cobb' }],
            createdAt: '2026-08-16T12:00:00Z',
            updatedAt: '2026-08-16T12:00:00Z',
          },
        }),
      });
    });

    await page.goto('/');

    // Home renders row title
    await expect(page.getByRole('heading', { level: 2, name: 'Trending Worldwide' })).toBeVisible();

    // Click card to open modal
    const card = page.getByRole('button', { name: /Inception \(2010\)/i });
    await card.click();

    // Modal dialog is visible
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('heading', { level: 2, name: 'Inception' })).toBeVisible();

    // Click "Full Details & Episodes" to deep-link to canonical route
    const fullDetailsBtn = modal.getByRole('link', { name: /Full Details & Episodes/i });
    await expect(fullDetailsBtn).toBeVisible();
    await fullDetailsBtn.click();

    // Verifies navigation to canonical /media/[id]
    await expect(page).toHaveURL(/\/media\/cinely%3Aitem%3Amov_tt1375666/);
    await expect(page.getByRole('heading', { level: 1, name: 'Inception' })).toBeVisible();
    await expect(page.getByText('Your mind is the scene of the crime.')).toBeVisible();
  });

  test('TV Series canonical page renders seasons and handles query-driven season switching', async ({ page }) => {
    await page.route('**/v1/media/cinely%3Aitem%3Aser_tt0903747', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 'cinely:item:ser_tt0903747',
            mediaKind: 'series',
            originalTitle: 'Breaking Bad',
            defaultTitle: 'Breaking Bad',
            overview: 'A chemistry teacher turns to crime.',
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
            directors: [{ name: 'Vince Gilligan' }],
            writers: [{ name: 'Vince Gilligan' }],
            cast: [{ name: 'Bryan Cranston', character: 'Walter White' }],
            seasonsCount: 2,
            episodesCount: 20,
            createdAt: '2026-08-16T12:00:00Z',
            updatedAt: '2026-08-16T12:00:00Z',
          },
        }),
      });
    });

    await page.route('**/v1/media/cinely%3Aitem%3Aser_tt0903747/seasons/1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
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
                overview: 'Walter White diagnoses.',
                stillUrl: 'https://image.tmdb.org/t/p/w300/pilot.jpg',
                airDate: '2008-01-20',
                runtimeMinutes: 58,
                externalIds: {},
              },
            ],
          },
        }),
      });
    });

    await page.route('**/v1/media/cinely%3Aitem%3Aser_tt0903747/seasons/2', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 'cinely:season:ser_tt0903747:2',
            seriesId: 'cinely:item:ser_tt0903747',
            seasonNumber: 2,
            title: 'Season 2',
            episodes: [
              {
                id: 'cinely:ep:tt0903747:s2:e1',
                seriesId: 'cinely:item:ser_tt0903747',
                seasonNumber: 2,
                episodeNumber: 1,
                title: 'Seven Thirty-Seven',
                overview: 'Walt and Jesse calculate.',
                stillUrl: 'https://image.tmdb.org/t/p/w300/s2e1.jpg',
                airDate: '2009-03-08',
                runtimeMinutes: 47,
                externalIds: {},
              },
            ],
          },
        }),
      });
    });

    await page.goto('/media/cinely:item:ser_tt0903747');

    await expect(page.getByRole('heading', { level: 1, name: 'Breaking Bad' })).toBeVisible();
    await expect(page.getByText('1. Pilot')).toBeVisible();

    // Select Season 2
    const seasonSelect = page.getByRole('combobox', { name: /select season/i });
    await seasonSelect.selectOption('2');

    // URL updates with ?season=2
    await expect(page).toHaveURL(/season=2/);
    await expect(page.getByText('1. Seven Thirty-Seven')).toBeVisible();
  });

  test('search flow allows finding items and navigating to details', async ({ page }) => {
    await page.route('**/v1/search?q=Inception*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            query: 'Inception',
            count: 1,
            results: [
              {
                canonicalId: 'cinely:item:mov_tt1375666',
                mediaKind: 'movie',
                title: 'Inception',
                releaseYear: 2010,
                posterUrl: 'https://image.tmdb.org/t/p/w500/inception.jpg',
                rating: 8.4,
                genres: ['Sci-Fi'],
                externalIds: {},
              },
            ],
          },
        }),
      });
    });

    await page.goto('/search?q=Inception');

    await expect(page.getByRole('heading', { level: 1, name: 'Search Catalog' })).toBeVisible();
    await expect(page.getByText(/Found 1 result for “Inception”/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Inception \(2010\)/i })).toBeVisible();
  });
});
