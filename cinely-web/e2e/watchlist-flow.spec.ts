import { test, expect } from '@playwright/test';

test.describe('Frontend Watchlist Flow', () => {
  test('unauthenticated visitor visiting /library/watchlist sees sign-in prompt and returnUrl link', async ({ page }) => {
    await page.route('**/v1/users/me', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/problem+json',
        body: JSON.stringify({
          type: 'https://api.cinely.io/errors/UNAUTHORIZED',
          title: 'Unauthorized',
          status: 401,
          detail: 'Authentication required.',
          code: 'UNAUTHORIZED',
        }),
      });
    });

    await page.goto('/library/watchlist');

    const prompt = page.getByTestId('watchlist-auth-prompt');
    await expect(prompt).toBeVisible();
    await expect(page.getByText('Sign in to view your Watchlist')).toBeVisible();

    const signInLink = page.getByRole('link', { name: /sign in to cinely/i });
    await expect(signInLink).toBeVisible();
    await expect(signInLink).toHaveAttribute('href', '/login?returnUrl=/library/watchlist');
  });

  test('authenticated user can add to watchlist from media detail and view in /library/watchlist', async ({ page }) => {
    let watchlistState: any[] = [];

    await page.route('**/v1/users/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            user: {
              id: 'cinely:user:123',
              email: 'alice@matrix.io',
              displayName: 'Alice',
              role: 'user',
              createdAt: '2026-08-17T00:00:00Z',
            },
          },
        }),
      });
    });

    await page.route('**/v1/media/cinely%3Aitem%3Amov_tt1375666*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 'cinely:item:mov_tt1375666',
            mediaKind: 'movie',
            originalTitle: 'Inception',
            defaultTitle: 'Inception',
            overview: 'A thief enters dreams.',
            releaseYear: 2010,
            runtimeMinutes: 148,
            genres: ['Sci-Fi', 'Action'],
            artwork: {
              posterUrl: 'https://image.tmdb.org/t/p/w500/inception.jpg',
              backdropUrl: 'https://image.tmdb.org/t/p/original/inception_bg.jpg',
            },
            externalIds: { imdbId: 'tt1375666' },
            rating: 8.4,
            popularityScore: 150,
            directors: [{ name: 'Christopher Nolan', role: 'Director' }],
            writers: [{ name: 'Christopher Nolan', role: 'Writer' }],
            cast: [{ name: 'Leonardo DiCaprio', character: 'Cobb' }],
            createdAt: '2026-08-16T12:00:00Z',
            updatedAt: '2026-08-16T12:00:00Z',
          },
        }),
      });
    });

    await page.route('**/v1/users/me/watchlist/cinely%3Aitem%3Amov_tt1375666', async (route) => {
      if (route.request().method() === 'POST') {
        watchlistState = [
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
            addedAt: new Date().toISOString(),
          },
        ];
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              mediaId: 'cinely:item:mov_tt1375666',
              inWatchlist: true,
              addedAt: new Date().toISOString(),
            },
          }),
        });
      } else if (route.request().method() === 'DELETE') {
        watchlistState = [];
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              mediaId: 'cinely:item:mov_tt1375666',
              inWatchlist: false,
            },
          }),
        });
      }
    });

    await page.route('**/v1/users/me/watchlist', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            items: watchlistState,
            total: watchlistState.length,
          },
        }),
      });
    });

    // 1. Visit media detail page
    await page.goto('/media/cinely:item:mov_tt1375666');

    // 2. Click Add to Watchlist
    const watchlistBtn = page.getByTestId('detail-watchlist-btn');
    await expect(watchlistBtn).toBeVisible();
    await expect(watchlistBtn).toHaveText(/Add to Watchlist/i);

    await watchlistBtn.click();
    await expect(watchlistBtn).toHaveText(/In Watchlist/i);

    // 3. Navigate to Watchlist page
    await page.goto('/library/watchlist');

    // 4. Verify item exists in grid
    const grid = page.getByTestId('watchlist-grid');
    await expect(grid).toBeVisible();
    await expect(page.getByText('Inception')).toBeVisible();
    await expect(page.getByTestId('watchlist-count')).toHaveTextContent('1 title');
  });
});
