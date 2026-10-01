import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import nodemailer from 'nodemailer';
import { createEnquiryHandler, type MailTransport } from '../../netlify/lib/enquiry/handler.mts';
import type { MailConfig, MailMessage } from '../../netlify/lib/enquiry/email.mts';
import { createRateLimiter } from '../../netlify/lib/enquiry/security.mts';

// 1 October 2026, 12:00 in India.
const NOW = Date.UTC(2026, 9, 1, 6, 30);
const ENV = {
  SMTP_HOST: 'smtp.zoho.in',
  SMTP_PORT: '465',
  SMTP_USER: 'operations@neinsights.in',
  SMTP_PASS: 'test-password-not-real',
  MAIL_TO: 'operations@neinsights.in',
  MAIL_FROM: 'operations@neinsights.in',
};
const VALID = {
  form_type: 'trip-planner',
  name: 'Priya Sharma',
  email: 'priya@example.com',
  phone: '+91 98765 43210',
  message: 'We would love a relaxed week in Meghalaya with two children.',
  destinations: ['Meghalaya'],
  date: '2026-12-20',
  adults: '2',
  consent: 'on',
  website: '',
  ts: String(NOW - 60_000),
  page: 'https://neinsights.in/plan-my-trip/',
};

interface Harness {
  handle: (req: Request) => Promise<Response>;
  sent: MailMessage[];
  configs: MailConfig[];
  errors: { message: string; details?: Record<string, unknown> }[];
  clock: { now: number };
}

const harness = (options: { env?: Record<string, string | undefined>; transport?: (message: MailMessage) => Promise<unknown>; limit?: number; sendTimeoutMs?: number } = {}): Harness => {
  const sent: MailMessage[] = [];
  const configs: MailConfig[] = [];
  const errors: Harness['errors'] = [];
  const clock = { now: NOW };
  const handler = createEnquiryHandler({
    env: () => options.env ?? ENV,
    createTransport: (config): MailTransport => {
      configs.push(config);
      return { sendMail: options.transport ?? (async (message) => { sent.push(message); return { messageId: 'mock' }; }) };
    },
    rateLimiter: createRateLimiter({ limit: options.limit ?? 5, windowMs: 600_000, now: () => clock.now }),
    now: () => clock.now,
    logError: (message, details) => errors.push({ message, details }),
    sendTimeoutMs: options.sendTimeoutMs,
  });
  return { handle: (req) => handler(req, { ip: '203.0.113.7' }), sent, configs, errors, clock };
};

const jsonPost = (body: Record<string, unknown>, headers: Record<string, string> = {}) =>
  new Request('https://neinsights.in/api/enquiry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Origin: 'https://neinsights.in', ...headers },
    body: JSON.stringify(body),
  });

const formPost = (body: Record<string, string | string[]>, headers: Record<string, string> = {}) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(body)) for (const item of [value].flat()) params.append(key, item);
  return new Request('https://neinsights.in/api/enquiry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: 'https://neinsights.in', Referer: 'https://neinsights.in/contact/', ...headers },
    body: params.toString(),
  });
};

describe('successful delivery', () => {
  it('sends from the business mailbox with the visitor as display name and Reply-To', async () => {
    const h = harness();
    const res = await h.handle(jsonPost(VALID));
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true, redirect: '/thank-you/' });
    assert.equal(h.sent.length, 1);
    const [mail] = h.sent;
    assert.deepEqual(mail.from, { name: 'Priya Sharma via NE Insights', address: 'operations@neinsights.in' });
    assert.deepEqual(mail.replyTo, { name: 'Priya Sharma', address: 'priya@example.com' });
    assert.equal(mail.to, 'operations@neinsights.in');
    assert.equal(mail.subject, 'New enquiry from Priya Sharma: Trip planner - Meghalaya');
    assert.deepEqual(h.configs[0], { host: 'smtp.zoho.in', port: 465, secure: true, user: 'operations@neinsights.in', pass: 'test-password-not-real', to: 'operations@neinsights.in', from: 'operations@neinsights.in' });
  });

  it('includes every field, the source page and the submission time in India, with no third-party branding', async () => {
    const h = harness();
    await h.handle(jsonPost({ ...VALID, topic: 'Summer NE-07 — Meghalaya Explorer' }));
    const [mail] = h.sent;
    for (const expected of ['Trip planner', 'Priya Sharma', 'priya@example.com', '+91 98765 43210', 'Meghalaya', '2026-12-20', 'https://neinsights.in/plan-my-trip/', 'Thursday, 1 October 2026', 'IST']) {
      assert.ok(mail.text.includes(expected), `text should include ${expected}`);
      assert.ok(mail.html.includes(expected), `html should include ${expected}`);
    }
    assert.equal(mail.subject, 'New enquiry from Priya Sharma: Summer NE-07 — Meghalaya Explorer');
    assert.doesNotMatch(mail.html + mail.text, /formsubmit|netlify|zoho/i);
  });

  it('escapes HTML in every value', async () => {
    const h = harness();
    await h.handle(jsonPost({ ...VALID, message: 'Hello <script>alert(1)</script> & welcome "friends"' }));
    assert.ok(h.sent[0].html.includes('Hello &lt;script&gt;alert(1)&lt;/script&gt; &amp; welcome &quot;friends&quot;'));
    assert.ok(!h.sent[0].html.includes('<script>'));
  });

  it('flags suspicious keywords in the subject but still delivers', async () => {
    const h = harness();
    await h.handle(jsonPost({ ...VALID, message: 'We offer cheap SEO and backlinks for your travel website today.' }));
    assert.equal(h.sent.length, 1);
    assert.match(h.sent[0].subject, /^\[Possible spam\] New enquiry from Priya Sharma/);
  });
});

describe('rendered email (nodemailer, not sent)', () => {
  it('produces the expected From, Reply-To, To and Subject headers and both text and HTML parts', async () => {
    const renderer = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'unix' });
    let raw = '';
    const h = harness({ transport: async (message) => { const info = await renderer.sendMail(message); raw = (info.message as Buffer).toString('utf8'); return info; } });
    const res = await h.handle(jsonPost(VALID));
    assert.equal(res.status, 200);
    // Unfold long headers; quotes around the display name are optional in RFC 5322.
    const headers = raw.split('\n\n')[0].replace(/\n[ \t]+/g, ' ');
    assert.match(headers, /^From: "?Priya Sharma via NE Insights"? <operations@neinsights\.in>$/m);
    assert.match(headers, /^Reply-To: Priya Sharma <priya@example\.com>$/m);
    assert.match(headers, /^To: operations@neinsights\.in$/m);
    assert.match(headers, /^Subject: New enquiry from Priya Sharma: Trip planner - Meghalaya$/m);
    assert.match(raw, /Content-Type: multipart\/alternative/);
    assert.match(raw, /Content-Type: text\/plain/);
    assert.match(raw, /Content-Type: text\/html/);
  });

  it('cannot be used for header injection through the name or email', async () => {
    const renderer = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'unix' });
    let raw = '';
    const h = harness({ transport: async (message) => { const info = await renderer.sendMail(message); raw = (info.message as Buffer).toString('utf8'); return info; } });
    const res = await h.handle(jsonPost({ ...VALID, name: 'Eve\r\nBcc: attacker@example.com\r\nX-Evil: 1' }));
    assert.equal(res.status, 200);
    const headers = raw.split('\n\n')[0];
    assert.doesNotMatch(headers, /^Bcc:/im);
    assert.doesNotMatch(headers, /^X-Evil:/im);
    assert.equal(headers.match(/^Subject:/gim)?.length, 1);

    const injectedEmail = await harness().handle(jsonPost({ ...VALID, email: 'eve@example.com\r\nBcc: attacker@example.com' }));
    assert.equal(injectedEmail.status, 422);
    assert.ok((await injectedEmail.json()).errors.email);
  });
});

describe('validation', () => {
  it('returns field-level errors for missing required fields', async () => {
    const h = harness();
    const res = await h.handle(jsonPost({ ts: VALID.ts, form_type: 'contact' }));
    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.code, 'validation');
    assert.deepEqual(Object.keys(body.errors).sort(), ['consent', 'email', 'message', 'name', 'phone']);
    assert.equal(body.errors.name, 'Enter your full name.');
    assert.equal(h.sent.length, 0);
  });

  it('checks email format, phone digit count, lengths and dates', async () => {
    const cases: [Record<string, unknown>, string, RegExp][] = [
      [{ email: 'not-an-email' }, 'email', /valid email/],
      [{ email: 'name@example' }, 'email', /valid email/],
      [{ phone: '98765 4321' }, 'phone', /10 to 15 digits/],
      [{ phone: '9876543210' }, '', /./],
      [{ phone: '+91 98765 43210 9999' }, 'phone', /10 to 15 digits/],
      [{ phone: '98765abc43210' }, 'phone', /10 to 15 digits/],
      [{ name: 'P' }, 'name', /at least 2 characters/],
      [{ name: 'x'.repeat(101) }, 'name', /100 characters or fewer/],
      [{ message: 'Hi there' }, 'message', /at least 10 characters/],
      [{ message: 'x'.repeat(2501) }, 'message', /2500 characters or fewer/],
      [{ date: '2026-09-30' }, 'date', /today or a future date/],
      [{ date: '2026-10-01' }, '', /./],
      [{ date: '2026-02-30' }, 'date', /valid date/],
      [{ adults: '0' }, 'adults', /whole number from 1 to 60/],
      [{ destinations: ['Atlantis'] }, 'destinations', /option from the list/],
    ];
    for (const [override, field, pattern] of cases) {
      const res = await harness().handle(jsonPost({ ...VALID, ...override }));
      if (!field) {
        assert.equal(res.status, 200, `${JSON.stringify(override)} should be valid`);
        continue;
      }
      assert.equal(res.status, 422, `${JSON.stringify(override)} should be rejected`);
      assert.match((await res.json()).errors[field], pattern);
    }
  });

  it('requires the privacy consent checkbox', async () => {
    const { consent: _omitted, ...withoutConsent } = VALID;
    const res = await harness().handle(jsonPost(withoutConsent));
    assert.equal(res.status, 422);
    assert.match((await res.json()).errors.consent, /privacy notice/);
    const declined = await harness().handle(jsonPost({ ...VALID, consent: 'no' }));
    assert.equal(declined.status, 422);
  });
});

describe('spam protection', () => {
  it('silently accepts and discards honeypot submissions', async () => {
    const h = harness();
    const res = await h.handle(jsonPost({ ...VALID, website: 'https://spam.example' }));
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true, redirect: '/thank-you/' });
    assert.equal(h.sent.length, 0);
  });

  it('silently discards submissions made within 3 seconds of page load', async () => {
    const h = harness();
    const res = await h.handle(jsonPost({ ...VALID, ts: String(NOW - 1500) }));
    assert.equal(res.status, 200);
    assert.equal(h.sent.length, 0);
    await h.handle(jsonPost({ ...VALID, ts: String(NOW - 3000) }));
    assert.equal(h.sent.length, 1);
  });

  it('delivers but notes submissions without a timer (JavaScript off)', async () => {
    const h = harness();
    const { ts: _omitted, ...withoutTimer } = VALID;
    await h.handle(jsonPost(withoutTimer));
    assert.equal(h.sent.length, 1);
    assert.match(h.sent[0].text, /Form timer not available/);
    assert.doesNotMatch(h.sent[0].subject, /Possible spam/);
  });

  it('rejects other origins and requests without an origin', async () => {
    assert.equal((await harness().handle(jsonPost(VALID, { Origin: 'https://evil.example' }))).status, 403);
    assert.equal((await harness().handle(jsonPost(VALID, { Origin: 'http://neinsights.in' }))).status, 403);
    const noOrigin = new Request('https://neinsights.in/api/enquiry', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(VALID) });
    assert.equal((await harness().handle(noOrigin)).status, 403);
    for (const origin of ['https://www.neinsights.in', 'https://deploy-preview-4--ne-insights.netlify.app', 'http://localhost:4321', 'http://127.0.0.1:8888']) {
      assert.equal((await harness().handle(jsonPost(VALID, { Origin: origin }))).status, 200, origin);
    }
    const extra = harness({ env: { ...ENV, ALLOWED_ORIGINS: 'https://staging.example.org' } });
    assert.equal((await extra.handle(jsonPost(VALID, { Origin: 'https://staging.example.org' }))).status, 200);
  });

  it('rate limits each IP to 5 submissions per 10 minutes', async () => {
    const h = harness();
    for (let i = 0; i < 5; i++) assert.equal((await h.handle(jsonPost(VALID))).status, 200);
    const limited = await h.handle(jsonPost(VALID));
    assert.equal(limited.status, 429);
    assert.equal((await limited.json()).code, 'rate_limited');
    assert.ok(Number(limited.headers.get('retry-after')) > 0);
    h.clock.now += 600_000;
    assert.equal((await h.handle(jsonPost({ ...VALID, ts: String(h.clock.now - 60_000) }))).status, 200);
  });
});

describe('server and delivery failures', () => {
  it('returns 500 when SMTP settings are missing, without exposing which', async () => {
    const h = harness({ env: { ...ENV, SMTP_PASS: '', MAIL_TO: undefined } });
    const res = await h.handle(jsonPost(VALID));
    assert.equal(res.status, 500);
    const body = await res.json();
    assert.equal(body.code, 'not_configured');
    assert.doesNotMatch(body.message, /SMTP|MAIL_/);
    assert.deepEqual(h.errors[0].details, { missing: ['SMTP_PASS', 'MAIL_TO'] });
    assert.equal(h.configs.length, 0);
  });

  it('returns 502 when the mail server rejects the message', async () => {
    const h = harness({ transport: async () => { throw Object.assign(new Error('Invalid login'), { code: 'EAUTH', responseCode: 535 }); } });
    const res = await h.handle(jsonPost(VALID));
    assert.equal(res.status, 502);
    const body = await res.json();
    assert.equal(body.code, 'delivery_failed');
    assert.match(body.message, /call or WhatsApp/);
    assert.equal(h.errors[0].details?.code, 'EAUTH');
    assert.ok(!JSON.stringify(h.errors).includes('priya@example.com'), 'logs must not contain visitor data');
  });

  it('returns 502 when the mail server does not respond in time', async () => {
    const h = harness({ transport: () => new Promise(() => {}), sendTimeoutMs: 20 });
    assert.equal((await h.handle(jsonPost(VALID))).status, 502);
  });

  it('rejects non-POST methods', async () => {
    const res = await harness().handle(new Request('https://neinsights.in/api/enquiry', { headers: { Accept: 'application/json' } }));
    assert.equal(res.status, 405);
    assert.equal(res.headers.get('allow'), 'POST');
  });

  it('keeps the Allow and Retry-After headers on HTML responses too', async () => {
    const get = await harness().handle(new Request('https://neinsights.in/api/enquiry'));
    assert.equal(get.status, 405);
    assert.equal(get.headers.get('allow'), 'POST');
    const h = harness({ limit: 1 });
    await h.handle(formPost({ ...VALID, destinations: 'Assam' }));
    const limited = await h.handle(formPost({ ...VALID, destinations: 'Assam' }));
    assert.equal(limited.status, 429);
    assert.ok(Number(limited.headers.get('retry-after')) > 0);
  });
});

describe('without JavaScript (plain HTML form post)', () => {
  it('redirects with 303 to the thank-you page and reads repeated fields', async () => {
    const h = harness();
    const { ts: _omitted, ...fields } = VALID;
    const res = await h.handle(formPost({ ...fields, destinations: ['Assam', 'Meghalaya'] }));
    assert.equal(res.status, 303);
    assert.equal(res.headers.get('location'), '/thank-you/');
    assert.equal(h.sent.length, 1);
    assert.match(h.sent[0].text, /Preferred destinations: Assam, Meghalaya/);
  });

  it('shows an HTML page with the errors and phone/email alternatives', async () => {
    const res = await harness().handle(formPost({ name: 'Priya', email: 'bad', consent: 'on' }));
    assert.equal(res.status, 422);
    assert.match(res.headers.get('content-type') ?? '', /text\/html/);
    const html = await res.text();
    assert.match(html, /Enter a valid email address/);
    assert.match(html, /tel:\+918473833199/);
    assert.match(html, /mailto:operations@neinsights\.in/);
    assert.match(html, /Back/);
  });

  it('uses the Referer as the source page', async () => {
    const h = harness();
    const { page: _page, ...fields } = VALID;
    await h.handle(formPost(fields as Record<string, string | string[]>));
    assert.match(h.sent[0].text, /Source page: https:\/\/neinsights\.in\/contact\//);
  });
});
