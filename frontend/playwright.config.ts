import { defineConfig, devices } from '@playwright/test';

const devServerUrl = 'http://127.0.0.1:5173';
const useDevServer = process.env.PLAYWRIGHT_USE_DEV_SERVER === 'true';
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? (useDevServer ? devServerUrl : 'http://127.0.0.1:3000');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
      testIgnore: /.*\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: './e2e/.auth/superadmin.json',
      },
    },
  ],
  webServer: useDevServer
    ? {
        command: 'npm run dev -- --host 127.0.0.1 --port 5173',
        url: devServerUrl,
        reuseExistingServer: !process.env.CI,
      }
    : undefined,
});
