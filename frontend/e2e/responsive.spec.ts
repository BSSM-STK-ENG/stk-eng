import { test, expect } from '@playwright/test';

const mockApi = async (page: import('@playwright/test').Page) => {
  await page.route('http://localhost:8080/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/materials')) {
      await route.fulfill({ json: [] });
    } else if (url.includes('/inventory/')) {
      await route.fulfill({ json: [] });
    } else if (url.includes('/closing')) {
      await route.fulfill({ json: [] });
    } else {
      await route.fulfill({ json: {} });
    }
  });
};

test.describe('Responsive design', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.setItem('token', 'test-e2e-token');
      localStorage.setItem('email', 'e2e@test.com');
    });
  });

  test('mobile: sidebar is hidden by default', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/stock/current');
    const desktopSidebar = page.locator('.hidden.lg\\:flex');
    await expect(desktopSidebar).not.toBeVisible();
  });

  test('mobile: hamburger menu opens sidebar', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/stock/current');
    await page.locator('header button').first().click();
    // Wait for slide-in animation (300ms transition)
    const mobileSidebar = page.locator('.fixed.inset-y-0');
    await expect(mobileSidebar).toBeVisible();
    await expect(mobileSidebar.getByText('STK Inventory')).toBeVisible();
  });

  test('desktop: sidebar is visible', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/stock/current');
    await expect(page.getByText('STK Inventory').first()).toBeVisible();
  });
});
