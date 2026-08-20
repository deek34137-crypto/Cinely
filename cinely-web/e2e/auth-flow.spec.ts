import { test, expect } from '@playwright/test';

test.describe('Frontend Authentication Flow', () => {
  test('unauthenticated visitor sees Sign In button in navbar', async ({ page }) => {
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
          timestamp: new Date().toISOString(),
        }),
      });
    });

    await page.route('**/v1/discover*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            sections: [
              {
                id: 'sec_trending',
                title: 'Trending Now',
                items: [
                  {
                    id: 'cinely:item:mov_1',
                    mediaKind: 'movie',
                    title: 'Inception',
                    releaseYear: 2010,
                    artwork: { posterUrl: 'https://image.tmdb.org/t/p/w500/test.jpg' },
                  },
                ],
              },
            ],
            total: 1,
          },
        }),
      });
    });

    await page.goto('/');
    const signInBtn = page.getByRole('link', { name: 'Sign In' });
    await expect(signInBtn).toBeVisible();

    await signInBtn.click();
    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
  });

  test('login with invalid credentials displays error alert', async ({ page }) => {
    await page.route('**/v1/users/me', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/problem+json',
        body: JSON.stringify({ status: 401, code: 'UNAUTHORIZED' }),
      });
    });

    await page.route('**/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/problem+json',
        body: JSON.stringify({
          type: 'https://api.cinely.io/errors/INVALID_CREDENTIALS',
          title: 'Invalid Credentials',
          status: 401,
          detail: 'Email or password is incorrect.',
          code: 'INVALID_CREDENTIALS',
          timestamp: new Date().toISOString(),
        }),
      });
    });

    await page.goto('/login');

    await page.getByLabel('Email Address').fill('wrong@cinely.io');
    await page.getByLabel('Password').fill('WrongPassword123');
    await page.getByRole('button', { name: 'Sign In' }).click();

    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('Email or password is incorrect.');
  });

  test('login successfully authenticates and updates navbar profile menu', async ({ page }) => {
    let isAuthenticatedState = false;

    await page.route('**/v1/users/me', async (route) => {
      if (isAuthenticatedState) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              user: {
                id: 'cinely:user:neo',
                email: 'neo@matrix.io',
                displayName: 'Thomas Anderson',
                role: 'user',
                createdAt: '2026-01-01',
              },
            },
          }),
        });
      } else {
        await route.fulfill({
          status: 401,
          contentType: 'application/problem+json',
          body: JSON.stringify({ status: 401, code: 'UNAUTHORIZED' }),
        });
      }
    });

    await page.route('**/v1/auth/login', async (route) => {
      isAuthenticatedState = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            user: {
              id: 'cinely:user:neo',
              email: 'neo@matrix.io',
              displayName: 'Thomas Anderson',
              role: 'user',
              createdAt: '2026-01-01',
            },
            tokens: {
              accessToken: 'mock_jwt_access',
              refreshToken: 'rt_mock_refresh',
              expiresIn: 900,
              tokenType: 'Bearer',
            },
          },
        }),
      });
    });

    await page.route('**/v1/discover*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            sections: [],
            total: 0,
          },
        }),
      });
    });

    await page.goto('/login');
    await page.getByLabel('Email Address').fill('neo@matrix.io');
    await page.getByLabel('Password').fill('Password123!');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page).toHaveURL('/');

    const profileButton = page.getByLabel('User Profile Menu');
    await expect(profileButton).toBeVisible();
    await expect(profileButton).toHaveText('TA');

    // Open user menu
    await profileButton.click();
    await expect(page.getByText('Thomas Anderson')).toBeVisible();
    await expect(page.getByText('neo@matrix.io')).toBeVisible();
  });
});
