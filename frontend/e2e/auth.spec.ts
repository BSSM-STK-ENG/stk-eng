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

  test('register page validates password confirmation before submitting', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: '회원가입' })).toBeVisible();

    await page.getByLabel('이름').fill('E2E 사용자');
    await page.getByLabel('이메일').fill('e2e-register@example.com');
    await page.getByLabel('비밀번호', { exact: true }).fill('ChangeMe123!');
    await page.getByLabel('비밀번호 확인').fill('Different123!');
    await page.getByRole('button', { name: '인증 메일 받기' }).click();

    await expect(page.getByText('비밀번호 확인이 일치하지 않습니다.')).toBeVisible();
  });

  test('verify email page handles missing token', async ({ page }) => {
    await page.goto('/verify-email');
    await expect(page.getByRole('heading', { name: '이메일 인증' })).toBeVisible();
    await expect(page.getByText('인증 토큰이 없습니다.')).toBeVisible();
    await expect(page.getByRole('button', { name: '로그인으로 이동' })).toBeVisible();
  });

  test('setup password page renders for accounts requiring password setup', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('token', 'e2e.eyJleHAiOjQxMDI0NDQ4MDB9.signature');
      localStorage.setItem('name', '초기 사용자');
      localStorage.setItem('email', 'setup@example.com');
      localStorage.setItem('role', 'USER');
      localStorage.setItem('pagePermissions', JSON.stringify(['DASHBOARD']));
      localStorage.setItem('passwordChangeRequired', 'true');
    });

    await page.goto('/setup-password');
    await expect(page.getByRole('heading', { name: '초기 비밀번호 변경' })).toBeVisible();
    await expect(page.getByText('setup@example.com')).toBeVisible();

    await page.getByLabel('새 비밀번호', { exact: true }).fill('ChangeMe123!');
    await page.getByLabel('새 비밀번호 확인').fill('Different123!');
    await page.getByRole('button', { name: '비밀번호 저장' }).click();

    await expect(page.getByText('비밀번호가 일치하지 않습니다.')).toBeVisible();
  });
});
