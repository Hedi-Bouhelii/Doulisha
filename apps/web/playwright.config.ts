import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests against the local app and the Neon dev branch.
 * `pnpm --filter @doulisha/web e2e` starts the dev server if it is not running.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  // Generous: locally every query crosses the Atlantic to Neon us-east-2.
  expect: { timeout: 30_000 },
  // One worker: tests share seeded accounts (the admin phone) and the dev outbox.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000/api/trpc/health.ping',
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
