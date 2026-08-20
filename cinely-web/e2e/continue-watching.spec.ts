import { test, expect } from '@playwright/test';

test.describe('Continue Watching Flow', () => {
  test('authenticated user with in-progress items sees Continue Watching row on homepage', async ({ page }) => {
    await page.route('**/v1/users/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            user: { id: 'usr_1', email: 'alice@test.io', displayName: 'Alice', role: 'user', createdAt: '2026-08-17T00:00:00Z' },
          },
        }),
      });
    });

    await page.route('**/v1/discover*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { sections: [], total: 0 } }),
      });
    });

    await page.route('**/v1/users/me/progress', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
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
            },
          }),
        });
      }
    });

    // Mock watchlist so WatchlistContext doesn't fail
    await page.route('**/v1/users/me/watchlist', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { items: [], total: 0 } }),
      });
    });

    await page.goto('/');

    const row = page.getByTestId('continue-watching-row');
    await expect(row).toBeVisible();

    // Movie card
    await expect(page.getByTestId('continue-card-cinely:item:mov_tt1375666')).toBeVisible();
    await expect(page.getByText('58% watched').first()).toBeVisible();

    // TV episode card with S/E label
    await expect(page.getByTestId('continue-card-cinely:item:ser_tt0903747')).toBeVisible();
    await expect(page.getByText('S02 E04').first()).toBeVisible();
    await expect(page.getByText('29% watched').first()).toBeVisible();
  });

  test('Continue Watching row is hidden for unauthenticated users', async ({ page }) => {
    await page.route('**/v1/users/me', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/problem+json',
        body: JSON.stringify({ status: 401, code: 'UNAUTHORIZED', title: 'Unauthorized' }),
      });
    });

    await page.route('**/v1/discover*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { sections: [], total: 0 } }),
      });
    });

    await page.goto('/');

    // The Continue Watching row must not be in the page for guests
    await expect(page.getByTestId('continue-watching-row')).not.toBeVisible();
  });

  test('completed items are excluded from Continue Watching row', async ({ page }) => {
    await page.route('**/v1/users/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            user: { id: 'usr_1', email: 'alice@test.io', displayName: 'Alice', role: 'user', createdAt: '2026-08-17T00:00:00Z' },
          },
        }),
      });
    });

    await page.route('**/v1/discover*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { sections: [], total: 0 } }),
      });
    });

    await page.route('**/v1/users/me/progress', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
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
            },
          }),
        });
      }
    });

    await page.route('**/v1/users/me/watchlist', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { items: [], total: 0 } }),
      });
    });

    await page.goto('/');

    // Row should not exist since only completed item exists
    await expect(page.getByTestId('continue-watching-row')).not.toBeVisible();
  });
});
