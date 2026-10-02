// Homepage "Traveller stories": only approved entries from src/data/testimonials.mjs are rendered,
// the empty state is an invitation, and the build refuses incomplete or private testimonial data.
// The entries below are TEST FIXTURES ONLY; they never appear on the website.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { checkTestimonials, feedbackPageContent, travellerStories } from '../../src/components/testimonials.mjs';
import { testimonials } from '../../src/data/testimonials.mjs';

const FIXTURE = { id: 'fixture-one', name: 'Test Traveller', rating: 4, text: 'Fixture text used only by the unit tests.', journey: 'Fixture journey', location: 'Fixture City', date: 'October 2026' };
const section = (html: string) => html.split('<dialog')[0];

describe('traveller stories section', () => {
  it('shows the invitation, without cards, carousel or counts, when there are no approved testimonials', () => {
    const html = section(travellerStories([]));
    assert.match(html, /class="section stories-section is-empty" id="traveller-stories"/);
    assert.match(html, /TRAVELLER STORIES/);
    assert.match(html, /Journeys remembered\. Stories shared\./);
    assert.match(html, /Your journey could inspire the next one\./);
    assert.match(html, /href="#share-your-experience" data-feedback-open/);
    assert.match(html, /reviewed by the NE Insights team before anything is published/);
    for (const absent of [/story-card/, /data-carousel/, /carousel-btn/, /carousel-progress/, /\b0 reviews?\b/i, /Rated \d/]) assert.doesNotMatch(html, absent);
  });

  it('renders approved testimonials as cards in a carousel, with accessible ratings', () => {
    const html = section(travellerStories([FIXTURE, { ...FIXTURE, id: 'fixture-two', name: 'Second Tester', rating: 5 }]));
    assert.doesNotMatch(html, /is-empty/);
    assert.equal(html.match(/<figure class="story-card"/g)?.length, 2);
    assert.match(html, /data-carousel/);
    assert.match(html, /data-carousel-prev aria-label="Previous traveller stories"/);
    assert.match(html, /tabindex="0" role="region" aria-label="Traveller stories"/);
    assert.match(html, /role="img" aria-label="Rated 4 out of 5"/);
    assert.equal(html.split('aria-label="Rated 4 out of 5"')[1].split('</span>')[0].match(/is-filled/g)?.length, 4);
    assert.match(html, /Fixture journey · Fixture City/);
    assert.match(html, /Travelled with NE Insights\?/);
  });

  it('shows a single testimonial without carousel controls', () => {
    const html = section(travellerStories([FIXTURE]));
    assert.equal(html.match(/story-card/g)?.length, 1);
    assert.doesNotMatch(html, /data-carousel/);
  });

  it('escapes every testimonial string and lists featured entries first', () => {
    const html = section(travellerStories([
      { ...FIXTURE, id: 'plain' },
      { ...FIXTURE, id: 'featured', featured: true, name: 'Ann <b>Bold</b>', text: 'A <script>alert(1)</script> & "quoted" fixture text.' },
    ]));
    assert.ok(!html.includes('<script>alert'));
    assert.ok(html.includes('A &lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;quoted&quot; fixture text.'));
    assert.ok(html.indexOf('Ann &lt;b&gt;Bold&lt;/b&gt;') < html.indexOf('Test Traveller'));
  });

  it('always includes the feedback dialog with the form, rating group and publication consent', () => {
    const html = travellerStories([]);
    const dialog = html.slice(html.indexOf('<dialog'));
    assert.match(dialog, /<dialog class="feedback-dialog" id="share-your-experience" aria-labelledby="feedback-title"/);
    assert.match(dialog, /data-form-type="feedback" data-rules="feedback"/);
    assert.match(dialog, /<input type="hidden" name="form_type" value="feedback">/);
    for (let n = 1; n <= 5; n++) assert.match(dialog, new RegExp(`name="rating" value="${n}"[^>]*>.*?${n} out of 5 stars`));
    assert.match(dialog, /name="publish_consent" value="on" required/);
    assert.match(dialog, /may publish my feedback, rating and name/);
    assert.match(dialog, /does not guarantee publication/);
    assert.doesNotMatch(dialog, /name="phone"[^>]*required/);
    assert.doesNotMatch(dialog, /name="message"/);
  });
});

describe('shareable feedback page', () => {
  it('shows the form inline and leaves out the stories grid when there are no approved testimonials', () => {
    const html = feedbackPageContent([]);
    assert.match(html, /id="form-feedback"/);
    assert.match(html, /aria-labelledby="feedback-page-title"/);
    assert.doesNotMatch(html, /<dialog/);
    assert.doesNotMatch(html, /story-card|story-grid/);
  });

  it('lists every approved testimonial in a grid below the form', () => {
    const html = feedbackPageContent([FIXTURE, { ...FIXTURE, id: 'fixture-two' }, { ...FIXTURE, id: 'fixture-three' }]);
    assert.match(html, /class="story-grid"/);
    assert.equal(html.match(/<figure class="story-card"/g)?.length, 3);
    assert.ok(html.indexOf('id="form-feedback"') < html.indexOf('story-grid'));
  });
});

describe('approved testimonial data', () => {
  it('the published data file passes the checks (and contains no private fields)', () => {
    assert.doesNotThrow(() => checkTestimonials(testimonials));
  });

  it('refuses entries that would publish private details or are incomplete', () => {
    const bad: [Record<string, unknown>, RegExp][] = [
      [{ ...FIXTURE, email: 'someone@example.com' }, /remove email/],
      [{ ...FIXTURE, phone: '+91 98765 43210' }, /remove phone/],
      [{ ...FIXTURE, text: 'Write to me at someone@example.com any time you like.' }, /email address or phone number/],
      [{ ...FIXTURE, text: 'Call me on +91 98765 43210 to hear more about the trip.' }, /email address or phone number/],
      [{ ...FIXTURE, rating: 6 }, /rating must be a whole number/],
      [{ ...FIXTURE, rating: 4.5 }, /rating must be a whole number/],
      [{ ...FIXTURE, rating: '5' }, /rating must be a whole number/],
      [{ ...FIXTURE, name: ' ' }, /name is required/],
      [{ ...FIXTURE, text: 'Too short' }, /text is required/],
      [{ ...FIXTURE, id: 'Not Valid' }, /lowercase and hyphenated/],
    ];
    for (const [entry, pattern] of bad) assert.throws(() => checkTestimonials([entry]), pattern, JSON.stringify(entry).slice(0, 80));
    assert.throws(() => checkTestimonials([FIXTURE, FIXTURE]), /duplicate id/);
  });
});
