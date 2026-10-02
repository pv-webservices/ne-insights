// Site-wide checks on every built page: console errors, failed requests, images, 404s, redirects,
// responsive layout, tap targets, keyboard access and reduced motion.
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

interface Route { url: string; index: boolean }
const { routes } = JSON.parse(readFileSync(new URL('../../output/routes.json', import.meta.url), 'utf8')) as { routes: Route[] };
const PAGES = routes.filter((r) => r.url !== '/404.html').map((r) => r.url);
const KEY_PAGES = ['/', '/destinations/meghalaya/', '/tour-packages/', '/tour-packages/summer-ne-07/', '/contact/', '/plan-my-trip/', '/about/', '/thank-you/', '/feedback/'];
const WIDTHS = [320, 375, 768, 1024, 1440];
const MIN_TARGET = 24; // WCAG 2.2 AA (2.5.8) minimum target size in CSS pixels

/** Scrolls through the page so lazy images load, then reports any image that failed to decode. */
const brokenImages = async (page: Page) => {
  await page.evaluate(async () => {
    document.documentElement.style.scrollBehavior = 'auto';
    for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
    document.querySelectorAll('img[loading="lazy"]').forEach((img) => img.setAttribute('loading', 'eager'));
  });
  await page.waitForLoadState('networkidle');
  // Wait for every rendered image to finish (load or error) before judging it; slow machines may still be decoding.
  await page.evaluate(() => Promise.all([...document.images].filter((img) => img.getClientRects().length > 0 && !img.complete)
    .map((img) => new Promise((resolve) => { img.addEventListener('load', resolve, { once: true }); img.addEventListener('error', resolve, { once: true }); setTimeout(resolve, 15000); }))));
  // Images inside closed panels (e.g. the WhatsApp widget) are not rendered and rightly never load.
  return page.evaluate(() => [...document.images].filter((img) => img.getClientRects().length > 0 && (!img.complete || img.naturalWidth === 0)).map((img) => img.currentSrc || img.src));
};

test.describe('every page loads cleanly', () => {
  for (const url of PAGES) {
    test(`${url}: no console errors or failed requests`, async ({ page }) => {
      if (KEY_PAGES.includes(url)) test.setTimeout(120_000); // scrolls the whole page and waits for every image
      const errors: string[] = [];
      page.on('console', (msg) => { if (msg.type() === 'error' || msg.type() === 'warning') errors.push(`${msg.type()}: ${msg.text()}`); });
      page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
      page.on('response', (res) => { if (res.status() >= 400 && res.url().startsWith('http://localhost')) errors.push(`${res.status()} ${res.url()}`); });
      const response = await page.goto(url, { waitUntil: 'load' });
      expect(response?.status()).toBe(200);
      if (KEY_PAGES.includes(url)) expect(await brokenImages(page)).toEqual([]);
      expect(errors).toEqual([]);
    });
  }
});

test('unknown URLs return the branded 404 page with a real 404 status', async ({ page }) => {
  const response = await page.goto('/this-page-does-not-exist/');
  expect(response?.status()).toBe(404);
  await expect(page.locator('h1')).toContainText('off the beaten path');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
  expect(await page.locator('link[rel="canonical"]').count()).toBe(0);
  for (const name of ['Destinations', 'Tour packages', 'Contact us']) await expect(page.locator('main').getByRole('link', { name: new RegExp(name) }).first()).toBeVisible();
  await expect(page.locator('main a[href="tel:+918473833199"]')).toBeVisible();
});

test('thank-you page is noindex without a canonical and is not in the sitemap', async ({ page, request }) => {
  await page.goto('/thank-you/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
  expect(await page.locator('link[rel="canonical"]').count()).toBe(0);
  const sitemap = await (await request.get('/sitemap-pages.xml')).text();
  expect(sitemap).not.toContain('/thank-you/');
});

test('redirects: /index.html, folder index files, missing trailing slash, old sitemap and retired package URLs', async ({ request }) => {
  const cases: [string, string][] = [
    ['/index.html', '/'],
    ['/about/index.html', '/about/'],
    ['/about', '/about/'],
    ['/sitemap.xml', '/sitemap-index.xml'],
    ['/tour-packages/meghalaya-explorer/', '/tour-packages/summer-ne-07/'],
  ];
  for (const [from, to] of cases) {
    const res = await request.get(from, { maxRedirects: 0 });
    expect(res.status(), from).toBe(301);
    expect(res.headers().location, from).toBe(to);
  }
});

test('favicons and the web manifest are served', async ({ request }) => {
  for (const file of ['/favicon.ico', '/favicon.svg', '/favicon-48x48.png', '/favicon-96x96.png', '/apple-touch-icon.png', '/icon-192x192.png', '/icon-512x512.png', '/site.webmanifest', '/robots.txt', '/sitemap-index.xml']) {
    expect((await request.get(file)).status(), file).toBe(200);
  }
  const manifest = await (await request.get('/site.webmanifest')).json();
  expect(manifest).toMatchObject({ short_name: 'NE Insights', theme_color: expect.any(String), background_color: expect.any(String) });
});

test.describe('responsive layout', () => {
  for (const width of WIDTHS) {
    test(`${width}px: no horizontal scroll and tap targets of at least ${MIN_TARGET}px`, async ({ page }) => {
      test.setTimeout(180_000); // eight pages per width
      await page.setViewportSize({ width, height: 900 });
      const problems: string[] = [];
      for (const url of KEY_PAGES) {
        await page.goto(url);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        if (overflow > 0) problems.push(`${url}: ${overflow}px horizontal overflow`);
        const small = await page.evaluate((min) => {
          const inline = (el: Element) => el.closest('p, li > small, .fine, .form-note, .mini-note, .breadcrumbs, .credits-list, td, dd, .help-contact, .about-links, .form-status, label, .consent') !== null && el.tagName === 'A';
          return [...document.querySelectorAll('a[href], button, input:not([type="hidden"]), select, textarea, summary')]
            .filter((el) => {
              const style = getComputedStyle(el);
              const box = el.getBoundingClientRect();
              if (style.visibility === 'hidden' || style.display === 'none' || box.width === 0 || el.closest('[hidden], .honeypot, [aria-hidden="true"], .dropdown, .nav-panel-head, .nav-panel-foot, .wa-panel')) return false;
              if (inline(el)) return false; // links inside sentences are exempt (WCAG 2.5.8 inline exception)
              // Tick boxes and radios (e.g. the star rating) are operated through their label, which is the real target.
              const input = el as HTMLInputElement;
              if (input.type === 'checkbox' || input.type === 'radio') { const label = input.labels?.[0]; if (label && label.getBoundingClientRect().height >= min && label.getBoundingClientRect().width >= min) return false; }
              return box.width < min || box.height < min;
            })
            .map((el) => `${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).split(' ')[0] : ''} ${Math.round(el.getBoundingClientRect().width)}×${Math.round(el.getBoundingClientRect().height)} "${(el.textContent || (el as HTMLInputElement).name || '').trim().slice(0, 30)}"`);
        }, MIN_TARGET);
        problems.push(...small.map((s) => `${url}: small target ${s}`));
      }
      expect(problems).toEqual([]);
    });
  }
});

test('keyboard: the skip link is first, visible on focus and moves focus to the main content', async ({ page }) => {
  await page.goto('/about/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  const box = await skip.boundingBox();
  expect(box && box.y >= 0).toBeTruthy();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main$/);
  await page.keyboard.press('Tab');
  const inMain = await page.evaluate(() => !!document.activeElement?.closest('main'));
  expect(inMain).toBe(true);
});

test('keyboard: focused controls have a visible focus indicator', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/contact/');
  const missing: string[] = [];
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(350); // let the 0.3 s focus transition finish
    const info = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const style = getComputedStyle(el);
      const visible = (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) || style.boxShadow !== 'none';
      return { visible, label: `${el.tagName.toLowerCase()} ${(el.textContent || el.getAttribute('name') || '').trim().slice(0, 30)}` };
    });
    if (info && !info.visible) missing.push(info.label);
  }
  expect(missing).toEqual([]);
});

test('keyboard: the mobile menu opens, traps nothing and closes with Escape', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/');
  const toggle = page.getByRole('button', { name: 'Open navigation' });
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#navigation')).toHaveClass(/is-open/);
  await page.keyboard.press('Escape');
  await expect(page.locator('#navigation')).not.toHaveClass(/is-open/);
  await expect(toggle).toBeFocused();
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('animations are disabled and all content is visible without scrolling effects', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-hero]')).toHaveClass(/is-paused/);
    expect(await page.locator('[data-reveal]').count()).toBe(0);
    // Animations are either removed or shortened to an instant (≤ 0.01 ms) by the reduced-motion CSS.
    const moving = await page.evaluate(() => [...document.querySelectorAll('.hero-title .line > span, .hero-slide img, .marquee-track, .hero-copy > *')]
      .map((el) => getComputedStyle(el))
      .filter((style) => style.animationName !== 'none' && parseFloat(style.animationDuration) * (style.animationDuration.endsWith('ms') ? 1 : 1000) > 0.01)
      .map((style) => style.animationName));
    expect(moving).toEqual([]);
  });
});
