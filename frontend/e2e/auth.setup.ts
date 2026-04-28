import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test as setup, expect, type APIRequestContext } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const authFile = path.join(__dirname, '.auth', 'superadmin.json');
const e2eBusinessUnit = 'QA-T1';
const e2eMaterialCode = 'AA03340001110/AAS1000001987';

setup('authenticate super admin', async ({ page, request }) => {
  const email = process.env.E2E_SUPER_ADMIN_EMAIL ?? 'superadmin@stk.local';
  const password = process.env.E2E_SUPER_ADMIN_PASSWORD ?? 'ChangeMe123!';
  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  await page.goto('/login');
  await page.getByLabel('이메일').fill(email);
  await page.getByLabel('비밀번호').fill(password);
  await page.getByRole('button', { name: '로그인' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  const token = await page.evaluate(() => window.localStorage.getItem('token'));
  if (!token) {
    throw new Error('E2E login did not store an auth token.');
  }
  await seedE2eData(request, token);
  await page.context().storageState({ path: authFile });
});

async function seedE2eData(request: APIRequestContext, token: string) {
  const headers = { Authorization: `Bearer ${token}` };
  const businessUnitsResponse = await request.get('/api/master-data/business-units', { headers });
  if (!businessUnitsResponse.ok()) {
    throw new Error(`Failed to read business units for E2E seed: ${businessUnitsResponse.status()}`);
  }
  const businessUnits = (await businessUnitsResponse.json()) as Array<{ name: string }>;
  if (!businessUnits.some((unit) => unit.name === e2eBusinessUnit)) {
    const createBusinessUnitResponse = await request.post('/api/master-data/business-units', {
      headers,
      data: { name: e2eBusinessUnit },
    });
    if (!createBusinessUnitResponse.ok()) {
      throw new Error(`Failed to seed E2E business unit: ${createBusinessUnitResponse.status()}`);
    }
  }

  const materialsResponse = await request.get('/api/materials', { headers });
  if (!materialsResponse.ok()) {
    throw new Error(`Failed to read materials for E2E seed: ${materialsResponse.status()}`);
  }
  const materials = (await materialsResponse.json()) as Array<{ materialCode: string }>;
  if (!materials.some((material) => material.materialCode === e2eMaterialCode)) {
    const createMaterialResponse = await request.post('/api/materials', {
      headers,
      data: {
        materialCode: e2eMaterialCode,
        materialName: 'E2E slash-code material',
        description: 'Seeded for Playwright coverage',
        location: 'QA-T1 shelf',
        safeStockQty: 1,
        currentStockQty: 0,
      },
    });
    if (!createMaterialResponse.ok()) {
      throw new Error(`Failed to seed E2E material: ${createMaterialResponse.status()}`);
    }
  }
}
