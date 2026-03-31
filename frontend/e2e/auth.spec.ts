import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('login page displays correctly', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('STK-ENG')).toBeVisible();
    await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible();
    await expect(page.getByLabel('이메일')).toBeVisible();
    await expect(page.getByLabel('비밀번호')).toBeVisible();
    await expect(page.getByRole('button', { name: '로그인' })).toBeVisible();
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('이메일').fill('invalid@test.com');
    await page.getByLabel('비밀번호').fill('wrongpassword');
    await page.getByRole('button', { name: '로그인' }).click();
    await expect(page.getByText(/이메일 또는 비밀번호가 올바르지 않습니다|로그인에 실패했습니다|이메일 인증이 완료되지 않았습니다/)).toBeVisible();
  });
});
