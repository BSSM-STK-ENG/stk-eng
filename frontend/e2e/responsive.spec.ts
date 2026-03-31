import { test, expect } from '@playwright/test';

test.describe('Responsive layout', () => {
  test('mobile navigation opens from hamburger menu only', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/dashboard');

    await expect(page.locator('header button').first()).toBeVisible();
    await page.locator('header button').first().click();
    await expect(page.getByRole('link', { name: '재고 대시보드' })).toBeVisible();
    await expect(page.getByRole('link', { name: '현재 재고' })).toBeVisible();
  });

  test('mobile ledger keeps core content visible', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/stock/ledger');

    await expect(page.getByRole('heading', { name: '재고 수불 조회' })).toBeVisible();
    await expect(page.getByPlaceholder('자재명, 자재코드, 설명, 담당자, 사업장 검색')).toBeVisible();
  });
});
