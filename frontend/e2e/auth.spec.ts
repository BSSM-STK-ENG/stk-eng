import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('login page displays correctly', async ({ page }) => {
    await expect(page.getByText('STK Inventory')).toBeVisible();
    await expect(page.getByPlaceholder('name@company.com')).toBeVisible();
    await expect(page.getByPlaceholder('••••••••')).toBeVisible();
    await expect(page.getByRole('button', { name: /로그인/ })).toBeVisible();
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.route('http://localhost:8080/api/auth/login', async (route) => {
      await route.fulfill({ status: 401, json: { message: 'Invalid credentials' } });
    });
    await page.getByPlaceholder('name@company.com').fill('invalid@test.com');
    await page.getByPlaceholder('••••••••').fill('wrongpassword');
    await page.getByRole('button', { name: /로그인/ }).click();
    await expect(page.getByText(/로그인에 실패했습니다/)).toBeVisible({ timeout: 5000 });
  });

  test('navigates to register page', async ({ page }) => {
    await page.getByText('회원가입').click();
    await expect(page).toHaveURL('/register');
    await expect(page.getByText('관리자 계정을 생성해 주세요.')).toBeVisible();
  });

  test('register page displays correctly', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByText('회원가입')).toBeVisible();
    await expect(page.getByPlaceholder('name@company.com')).toBeVisible();
    const passwordInputs = page.getByPlaceholder('••••••••');
    await expect(passwordInputs).toHaveCount(2);
    await expect(page.getByRole('button', { name: /가입하기/ })).toBeVisible();
  });

  test('register shows password mismatch error', async ({ page }) => {
    await page.goto('/register');
    await page.getByPlaceholder('name@company.com').fill('test@test.com');
    const passwordInputs = page.getByPlaceholder('••••••••');
    await passwordInputs.nth(0).fill('password1');
    await passwordInputs.nth(1).fill('password2');
    await page.getByRole('button', { name: /가입하기/ }).click();

    await expect(page.getByText(/비밀번호가 일치하지 않습니다/)).toBeVisible();
  });

  test('redirects to login when accessing protected page without auth', async ({ page }) => {
    await page.goto('/stock/current');
    await expect(page).toHaveURL('/login');
  });
});
