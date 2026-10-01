// axe-core WCAG 2.1 A/AA scan of every page (desktop), key pages on a phone, and the form error state.
import { readFileSync } from 'node:fs';
import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const { routes } = JSON.parse(readFileSync(new URL('../../output/routes.json', import.meta.url), 'utf8')) as { routes: { url: string }[] };
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

const scan = async (page: Page) => {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  return results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
};

// Reduced motion shows every scroll-revealed element immediately, so contrast is measured on final colours.
test.use({ reducedMotion: 'reduce' });

for (const { url } of routes) {
  test(`axe ${url}`, async ({ page }) => {
    await page.goto(url === '/404.html' ? '/missing-page-for-axe/' : url);
    expect(await scan(page)).toEqual([]);
  });
}

test.describe('phone width', () => {
  test.use({ viewport: { width: 375, height: 812 } });
  for (const url of ['/', '/contact/', '/tour-packages/', '/about/']) {
    test(`axe ${url} at 375px with the menu open`, async ({ page }) => {
      await page.goto(url);
      expect(await scan(page)).toEqual([]);
      await page.getByRole('button', { name: 'Open navigation' }).click();
      expect(await scan(page)).toEqual([]);
    });
  }
});

test('axe on the contact form error state', async ({ page }) => {
  await page.goto('/contact/');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.locator('[data-form-status]')).toBeVisible();
  expect(await scan(page)).toEqual([]);
});
