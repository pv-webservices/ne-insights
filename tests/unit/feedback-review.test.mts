// Approve / Reject from the feedback email, and the public list the website loads. Uses an in-memory store.
// Names and texts below are TEST FIXTURES ONLY.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createRateLimiter } from '../../netlify/lib/enquiry/security.mts';
import { createTestimonialsHandler, mergedTestimonials, publishableEntry } from '../../netlify/lib/testimonials/publish.mts';
import { createReviewHandler } from '../../netlify/lib/testimonials/review.mts';
import { APPROVE_LINK_TTL_MS, reviewKey, signReview, verifyReview } from '../../netlify/lib/testimonials/review-token.mts';
import { memoryTestimonialStore, type StoredTestimonial } from '../../netlify/lib/testimonials/store.mts';
import type { Testimonial } from '../../src/components/testimonials.mjs';

const NOW = Date.UTC(2026, 9, 2, 6, 30);
const ENV = { SMTP_PASS: 'test-password-not-real' };
const KEY = reviewKey(ENV)!;
const ENTRY: Testimonial = publishableEntry({ name: 'Test Traveller', rating: '4', feedback: 'Fixture feedback text for the approval tests.', journey: 'Jungle Safari', destinations: ['Assam'], city: 'Fixture City', email: 'private@example.com', phone: '+91 98765 43210' }, NOW);
const token = (entry: Testimonial = ENTRY, expiresAt = NOW + APPROVE_LINK_TTL_MS) => signReview({ entry, expiresAt }, KEY);

const setup = (options: { now?: number; env?: Record<string, string | undefined>; limit?: number } = {}) => {
  const store = memoryTestimonialStore();
  const handle = createReviewHandler({ env: () => options.env ?? ENV, store, rateLimiter: createRateLimiter({ limit: options.limit ?? 20, windowMs: 600_000 }), now: () => options.now ?? NOW, logError: () => {} });
  return { store, handle: (req: Request) => handle(req, { ip: '203.0.113.9' }) };
};
const open = (t: string, extra = '') => new Request(`https://neinsights.in/api/feedback-review?t=${encodeURIComponent(t)}${extra}`);
const decide = (fields: Record<string, string>, origin = 'https://neinsights.in') =>
  new Request('https://neinsights.in/api/feedback-review', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: origin }, body: new URLSearchParams(fields).toString() });

describe('review tokens', () => {
  it('round-trip only the publishable fields and reject tampering or another key', () => {
    const t = token();
    assert.deepEqual(verifyReview(t, KEY), { entry: ENTRY, expiresAt: NOW + APPROVE_LINK_TTL_MS });
    assert.doesNotMatch(JSON.stringify(verifyReview(t, KEY)), /private@example\.com|98765/);
    const [v, payload, sig] = t.split('.');
    const forged = signReview({ entry: { ...ENTRY, rating: 5 }, expiresAt: NOW }, reviewKey({ SMTP_PASS: 'someone-else' })!);
    for (const bad of [`${v}.${payload}x.${sig}`, `${v}.${payload}.${sig.slice(1)}`, forged, `${t}.extra`, '', 'v1..']) assert.equal(verifyReview(bad, KEY), null, bad.slice(0, 20));
  });

  it('prefer FEEDBACK_REVIEW_SECRET and need some secret', () => {
    assert.notDeepEqual(reviewKey({ SMTP_PASS: 'a', FEEDBACK_REVIEW_SECRET: 'b' }), reviewKey({ SMTP_PASS: 'a' }));
    assert.equal(reviewKey({}), null);
  });
});

describe('review page', () => {
  it('opening a link only shows the feedback (mail scanners must not publish anything)', async () => {
    const { store, handle } = setup();
    const res = await handle(open(token(), '&do=approve'));
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('x-robots-tag'), 'noindex');
    assert.equal(res.headers.get('cache-control'), 'no-store');
    const html = await res.text();
    for (const expected of ['Review traveller feedback', 'Not on the website', '★★★★☆', 'Fixture feedback text', 'Test Traveller', 'Jungle Safari (Assam) · Fixture City', 'Approve &amp; publish', '>Reject<']) assert.ok(html.includes(expected), expected);
    assert.equal(store.entries.size, 0);
  });

  it('approve publishes (with an edited display name) and reject removes it again', async () => {
    const { store, handle } = setup();
    const t = token();
    const approved = await handle(decide({ t, action: 'approve', name: '  Test T.  ' }));
    assert.equal(approved.status, 303);
    assert.match(approved.headers.get('location') ?? '', /done=approved$/);
    assert.deepEqual(store.entries.get(ENTRY.id), { ...ENTRY, name: 'Test T.', approvedAt: NOW });
    const page = await (await handle(open(t, '&done=approved'))).text();
    assert.match(page, /Published\. It will appear on the website/);
    assert.match(page, /Published on the website/);
    assert.match(page, /Remove from website/);
    assert.match(page, /value="Test T\."/);

    const removed = await handle(decide({ t, action: 'reject' }));
    assert.match(removed.headers.get('location') ?? '', /done=removed$/);
    assert.equal(store.entries.size, 0);
    assert.match(await (await handle(open(t, '&done=removed'))).text(), /no longer shown/);
  });

  it('reject before approval stores nothing and says so', async () => {
    const { store, handle } = setup();
    const res = await handle(decide({ t: token(), action: 'reject' }));
    assert.match(res.headers.get('location') ?? '', /done=rejected$/);
    assert.equal(store.entries.size, 0);
  });

  it('refuses forged links, other origins, private data in the name and expired approve links', async () => {
    const { store, handle } = setup();
    assert.equal((await handle(open('v1.abc.def'))).status, 403);
    assert.equal((await handle(decide({ t: 'v1.abc.def', action: 'approve' }))).status, 403);
    assert.equal((await handle(decide({ t: token(), action: 'approve' }, 'https://evil.example'))).status, 403);
    const named = await handle(decide({ t: token(), action: 'approve', name: 'Call 98765 43210' }));
    assert.equal(named.status, 422);
    assert.match(await named.text(), /email address or phone number/);
    const late = setup({ now: NOW + APPROVE_LINK_TTL_MS + 1 });
    const expired = await late.handle(decide({ t: token(), action: 'approve' }));
    assert.match(await expired.text(), /approve link has expired/);
    assert.equal(late.store.entries.size, 0);
    assert.match((await late.handle(decide({ t: token(), action: 'reject' }))).headers.get('location') ?? '', /done=rejected/);
    assert.equal(store.entries.size, 0);
  });

  it('is unavailable without a signing secret and rate limits decisions', async () => {
    assert.equal((await setup({ env: {} }).handle(open(token()))).status, 500);
    const { handle } = setup({ limit: 1 });
    await handle(decide({ t: token(), action: 'reject' }));
    assert.equal((await handle(decide({ t: token(), action: 'reject' }))).status, 429);
  });
});

describe('public testimonials list', () => {
  const stored = (id: string, approvedAt: number, extra: Partial<StoredTestimonial> = {}): StoredTestimonial => ({ ...ENTRY, id, name: `Tester ${id}`, approvedAt, ...extra });

  it('renders approved testimonials newest first, with fixed entries after, and CDN caching', async () => {
    const store = memoryTestimonialStore([stored('older', 1), stored('newer', 2)]);
    const fixed: Testimonial[] = [{ ...ENTRY, id: 'fixed-one', name: 'Fixed Tester' }];
    const res = await createTestimonialsHandler({ store, fixed })(new Request('https://neinsights.in/api/testimonials'));
    assert.equal(res.status, 200);
    assert.match(res.headers.get('netlify-cdn-cache-control') ?? '', /s-maxage=60/);
    const body = await res.json();
    assert.equal(body.count, 3);
    assert.match(body.version, /^3-/);
    assert.ok(body.section.indexOf('Tester newer') < body.section.indexOf('Tester older'));
    assert.ok(body.section.indexOf('Tester older') < body.section.indexOf('Fixed Tester'));
    assert.match(body.section, /id="traveller-stories" data-stories="3-/);
    assert.match(body.grid, /id="traveller-stories-grid" data-stories-grid/);
    assert.doesNotMatch(body.section + body.grid, /data-reveal|approvedAt|private@example\.com/);
  });

  it('returns the empty-state section when nothing is approved, and 503 when the store fails', async () => {
    const empty = await (await createTestimonialsHandler({ store: memoryTestimonialStore(), fixed: [] })(new Request('https://x/api/testimonials'))).json();
    assert.equal(empty.count, 0);
    assert.match(empty.section, /is-empty/);
    const broken = { ...memoryTestimonialStore(), list: async () => { throw new Error('down'); } };
    const res = await createTestimonialsHandler({ store: broken, fixed: [], logError: () => {} })(new Request('https://x/api/testimonials'));
    assert.equal(res.status, 503);
  });

  it('lets an approval override a fixed entry with the same id', () => {
    const merged = mergedTestimonials([stored('same', 5, { name: 'From approval' })], [{ ...ENTRY, id: 'same', name: 'From file' }]);
    assert.deepEqual(merged.map((t) => t.name), ['From approval']);
  });
});
