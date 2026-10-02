// Enquiry form behaviour in a real browser. The /api/enquiry endpoint is intercepted in every test
// except the last, which uses the local preview function (renders the email to a file, never sends).
import { expect, test, type Page, type Route } from '@playwright/test';

// Hover and scroll transitions are irrelevant here and make clicks wait for elements to settle.
test.use({ reducedMotion: 'reduce' });

const VISITOR = { name: 'Test Visitor', email: 'visitor@example.com', phone: '+91 98765 43210', message: 'Automated browser test of the contact form.' };

/** Waits until site.js has enhanced the form (until then the browser would do a plain POST). */
const enhanced = (page: Page) => page.waitForFunction(() => [...document.querySelectorAll<HTMLFormElement>('form[data-enquiry]')].every((form) => form.noValidate));

const fillContact = async (page: Page, { javascript = true } = {}) => {
  if (javascript) await enhanced(page);
  await page.getByLabel('Full name').fill(VISITOR.name);
  await page.getByLabel('Phone number').fill(VISITOR.phone);
  await page.getByLabel('Email address').fill(VISITOR.email);
  await page.getByLabel('Message').fill(VISITOR.message);
  await page.getByLabel('I have read the privacy policy').check();
};
const respond = (status: number, body: Record<string, unknown>) => (route: Route) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
const expectDataKept = async (page: Page) => {
  await expect(page.getByLabel('Full name')).toHaveValue(VISITOR.name);
  await expect(page.getByLabel('Message')).toHaveValue(VISITOR.message);
};
const statusBox = (page: Page) => page.locator('#form-contact [data-form-status]');

test.describe('contact form with JavaScript', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/contact/');
  });

  test('success sends JSON in the background and lands on /thank-you/', async ({ page }) => {
    let payload: Record<string, unknown> = {};
    await page.route('**/api/enquiry', async (route) => {
      payload = route.request().postDataJSON();
      expect(route.request().headers()['content-type']).toContain('application/json');
      await respond(200, { ok: true, redirect: '/thank-you/' })(route);
    });
    await fillContact(page);
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page).toHaveURL(/\/thank-you\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Thank you');
    expect(payload).toMatchObject({ name: VISITOR.name, email: VISITOR.email, phone: VISITOR.phone, consent: 'on', form_type: 'contact', website: '' });
    expect(Number(payload.ts)).toBeGreaterThan(0);
    expect(String(payload.page)).toContain('/contact/');
  });

  test('empty submit shows field messages, a summary and focuses the first invalid field', async ({ page }) => {
    let requests = 0;
    await page.route('**/api/enquiry', (route) => { requests++; return route.abort(); });
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(statusBox(page)).toContainText('Please correct 5 fields');
    await expect(page.getByLabel('Full name')).toBeFocused();
    const name = page.getByLabel('Full name');
    await expect(name).toHaveAttribute('aria-invalid', 'true');
    await expect(name).toHaveAttribute('aria-describedby', /contact-name-error/);
    await expect(page.locator('#contact-name-error')).toHaveText('Enter your full name.');
    await expect(page.locator('#contact-consent-error')).toContainText('privacy notice');
    expect(requests).toBe(0);
  });

  test('checks email, phone digits and minimum length manually (also for scripted values)', async ({ page }) => {
    await fillContact(page);
    await page.getByLabel('Email address').fill('not-an-email');
    await page.getByLabel('Phone number').fill('12345');
    // Programmatic value: validity.tooShort would not fire for this.
    await page.getByLabel('Message').evaluate((el: HTMLTextAreaElement) => { el.value = 'Too short'; });
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.locator('#contact-email-error')).toContainText('valid email address');
    await expect(page.locator('#contact-phone-error')).toContainText('10 to 15 digits');
    await expect(page.locator('#contact-message-error')).toContainText('at least 10 characters');
    await expect(page.getByLabel('Phone number')).toBeFocused();
  });

  test('past travel dates are rejected', async ({ page }) => {
    await fillContact(page);
    await page.getByLabel('Preferred travel date').fill('2020-01-01');
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.locator('#contact-date-error')).toHaveText('Choose today or a future date.');
  });

  test('server validation errors are shown on the matching fields', async ({ page }) => {
    await page.route('**/api/enquiry', respond(422, { ok: false, code: 'validation', message: 'Some details need your attention.', errors: { email: 'Enter a valid email address, like name@example.com.' } }));
    await fillContact(page);
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.locator('#contact-email-error')).toContainText('valid email address');
    await expect(page.getByLabel('Email address')).toBeFocused();
    await expectDataKept(page);
  });

  for (const [status, code] of [[502, 'delivery_failed'], [500, 'not_configured'], [403, 'origin']] as const) {
    test(`a ${status} response shows the failure message with phone, WhatsApp and email alternatives`, async ({ page }) => {
      await page.route('**/api/enquiry', respond(status, { ok: false, code, message: 'We couldn’t deliver your enquiry just now. Your details are still in the form.' }));
      await fillContact(page);
      await page.getByRole('button', { name: 'Send message' }).click();
      await expect(statusBox(page)).toContainText('Your enquiry was not sent');
      await expect(statusBox(page).getByRole('link', { name: /call \+91 8473833199/ })).toHaveAttribute('href', 'tel:+918473833199');
      await expect(statusBox(page).getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('href', /wa\.me\/918473833199\?text=.*Test%20Visitor/);
      await expect(statusBox(page).getByRole('link', { name: /email operations@neinsights\.in/ })).toHaveAttribute('href', /^mailto:operations@neinsights\.in/);
      await expect(statusBox(page)).toBeFocused();
      await expect(page.getByRole('button', { name: 'Send message' })).toBeEnabled();
      await expectDataKept(page);
    });
  }

  test('rate limiting asks the visitor to wait', async ({ page }) => {
    await page.route('**/api/enquiry', respond(429, { ok: false, code: 'rate_limited', message: 'You have sent several enquiries in a short time.' }));
    await fillContact(page);
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(statusBox(page)).toContainText('Please wait a few minutes');
    await expectDataKept(page);
  });

  test('a network failure keeps the data and offers alternatives', async ({ page }) => {
    await page.route('**/api/enquiry', (route) => route.abort('connectionfailed'));
    await fillContact(page);
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(statusBox(page)).toContainText('We couldn’t reach our server');
    await expectDataKept(page);
  });

  test('offline visitors get an offline message and nothing is sent', async ({ page }) => {
    let requests = 0;
    await page.route('**/api/enquiry', (route) => { requests++; return route.abort(); });
    await fillContact(page);
    // Emulate the browser's offline state (context.setOffline disturbs other tests running in parallel).
    await page.evaluate(() => Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false }));
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(statusBox(page)).toContainText('You appear to be offline');
    expect(requests).toBe(0);
    await expectDataKept(page);
  });

  test('the request times out after 20 seconds with a timeout message; the button is disabled while sending', async ({ page }) => {
    await page.clock.install();
    await page.goto('/contact/');
    await page.route('**/api/enquiry', () => { /* never answer */ });
    await fillContact(page);
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.locator('#form-contact [data-submit]')).toBeDisabled();
    await expect(page.locator('#form-contact [data-submit-label]')).toHaveText('Sending…');
    await page.clock.runFor(20_500);
    await expect(statusBox(page)).toContainText('taking longer than expected');
    await expect(page.locator('#form-contact [data-submit]')).toBeEnabled();
    await expectDataKept(page);
  });

  test('entries survive a page reload (session draft) and the Back button re-enables sending', async ({ page }) => {
    await page.getByLabel('Full name').fill(VISITOR.name);
    await page.getByLabel('Message').fill(VISITOR.message);
    await page.waitForTimeout(400);
    await page.reload();
    await expectDataKept(page);
    await page.route('**/api/enquiry', respond(200, { ok: true, redirect: '/thank-you/' }));
    await fillContact(page);
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page).toHaveURL(/\/thank-you\/$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/contact\/$/);
    await expect(page.getByRole('button', { name: 'Send message' })).toBeEnabled();
    expect(await page.evaluate(() => sessionStorage.getItem('ne-enquiry-draft:contact'))).toBeNull();
  });

  test('“Send via WhatsApp” opens WhatsApp with the message pre-filled', async ({ page, context }) => {
    await context.route('https://wa.me/**', (route) => route.fulfill({ status: 200, contentType: 'text/plain', body: 'stub' }));
    await fillContact(page);
    const [popup] = await Promise.all([page.waitForEvent('popup'), page.getByRole('link', { name: 'Send via WhatsApp' }).click()]);
    const url = decodeURIComponent(popup.url());
    expect(url).toContain('wa.me/918473833199');
    expect(url).toContain(`Name: ${VISITOR.name}`);
    expect(url).toContain(VISITOR.message);
  });
});

test('every pattern attribute is a valid regular expression under the v flag browsers use', async ({ page }) => {
  for (const url of ['/', '/contact/', '/plan-my-trip/']) {
    await page.goto(url);
    const invalid = await page.evaluate(() => [...document.querySelectorAll<HTMLInputElement>('input[pattern]')].filter((input) => {
      try { new RegExp(`^(?:${input.pattern})$`, 'v'); return false; } catch { return true; }
    }).map((input) => input.id));
    expect(invalid, url).toEqual([]);
  }
});

test('trip planner pre-fills the package reference from ?interest=', async ({ page }) => {
  let payload: Record<string, unknown> = {};
  await page.route('**/api/enquiry', async (route) => { payload = route.request().postDataJSON(); await respond(200, { ok: true, redirect: '/thank-you/' })(route); });
  await page.goto('/plan-my-trip/?interest=Summer%20NE-07%20%E2%80%94%20Meghalaya');
  await enhanced(page);
  await expect(page.getByLabel('Your ideas, plans or questions')).toHaveValue(/Summer NE-07/);
  await page.getByLabel('Full name').fill(VISITOR.name);
  await page.getByLabel('Phone number').fill(VISITOR.phone);
  await page.getByLabel('Email address').fill(VISITOR.email);
  await page.getByLabel('I have read the privacy policy').check();
  await page.getByRole('button', { name: 'Send my trip enquiry' }).click();
  await expect(page).toHaveURL(/\/thank-you\/$/);
  expect(payload.topic).toBe('Summer NE-07 — Meghalaya');
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the form posts normally and the 303 redirect lands on /thank-you/', async ({ page }) => {
    let body = '';
    await page.route('**/api/enquiry', async (route) => {
      body = route.request().postData() ?? '';
      expect(route.request().method()).toBe('POST');
      expect(route.request().headers()['content-type']).toContain('application/x-www-form-urlencoded');
      await route.fulfill({ status: 303, headers: { Location: '/thank-you/' } });
    });
    await page.goto('/contact/');
    await fillContact(page, { javascript: false });
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page).toHaveURL(/\/thank-you\/$/);
    const params = new URLSearchParams(body);
    expect(params.get('name')).toBe(VISITOR.name);
    expect(params.get('consent')).toBe('on');
  });

  test('the WhatsApp link still works as a plain link', async ({ page }) => {
    await page.goto('/contact/');
    await expect(page.getByRole('link', { name: 'Send via WhatsApp' })).toHaveAttribute('href', /^https:\/\/wa\.me\/918473833199/);
  });
});

test('end to end through the local function (preview transport writes the email to a file; nothing is sent)', async ({ page }) => {
  await page.goto('/contact/');
  await fillContact(page);
  await page.waitForTimeout(3100); // the server discards submissions made within 3 s of page load
  await page.getByRole('button', { name: 'Send message' }).click();
  // The real local function renders the email with nodemailer; allow for a slow machine.
  // The status text is only a failure hint; if the page has already moved on it is gone, so don't wait for it.
  await expect(page, await page.locator('#form-contact [data-form-status]').innerText({ timeout: 1000 }).catch(() => '')).toHaveURL(/\/thank-you\/$/, { timeout: 20_000 });
});
