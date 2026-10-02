// The whole approval loop through the local server: submit feedback → the email's Approve link → the review
// page → published on the homepage and /feedback/ without a rebuild → Reject removes it again.
// Runs in its own Playwright project after all other tests (see playwright.config.mts). FIXTURE DATA ONLY.
import { readdir, readFile, stat } from 'node:fs/promises';
import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

test.use({ reducedMotion: 'reduce' });

const MAIL_DIR = new URL('../../output/mail/', import.meta.url);
/** Decodes a quoted-printable MIME part (soft line breaks and =XX bytes). */
const decodeQp = (part: string) => Buffer.from(part.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16))), 'latin1').toString('utf8');

const findEmail = async (marker: string, since: number): Promise<string> => {
  for (const name of await readdir(MAIL_DIR)) {
    if ((await stat(new URL(name, MAIL_DIR))).mtimeMs < since - 1000) continue;
    const text = decodeQp(await readFile(new URL(name, MAIL_DIR), 'utf8'));
    if (text.includes(marker)) return text;
  }
  throw new Error('feedback email not found in output/mail');
};

const submitFeedback = async (page: Page, marker: string) => {
  await page.goto('/feedback/');
  await page.waitForFunction(() => (document.querySelector('#form-feedback') as HTMLFormElement | null)?.noValidate === true);
  const form = page.locator('#form-feedback');
  await form.getByLabel('Full name').fill('Fixture Traveller');
  await form.getByLabel('Email address').fill('fixture@example.com');
  await form.locator('label[for="feedback-rating-4"]').click();
  await form.getByLabel('Your experience').fill(`Fixture feedback for the approval test. ${marker}`);
  await form.getByLabel(/may publish my feedback/).check();
  await form.getByLabel(/I have read the privacy policy/).check();
  await page.waitForTimeout(3100); // the server discards submissions made within 3 s of page load
  await form.getByRole('button', { name: 'Send my feedback' }).click();
  await expect(page).toHaveURL(/\/feedback-thank-you\/$/, { timeout: 20_000 });
};

const storyCards = (page: Page, marker: string) => page.locator('.story-card', { hasText: marker });

test('approve from the email publishes on the website without a rebuild; reject removes it', async ({ page }) => {
  test.setTimeout(120_000);
  const started = Date.now();
  const marker = `E2E-APPROVAL-${started.toString(36)}`; // letters and digits: a long digit run would look like a phone number
  await submitFeedback(page, marker);

  const email = await findEmail(marker, started);
  const approveUrl = email.match(/^Approve & publish: (\S+)$/m)?.[1];
  const rejectUrl = email.match(/^Reject: (\S+)$/m)?.[1];
  expect(approveUrl, 'approve link in the email').toMatch(/^http:\/\/localhost:\d+\/api\/feedback-review\?t=v1\./);
  expect(rejectUrl).toMatch(/&do=reject$/);

  // Opening the link (as a mail scanner would) changes nothing.
  await page.goto(approveUrl!);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Review traveller feedback');
  await expect(page.getByText('Not on the website')).toBeVisible();
  expect(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze().then((r) => r.violations.map((v) => v.id))).toEqual([]);
  await page.goto('/');
  await page.locator('#traveller-stories').scrollIntoViewIfNeeded();
  await expect(page.locator('#traveller-stories')).toHaveClass(/is-empty/);

  // Approve with a shortened display name.
  await page.goto(approveUrl!);
  await page.getByLabel('Name shown on the website').fill('Fixture T.');
  await page.getByRole('button', { name: 'Approve & publish' }).click();
  await expect(page.getByRole('status')).toContainText('Published');
  await expect(page.getByText('Published on the website')).toBeVisible();

  // The homepage picks it up live, with the normal card markup, and the share button still opens the form.
  await page.goto('/');
  await page.locator('#traveller-stories').scrollIntoViewIfNeeded();
  await expect(storyCards(page, marker)).toHaveCount(1);
  await expect(storyCards(page, marker)).toContainText('Fixture T.');
  await expect(storyCards(page, marker).getByRole('img', { name: 'Rated 4 out of 5' })).toBeVisible();
  await expect(page.locator('#traveller-stories')).not.toHaveClass(/is-empty/);
  await expect(page.locator('main')).not.toContainText('fixture@example.com');
  expect(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).include('#traveller-stories').analyze().then((r) => r.violations.map((v) => v.id))).toEqual([]);
  await page.locator('#traveller-stories [data-feedback-open]').click();
  await expect(page.locator('#share-your-experience')).toHaveJSProperty('open', true);
  await page.keyboard.press('Escape');

  await page.goto('/feedback/');
  await expect(page.locator('#traveller-stories-grid')).toBeVisible();
  await expect(storyCards(page, marker)).toHaveCount(1);

  // Reject (from the email's Reject link) takes it down again.
  await page.goto(rejectUrl!);
  await page.getByRole('button', { name: 'Remove from website' }).click();
  await expect(page.getByRole('status')).toContainText('Removed');
  await page.goto('/');
  await page.locator('#traveller-stories').scrollIntoViewIfNeeded();
  await page.waitForLoadState('networkidle');
  await expect(storyCards(page, marker)).toHaveCount(0);
  await expect(page.locator('#traveller-stories')).toHaveClass(/is-empty/);
});

test('a tampered review link is refused and publishes nothing', async ({ page, request }) => {
  const res = await page.goto('/api/feedback-review?t=v1.forged.signature&do=approve');
  expect(res?.status()).toBe(403);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('This link is not valid');
  const list = await (await request.get('/api/testimonials')).json();
  expect(list.count).toBe(0);
});
