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

const authenticate = async (page: import('@playwright/test').Page) => {
  await page.goto('/login');
  await page.evaluate(() => {
    localStorage.setItem('token', 'test-e2e-token');
    localStorage.setItem('email', 'e2e@test.com');
  });
};

test.describe('Page rendering (authenticated)', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await authenticate(page);
  });

  test('CurrentStock page renders with table headers', async ({ page }) => {
    await page.goto('/stock/current');
    await expect(page.locator('main').getByText('현재 재고 조회')).toBeVisible();
    await expect(page.getByText('엑셀 다운로드')).toBeVisible();
  });

  test('CurrentStock page has search input', async ({ page }) => {
    await page.goto('/stock/current');
    await expect(page.getByPlaceholder('자재명, 코드, 위치 검색...')).toBeVisible();
  });

  test('CurrentStock page shows stats cards', async ({ page }) => {
    await page.goto('/stock/current');
    await expect(page.getByText('총 자재 수')).toBeVisible();
    await expect(page.getByText('총 재고량')).toBeVisible();
  });

  test('Inbound page renders with action buttons', async ({ page }) => {
    await page.goto('/inbound');
    await expect(page.getByText('신규 입고')).toBeVisible();
    await expect(page.getByText('일괄 업로드').first()).toBeVisible();
    await expect(page.getByText('다운로드')).toBeVisible();
  });

  test('Inbound page opens new transaction modal', async ({ page }) => {
    await page.goto('/inbound');
    await page.getByText('신규 입고').click();
    await expect(page.getByText('신규 입고 등록')).toBeVisible();
  });

  test('Inbound modal can be closed', async ({ page }) => {
    await page.goto('/inbound');
    await page.getByText('신규 입고').click();
    await expect(page.getByText('신규 입고 등록')).toBeVisible();
    await page.locator('.fixed').getByRole('button', { name: '취소' }).click();
    await expect(page.getByText('신규 입고 등록')).not.toBeVisible();
  });

  test('Outbound page renders with action buttons', async ({ page }) => {
    await page.goto('/outbound');
    await expect(page.getByText('신규 출고')).toBeVisible();
    await expect(page.getByText('일괄 업로드').first()).toBeVisible();
  });

  test('Outbound page opens new transaction modal', async ({ page }) => {
    await page.goto('/outbound');
    await page.getByText('신규 출고').click();
    await expect(page.getByText('신규 출고 등록')).toBeVisible();
    await expect(page.getByText('출고 담당자')).toBeVisible();
  });

  test('Ledger page renders with filter buttons', async ({ page }) => {
    await page.goto('/stock/ledger');
    await expect(page.locator('main').getByText('재고 수불부')).toBeVisible();
    await expect(page.getByRole('button', { name: /전체/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /입고/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /출고/ })).toBeVisible();
  });

  test('Closing page renders with month input', async ({ page }) => {
    await page.goto('/closing');
    await expect(page.getByText('월마감 관리')).toBeVisible();
    await expect(page.getByText('마감 대상 월')).toBeVisible();
    await expect(page.getByText('마감 생성/처리')).toBeVisible();
  });

  test('Closing page shows stats', async ({ page }) => {
    await page.goto('/closing');
    await expect(page.getByText('마감 완료')).toBeVisible();
    await expect(page.getByText('미마감')).toBeVisible();
  });

  test('History page renders', async ({ page }) => {
    await page.goto('/history');
    await expect(page.locator('main').getByText('변경 이력')).toBeVisible();
    await expect(page.getByPlaceholder('자재명, 코드, ID 검색...')).toBeVisible();
  });

  test('Inbound upload modal opens and closes', async ({ page }) => {
    await page.goto('/inbound');
    await page.getByText('일괄 업로드').first().click();
    await expect(page.getByText('입고 일괄 업로드')).toBeVisible();
    await page.locator('.fixed').getByRole('button', { name: '취소' }).click();
    await expect(page.getByText('입고 일괄 업로드')).not.toBeVisible();
  });
});
