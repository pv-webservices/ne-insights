import { defineConfig, devices } from '@playwright/test';

const PORT = 4400;
// The approval test publishes (then removes) a fixture testimonial in the shared local store, so it runs
// on its own after every other test, which expects the homepage without approved testimonials.
const APPROVAL_TEST = '**/feedback-approval.spec.mts';

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/*.spec.mts',
  fullyParallel: true,
  workers: 3,
  timeout: 60_000,
  reporter: [['list']],
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: APPROVAL_TEST },
    { name: 'approval', use: { ...devices['Desktop Chrome'] }, testMatch: APPROVAL_TEST, dependencies: ['chromium'] },
  ],
  webServer: {
    // Production build (indexable markup) served locally; enquiries go to the preview transport, never sent.
    // Approved testimonials go to a throwaway local file that is emptied when the server starts.
    command: 'node scripts/build.mjs --production && node scripts/serve.mjs --no-build',
    url: `http://localhost:${PORT}/`,
    env: { PORT: String(PORT), TESTIMONIAL_STORE: 'output/e2e-testimonials-store.json', RESET_TESTIMONIAL_STORE: 'true' },
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
