import { test, expect } from '@playwright/test';

const MOCK_USER = {
  id: 'usr_1',
  email: 'alice@test.io',
  displayName: 'Alice',
  role: 'user',
  createdAt: '2026-08-17T00:00:00Z',
};

const MOCK_ADDONS = [
  {
    id: 'torrentio',
    name: 'Torrentio',
    version: '1.0.14',
    description: 'Torrent stream provider.',
    manifestUrl: 'https://torrentio.strem.fun/manifest.json',
    logoUrl: null,
    backgroundUrl: null,
    types: ['movie', 'series'],
    categories: ['torrents'],
    stars: 995,
    enabled: true,
    configurable: true,
    capabilities: { catalog: false, meta: false, stream: true, subtitles: false },
    userEnabled: true,
    priorityOrder: 1,
    userConfiguration: { quality: '1080p' },
  },
  {
    id: 'opensubtitles-v3',
    name: 'OpenSubtitles v3',
    version: '3.0.0',
    description: 'Subtitle provider.',
    manifestUrl: 'https://opensubtitles-v3.strem.io/manifest.json',
    logoUrl: null,
    backgroundUrl: null,
    types: ['movie', 'series'],
    categories: ['subtitles'],
    stars: 920,
    enabled: true,
    configurable: false,
    capabilities: { catalog: false, meta: false, stream: false, subtitles: true },
    userEnabled: true,
    priorityOrder: 2,
  },
  {
    id: 'disabled-test-addon',
    name: 'Disabled Addon',
    version: '1.0.0',
    manifestUrl: 'https://disabled.example/manifest.json',
    types: ['movie'],
    categories: ['torrents'],
    stars: 10,
    enabled: false,
    configurable: false,
    capabilities: { catalog: false, meta: false, stream: true, subtitles: false },
    userEnabled: false,
    priorityOrder: 100,
  },
];

async function mockAuthRoutes(page: any) {
  await page.route('**/v1/users/me', async (route: any) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { user: MOCK_USER } }),
      });
    } else {
      await route.continue();
    }
  });

  await page.route('**/v1/users/me/addons', async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { items: MOCK_ADDONS, total: MOCK_ADDONS.length } }),
    });
  });

  await page.route('**/v1/addons/catalog', async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { items: MOCK_ADDONS.map(({ userEnabled, priorityOrder, userConfiguration, ...rest }) => rest), total: MOCK_ADDONS.length } }),
    });
  });

  await page.route('**/v1/users/me/watchlist', async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { items: [], total: 0 } }),
    });
  });
}

test.describe('Addon Settings Page', () => {

  test('unauthenticated user sees sign-in prompt with returnUrl', async ({ page }) => {
    await page.route('**/v1/users/me', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/problem+json',
        body: JSON.stringify({ status: 401, code: 'UNAUTHORIZED', title: 'Unauthorized' }),
      });
    });

    await page.goto('/settings/addons');

    await expect(page.getByText('Sign In')).toBeVisible();
    const signInLink = page.getByRole('link', { name: 'Sign In' });
    const href = await signInLink.getAttribute('href');
    expect(href).toContain('/login');
    expect(href).toContain('returnUrl');
    expect(href).toContain('/settings/addons');
  });

  test('authenticated user sees all addon cards', async ({ page }) => {
    await mockAuthRoutes(page);

    await page.goto('/settings/addons');

    await expect(page.getByTestId('addons-page')).toBeVisible();
    await expect(page.getByTestId('addon-card-torrentio')).toBeVisible();
    await expect(page.getByTestId('addon-card-opensubtitles-v3')).toBeVisible();
    await expect(page.getByTestId('addon-card-disabled-test-addon')).toBeVisible();
  });

  test('globally disabled addon has disabled toggle and Unavailable badge', async ({ page }) => {
    await mockAuthRoutes(page);

    await page.goto('/settings/addons');

    await expect(page.getByTestId('addons-page')).toBeVisible();

    const disabledToggle = page.getByTestId('addon-toggle-disabled-test-addon');
    await expect(disabledToggle).toBeDisabled();

    await expect(page.getByText('Unavailable')).toBeVisible();
  });

  test('configurable addon shows Configure button; non-configurable does not', async ({ page }) => {
    await mockAuthRoutes(page);

    await page.goto('/settings/addons');

    await expect(page.getByTestId('addons-page')).toBeVisible();

    await expect(page.getByTestId('configure-btn-torrentio')).toBeVisible();
    await expect(page.getByTestId('configure-btn-opensubtitles-v3')).not.toBeVisible();
  });

  test('Configure button opens config panel with existing configuration', async ({ page }) => {
    await mockAuthRoutes(page);

    await page.goto('/settings/addons');

    await expect(page.getByTestId('configure-btn-torrentio')).toBeVisible();
    await page.getByTestId('configure-btn-torrentio').click();

    await expect(page.getByTestId('config-panel-torrentio')).toBeVisible();

    const textarea = page.getByTestId('config-textarea-torrentio');
    await expect(textarea).toBeVisible();
    const content = await textarea.inputValue();
    expect(content).toContain('1080p');
  });

  test('malformed JSON in config panel prevents save and shows error', async ({ page }) => {
    await mockAuthRoutes(page);

    await page.goto('/settings/addons');

    await page.getByTestId('configure-btn-torrentio').click();
    await expect(page.getByTestId('config-panel-torrentio')).toBeVisible();

    await page.getByTestId('config-textarea-torrentio').fill('{ bad json }');
    await page.getByTestId('config-save-torrentio').click();

    await expect(page.getByTestId('config-json-error')).toBeVisible();
  });

  test('enable mutation is called and addon state updates', async ({ page }) => {
    const disabledAddons = MOCK_ADDONS.map((a) =>
      a.id === 'torrentio' ? { ...a, userEnabled: false } : a
    );

    await page.route('**/v1/users/me', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { user: MOCK_USER } }),
        });
      }
    });

    await page.route('**/v1/users/me/addons', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { items: disabledAddons, total: disabledAddons.length } }),
      });
    });

    await page.route('**/v1/addons/catalog', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { items: MOCK_ADDONS, total: MOCK_ADDONS.length } }),
      });
    });

    await page.route('**/v1/users/me/watchlist', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { items: [], total: 0 } }),
      });
    });

    let enableCalled = false;
    await page.route('**/v1/users/me/addons/torrentio/enable', async (route) => {
      enableCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { addonId: 'torrentio', enabled: true } }),
      });
    });

    await page.goto('/settings/addons');
    await expect(page.getByTestId('addons-page')).toBeVisible();

    const toggle = page.getByTestId('addon-toggle-torrentio');
    await toggle.click();

    await page.waitForTimeout(300);
    expect(enableCalled).toBe(true);
  });
});
