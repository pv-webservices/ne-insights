import { defineConfig, devices } from '@playwright/test';

const PORT = 4400;

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/*.spec.mts',
  fullyParallel: true,
  workers: 3,
  timeout: 60_000,
  reporter: [['list']],
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Production build (indexable markup) served locally; enquiries go to the preview transport, never sent.
    command: 'node scripts/build.mjs --production && node scripts/serve.mjs --no-build',
    url: `http://localhost:${PORT}/`,
    env: { PORT: String(PORT) },
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
