import { expect, test } from '@playwright/test';

test('loads dashboard and shows skills manager title', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Skills Manager')).toBeVisible();
  await expect(page.locator('#path-filter')).toBeVisible();
  await expect(page.locator('#source-root')).toBeVisible();
  await expect(page.locator('#batch-availability-mode')).toBeVisible();
  await expect(page.locator('#pick-root-target-directory-button')).toBeVisible();
});
