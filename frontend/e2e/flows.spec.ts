import { test, expect } from '@playwright/test';

test.describe('Key flows', () => {
  test('dashboard cards navigate to filtered current stock views', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByRole('button', { name: /재고 없음/ }).click();
    await expect(page).toHaveURL(/\/stock\/current\?scope=ZERO$/);
    await expect(page.getByRole('button', { name: /재고 없음/ })).toHaveClass(/bg-slate-900/);

    await page.goto('/dashboard');
    await page.getByRole('button', { name: /안전재고 이하/ }).click();
    await expect(page).toHaveURL(/\/stock\/current\?scope=LOW$/);
    await expect(page.getByRole('button', { name: /안전재고 이하/ })).toHaveClass(/bg-slate-900/);
  });

  test('current stock location edit works for slash-based material codes', async ({ page }) => {
    await page.goto('/stock/current?scope=ZERO');
    const targetRow = page.locator('tr', { hasText: 'AA03340001110/AAS1000001987' }).first();
    await expect(targetRow).toBeVisible();

    await targetRow.getByRole('button', { name: '위치 수정' }).click();
    const input = targetRow.getByPlaceholder('위치를 입력하세요');
    const currentValue = await input.inputValue();
    await input.fill(currentValue ? `${currentValue}-PW` : 'PW-TEST');
    await targetRow.getByRole('button', { name: '저장' }).click();

    await expect(page.getByText(/위치를 수정했습니다/)).toBeVisible();
  });
});
