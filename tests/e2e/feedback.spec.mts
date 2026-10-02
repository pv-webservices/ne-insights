// "Traveller stories" and the "Share your experience" feedback dialog in a real browser.
// The production build has no approved testimonials, so the populated carousel is tested by swapping
// the section for one rendered from TEST FIXTURES (request interception); fixtures never reach the build.
import { readdir, readFile, stat } from 'node:fs/promises';
import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';
import { travellerStories } from '../../src/components/testimonials.mjs';

test.use({ reducedMotion: 'reduce' });

const TRAVELLER = { name: 'Test Traveller', email: 'traveller@example.com', feedback: 'Automated browser test of the traveller feedback form.' };
const FIXTURES = [1, 2, 3, 4].map((n) => ({ id: `fixture-${n}`, name: `Fixture Traveller ${n}`, rating: n === 4 ? 4 : 5, text: `Fixture testimonial number ${n}, used only by the browser tests.`, journey: 'Fixture journey', location: 'Fixture City' }));

const dialog = (page: Page) => page.locator('#share-your-experience');
const trigger = (page: Page) => page.locator('#traveller-stories [data-feedback-open]');
const statusBox = (page: Page) => page.locator('#form-feedback [data-form-status]');
const enhanced = (page: Page) => page.waitForFunction(() => (document.querySelector('#form-feedback') as HTMLFormElement | null)?.noValidate === true);
const respond = (status: number, body: Record<string, unknown>) => (route: Route) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

const openDialog = async (page: Page) => {
  await page.goto('/');
  await enhanced(page);
  await trigger(page).click();
  await expect(dialog(page)).toHaveJSProperty('open', true);
};
const fillFeedback = async (page: Page) => {
  const form = page.locator('#form-feedback');
  await form.getByLabel('Full name').fill(TRAVELLER.name);
  await form.getByLabel('Email address').fill(TRAVELLER.email);
  await form.locator('label[for="feedback-rating-5"]').click(); // the visible star; the radio itself is visually hidden
  await form.getByLabel('Your experience').fill(TRAVELLER.feedback);
  await form.getByLabel(/may publish my feedback/).check();
  await form.getByLabel(/I have read the privacy policy/).check();
};
/** Serves the real homepage with the stories section rendered from fixtures. */
const withFixtures = async (page: Page) => {
  await page.route('**/', async (route) => {
    if (new URL(route.request().url()).pathname !== '/') return route.fallback();
    const html = await (await route.fetch()).text();
    const section = travellerStories(FIXTURES).split('<dialog')[0];
    await route.fulfill({ contentType: 'text/html; charset=utf-8', body: html.replace(/<section class="section stories-section[\s\S]*?<\/section>/, section) });
  });
};
const axe = async (page: Page) => (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);

test.describe('homepage section', () => {
  test('with no approved testimonials it shows the invitation, not an empty carousel', async ({ page }) => {
    await page.goto('/');
    const section = page.locator('#traveller-stories');
    await expect(section).toHaveClass(/is-empty/);
    await expect(section.getByRole('heading', { level: 2 })).toHaveText('Journeys remembered. Stories shared.');
    await expect(section.getByText('Your journey could inspire the next one.')).toBeVisible();
    await expect(trigger(page)).toBeVisible();
    for (const selector of ['.story-card', '[data-carousel]', '.carousel-btn', '.carousel-progress']) await expect(section.locator(selector)).toHaveCount(0);
    await expect(section).not.toContainText(/\b0 reviews?\b/i);
    await expect(dialog(page)).toBeHidden();
  });

  test('sits between “Why travel with NE Insights” and the moments gallery', async ({ page }) => {
    await page.goto('/');
    const order = await page.evaluate(() => [...document.querySelectorAll('main > section h2')].map((h) => h.textContent?.trim()));
    const why = order.indexOf('Why travel with NE Insights');
    expect(order[why + 2]).toBe('Journeys remembered. Stories shared.'); // "How it works" is inside the Why section
    expect(order[why + 3]).toBe('Moments waiting for you');
  });

  test('approved testimonials appear as a carousel with working controls', async ({ page }) => {
    await withFixtures(page);
    await page.goto('/');
    const section = page.locator('#traveller-stories');
    await expect(section.locator('.story-card')).toHaveCount(4);
    await expect(section.getByRole('img', { name: 'Rated 4 out of 5' })).toHaveCount(1);
    const track = section.locator('.story-track');
    await track.scrollIntoViewIfNeeded();
    const prev = section.getByRole('button', { name: 'Previous traveller stories' });
    const next = section.getByRole('button', { name: 'Next traveller stories' });
    await expect(prev).toBeDisabled();
    await next.click();
    await expect.poll(() => track.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
    await expect(prev).toBeEnabled();
    expect(await axe(page)).toEqual([]);
  });

  for (const width of [320, 375, 768, 1024, 1440]) {
    test(`${width}px: populated and empty sections and the open dialog fit without horizontal scroll`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await withFixtures(page);
      await page.goto('/');
      const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(await overflow()).toBeLessThanOrEqual(0);
      const card = await page.locator('.story-card').first().boundingBox();
      expect(card && card.x >= 0 && card.x + card.width <= width).toBeTruthy();
      await page.unroute('**/');
      await openDialog(page);
      const box = await dialog(page).boundingBox();
      expect(box && box.x >= 0 && box.x + box.width <= width && box.y >= 0 && box.y + box.height <= 800).toBeTruthy();
      const close = await page.getByRole('button', { name: 'Close feedback form' }).boundingBox();
      expect(close && close.width >= 44 && close.height >= 44).toBeTruthy();
      const inner = await page.locator('.feedback-dialog-inner').evaluate((el) => el.scrollWidth - el.clientWidth);
      expect(inner).toBeLessThanOrEqual(0);
      for (const star of await page.locator('.star-rating label').all()) expect((await star.boundingBox())!.width).toBeGreaterThanOrEqual(44);
      expect(await overflow()).toBeLessThanOrEqual(0);
    });
  }
});

test.describe('feedback dialog', () => {
  test('opens as a modal, starts at the first field, keeps focus inside and closes with Escape', async ({ page }) => {
    await openDialog(page);
    await expect(page.locator('#feedback-name')).toBeFocused();
    await expect(page.locator('body')).toHaveClass(/dialog-open/);
    await expect(trigger(page)).toHaveAttribute('aria-haspopup', 'dialog');
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Tab');
      // The page behind is inert: focus is in the dialog (or briefly on the browser UI, reported as <body>).
      expect(await page.evaluate(() => document.activeElement === document.body || !!document.activeElement?.closest('#share-your-experience'))).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(dialog(page)).toHaveJSProperty('open', false);
    await expect(trigger(page)).toBeFocused();
    await expect(page.locator('body')).not.toHaveClass(/dialog-open/);
  });

  test('opens from the keyboard (Enter and Space) and closes with the close button or a backdrop click', async ({ page }) => {
    await page.goto('/');
    await enhanced(page);
    for (const key of ['Enter', ' ']) {
      await trigger(page).focus();
      await page.keyboard.press(key);
      await expect(dialog(page)).toHaveJSProperty('open', true);
      await page.getByRole('button', { name: 'Close feedback form' }).click();
      await expect(dialog(page)).toHaveJSProperty('open', false);
      await expect(trigger(page)).toBeFocused();
    }
    await trigger(page).click();
    await page.mouse.click(4, 4); // the backdrop, outside the panel
    await expect(dialog(page)).toHaveJSProperty('open', false);
    await trigger(page).click();
    await page.locator('#feedback-name').click(); // clicks inside the panel keep it open
    await expect(dialog(page)).toHaveJSProperty('open', true);
  });

  test('the star rating is a keyboard-operable radio group with spoken labels and a text caption', async ({ page }) => {
    await openDialog(page);
    await expect(page.getByRole('group', { name: 'Your rating' })).toBeVisible();
    for (let n = 1; n <= 5; n++) await expect(page.getByRole('radio', { name: `${n} out of 5 stars` })).toHaveCount(1);
    await page.getByRole('radio', { name: '1 out of 5 stars' }).focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('radio', { name: '3 out of 5 stars' })).toBeChecked();
    await expect(page.locator('.rating-caption')).toHaveText(/3 out of 5 · Good/);
    const filled = await page.locator('.star-rating label').evaluateAll((labels) => labels.map((l) => getComputedStyle(l).getPropertyValue('--star-fill').trim() !== 'transparent'));
    expect(filled).toEqual([true, true, true, false, false]);
  });

  test('empty submit lists the six required fields (phone is optional) and focuses the first', async ({ page }) => {
    let requests = 0;
    await page.route('**/api/enquiry', (route) => { requests++; return route.abort(); });
    await openDialog(page);
    await page.getByRole('button', { name: 'Send my feedback' }).click();
    await expect(statusBox(page)).toContainText('Please correct 6 fields');
    await expect(page.locator('#feedback-name')).toBeFocused();
    await expect(page.locator('#feedback-rating-error')).toHaveText('Choose a star rating.');
    await expect(page.locator('#feedback-publish_consent-error')).toContainText('publish your feedback');
    await expect(page.locator('#feedback-consent-error')).toContainText('privacy notice');
    await expect(page.locator('#feedback-phone-error')).toBeHidden();
    await expect(page.locator('#feedback-rating-1')).toHaveAttribute('aria-describedby', /feedback-rating-error/);
    expect(requests).toBe(0);
    expect(await axe(page)).toEqual([]);
  });

  test('a successful send posts form_type=feedback and lands on the feedback thank-you page', async ({ page }) => {
    let payload: Record<string, unknown> = {};
    await page.route('**/api/enquiry', async (route) => { payload = route.request().postDataJSON(); await respond(200, { ok: true, redirect: '/feedback-thank-you/' })(route); });
    await openDialog(page);
    expect(await axe(page)).toEqual([]);
    await fillFeedback(page);
    await page.getByRole('button', { name: 'Send my feedback' }).click();
    await expect(page).toHaveURL(/\/feedback-thank-you\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Thank you for sharing your experience.');
    await expect(page.locator('main')).toContainText('We review submissions before featuring them on the website.');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
    expect(payload).toMatchObject({ form_type: 'feedback', name: TRAVELLER.name, email: TRAVELLER.email, rating: '5', feedback: TRAVELLER.feedback, publish_consent: 'on', consent: 'on', website: '' });
    expect(payload).not.toHaveProperty('message');
  });

  test('a delivery failure keeps the entries and offers alternatives, in feedback wording', async ({ page }) => {
    await page.route('**/api/enquiry', respond(502, { ok: false, code: 'delivery_failed', message: 'We couldn’t deliver your feedback just now.' }));
    await openDialog(page);
    await fillFeedback(page);
    await page.getByRole('button', { name: 'Send my feedback' }).click();
    await expect(statusBox(page)).toContainText('Your feedback was not sent.');
    await expect(statusBox(page).getByRole('link', { name: /email operations@neinsights\.in/ })).toHaveAttribute('href', /subject=Traveller%20feedback/);
    await expect(page.locator('#feedback-name')).toHaveValue(TRAVELLER.name);
    await expect(page.getByRole('radio', { name: '5 out of 5 stars' })).toBeChecked();
  });

  test('a reload restores the draft, including the rating, but never the consent ticks', async ({ page }) => {
    await openDialog(page);
    await fillFeedback(page);
    await page.waitForTimeout(400);
    await page.reload();
    await enhanced(page);
    await trigger(page).click();
    await expect(page.locator('#feedback-name')).toHaveValue(TRAVELLER.name);
    await expect(page.getByRole('radio', { name: '5 out of 5 stars' })).toBeChecked();
    await expect(page.getByLabel(/may publish my feedback/)).not.toBeChecked();
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the button links to the inline form, which posts normally to the feedback thank-you page', async ({ page }) => {
    let body = '';
    await page.route('**/api/enquiry', async (route) => { body = route.request().postData() ?? ''; await route.fulfill({ status: 303, headers: { Location: '/feedback-thank-you/' } }); });
    await page.goto('/');
    await expect(trigger(page)).toHaveAttribute('href', '#share-your-experience');
    await expect(page.locator('#form-feedback')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Close feedback form' })).toBeHidden();
    const form = page.locator('#form-feedback');
    await form.getByLabel('Full name').fill(TRAVELLER.name);
    await form.getByLabel('Email address').fill(TRAVELLER.email);
    await form.locator('label[for="feedback-rating-4"]').click();
    await form.getByLabel('Your experience').fill(TRAVELLER.feedback);
    await form.getByLabel(/may publish my feedback/).check();
    await form.getByLabel(/I have read the privacy policy/).check();
    await form.getByRole('button', { name: 'Send my feedback' }).click();
    await expect(page).toHaveURL(/\/feedback-thank-you\/$/);
    const params = new URLSearchParams(body);
    expect(params.get('form_type')).toBe('feedback');
    expect(params.get('rating')).toBe('4');
    expect(params.get('publish_consent')).toBe('on');
  });
});

test('end to end through the local function: the email is written for review and nothing is published', async ({ page }) => {
  const started = Date.now();
  const token = `E2E-FEEDBACK-${started}`;
  await openDialog(page);
  await fillFeedback(page);
  await page.locator('#form-feedback').getByLabel('Your experience').fill(`${TRAVELLER.feedback} ${token}`);
  await page.waitForTimeout(3100); // the server discards submissions made within 3 s of page load
  await page.getByRole('button', { name: 'Send my feedback' }).click();
  await expect(page).toHaveURL(/\/feedback-thank-you\/$/, { timeout: 20_000 });

  // The preview transport saved the rendered email instead of sending it.
  const dir = new URL('../../output/mail/', import.meta.url);
  const files = await Promise.all((await readdir(dir)).map(async (name) => ({ name, time: (await stat(new URL(name, dir))).mtimeMs })));
  const recent = files.filter((f) => f.time >= started - 1000);
  const emails = await Promise.all(recent.map(async (f) => (await readFile(new URL(f.name, dir), 'utf8')).replace(/=\r?\n/g, '')));
  const email = emails.find((text) => text.includes(token));
  expect(email, 'feedback email saved in output/mail').toBeTruthy();
  expect(email).toContain('Permission to publish');
  expect(email).toMatch(/^Subject: .*traveller.*feedback/im);

  // Submitting does not change the homepage: no testimonial appears until a developer adds an approved one.
  await page.goto('/');
  await expect(page.locator('#traveller-stories')).toHaveClass(/is-empty/);
  await expect(page.locator('.story-card')).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText(token);
});
