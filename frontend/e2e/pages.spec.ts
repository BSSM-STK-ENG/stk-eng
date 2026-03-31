import { test, expect } from '@playwright/test';

test.describe('Core pages', () => {
  test('dashboard renders key sections', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: '재고 현황' })).toBeVisible();
    await expect(page.getByText('현재 총 재고')).toBeVisible();
    await expect(page.getByText('최근 7일 입출고 흐름')).toBeVisible();
    await expect(page.getByText('최근 거래')).toBeVisible();
  });

  test('current stock page renders table and filters', async ({ page }) => {
    await page.goto('/stock/current');
    await expect(page.getByRole('heading', { name: '현재 재고 조회' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: '자재명, 자재코드, 위치, 설명 검색' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: '자재코드' })).toBeVisible();
    await expect(page.getByRole('button', { name: /재고 없음/ })).toBeVisible();
  });

  test('ledger page renders list and filters', async ({ page }) => {
    await page.goto('/stock/ledger');
    await expect(page.getByRole('heading', { name: '재고 수불 조회' })).toBeVisible();
    await expect(page.getByPlaceholder('자재명, 자재코드, 설명, 담당자, 사업장 검색')).toBeVisible();
    await expect(page.getByRole('button', { name: '입고' })).toBeVisible();
    await expect(page.getByRole('button', { name: '출고' })).toBeVisible();
  });

  test('inbound and outbound pages open registration modals', async ({ page }) => {
    await page.goto('/inbound');
    await page.getByRole('button', { name: '신규 입고' }).click();
    await expect(page.getByRole('heading', { name: '신규 입고 등록' })).toBeVisible();
    await page.getByRole('button', { name: '취소' }).click();

    await page.goto('/outbound');
    await page.getByRole('button', { name: '신규 출고' }).click();
    await expect(page.getByRole('heading', { name: '신규 출고 등록' })).toBeVisible();
  });

  test('admin pages render', async ({ page }) => {
    await page.goto('/materials');
    await expect(page.locator('h2.admin-page-title')).toHaveText('자재 관리');

    await page.goto('/master-data');
    await expect(page.locator('h2.admin-page-title')).toHaveText('사업장 관리');

    await page.goto('/admin/accounts');
    await expect(page.locator('h2.admin-page-title')).toHaveText('사용자 관리');
  });
});
