import fs from 'node:fs';
import path from 'node:path';
import { test as setup, expect } from '@playwright/test';

const authFile = '/Users/Projects/stk-eng/frontend/e2e/.auth/superadmin.json';

setup('authenticate super admin', async ({ page }) => {
  const email = process.env.E2E_SUPER_ADMIN_EMAIL ?? 'superadmin@stk.local';
  const password = process.env.E2E_SUPER_ADMIN_PASSWORD ?? 'ChangeMe123!';
  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  await page.goto('/login');
  await page.getByLabel('이메일').fill(email);
  await page.getByLabel('비밀번호').fill(password);
  await page.getByRole('button', { name: '로그인' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await page.context().storageState({ path: authFile });
});
