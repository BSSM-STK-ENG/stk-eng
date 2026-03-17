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

test.describe('Navigation (authenticated)', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.setItem('token', 'test-e2e-token');
      localStorage.setItem('email', 'e2e@test.com');
    });
    await page.goto('/');
    await page.waitForURL('**/stock/current', { timeout: 5000 });
  });

  test('redirects to /stock/current by default', async ({ page }) => {
    await expect(page).toHaveURL('/stock/current');
  });

  test('sidebar shows all navigation items', async ({ page }) => {
    await expect(page.getByText('입고 관리').first()).toBeVisible();
    await expect(page.getByText('출고 관리').first()).toBeVisible();
    await expect(page.getByText('현재 재고').first()).toBeVisible();
    await expect(page.getByText('재고 수불부').first()).toBeVisible();
    await expect(page.getByText('월마감').first()).toBeVisible();
    await expect(page.getByText('변경 이력').first()).toBeVisible();
  });

  test('displays user email in sidebar', async ({ page }) => {
    await expect(page.getByText('e2e@test.com').first()).toBeVisible();
  });

  test('navigates to inbound page', async ({ page }) => {
    await page.getByText('입고 관리').first().click();
    await expect(page).toHaveURL('/inbound');
  });

  test('navigates to outbound page', async ({ page }) => {
    await page.getByText('출고 관리').first().click();
    await expect(page).toHaveURL('/outbound');
  });

  test('navigates to ledger page', async ({ page }) => {
    await page.getByText('재고 수불부').first().click();
    await expect(page).toHaveURL('/stock/ledger');
  });

  test('navigates to closing page', async ({ page }) => {
    await page.getByText('월마감').first().click();
    await expect(page).toHaveURL('/closing');
  });

  test('navigates to history page', async ({ page }) => {
    await page.getByText('변경 이력').first().click();
    await expect(page).toHaveURL('/history');
  });

  test('logout clears auth and redirects to login', async ({ page }) => {
    await page.locator('header').getByText('로그아웃').click();
    await expect(page).toHaveURL('/login');
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeNull();
  });
});
