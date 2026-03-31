import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('sidebar shows all main navigation items', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.getByRole('link', { name: '재고 대시보드' })).toBeVisible();
    await expect(page.getByRole('link', { name: '현재 재고' })).toBeVisible();
    await expect(page.getByRole('link', { name: '재고 수불부' })).toBeVisible();
    await expect(page.getByRole('link', { name: '변경 이력' })).toBeVisible();
    await expect(page.getByRole('link', { name: '입고 관리' })).toBeVisible();
    await expect(page.getByRole('link', { name: '출고 관리' })).toBeVisible();
    await expect(page.getByRole('link', { name: '월마감' })).toBeVisible();
    await expect(page.getByRole('link', { name: '사업장 관리' })).toBeVisible();
    await expect(page.getByRole('link', { name: '자재 관리' })).toBeVisible();
    await expect(page.getByRole('link', { name: '사용자 관리' })).toBeVisible();
  });

  test('logout clears session and returns to login', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByRole('button', { name: '로그아웃' }).click();
    await expect(page).toHaveURL(/\/login$/);
  });
});
