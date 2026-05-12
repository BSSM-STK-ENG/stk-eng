import { test, expect } from '@playwright/test';

test.describe('Core pages', () => {
  test('dashboard renders key sections', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: '재고 현황' })).toBeVisible();
    await expect(page.getByText('현재 총 재고')).toBeVisible();
    await expect(page.getByText('최근 7일 입출고 흐름')).toBeVisible();
    await expect(page.getByText('최근 거래')).toBeVisible();
  });

  test('root route opens the default dashboard', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: '재고 현황' })).toBeVisible();
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
    await expect(page.getByRole('button', { name: '입고', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '출고', exact: true })).toBeVisible();
  });

  test('history page renders transaction search and table', async ({ page }) => {
    await page.goto('/history');
    await expect(page.getByRole('main').getByRole('heading', { name: '변경 이력' })).toBeVisible();
    await expect(page.getByPlaceholder('자재명, 코드, 설명, ID 검색')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: '변경일시' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: '자재코드' })).toBeVisible();
  });

  test('closing page renders monthly closing controls', async ({ page }) => {
    await page.goto('/closing');
    await expect(page.getByRole('heading', { name: '월마감 관리' })).toBeVisible();
    await expect(page.getByText('신규 마감 처리')).toBeVisible();
    await expect(page.locator('input[type="month"]')).toBeVisible();
    await expect(page.getByRole('button', { name: '마감 처리' })).toBeVisible();
    await expect(page.getByText('마감 내역')).toBeVisible();
  });

  test('inbound and outbound pages open registration modals', async ({ page }) => {
    await page.goto('/inbound');
    await page.getByRole('button', { name: '신규 입고' }).click();
    await expect(page.getByRole('heading', { name: '신규 입고 등록' })).toBeVisible();
    await page.getByRole('button', { name: '취소', exact: true }).click();

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

  test('account password page renders and validates required current password', async ({ page }) => {
    await page.goto('/account/password');
    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { name: '비밀번호 변경' })).toBeVisible();
    await expect(main.getByLabel('현재 비밀번호')).toBeVisible();
    await expect(main.getByLabel('새 비밀번호', { exact: true })).toBeVisible();
    await main.getByRole('button', { name: '비밀번호 변경' }).click();
    await expect(page.getByText('현재 비밀번호를 입력해주세요.')).toBeVisible();
  });
});
