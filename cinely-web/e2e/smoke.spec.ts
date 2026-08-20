import { test, expect } from '@playwright/test';

test.describe('E2E Smoke Test', () => {
  test('home page renders initial heading', async ({ page }) => {
    await page.goto('/');
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toHaveText('Cinely Web');
  });
});
