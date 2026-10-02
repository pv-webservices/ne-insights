// Turning feedback into a publishable testimonial, and the public list the website loads (/api/testimonials).
import { RATING_MAX, TIME_ZONE } from '../../../src/lib/enquiry-rules.mjs';
import { testimonials as staticTestimonials } from '../../../src/data/testimonials.mjs';
import { checkTestimonials, storiesGrid, storiesSection, storiesVersion, type Testimonial } from '../../../src/components/testimonials.mjs';
import type { StoredTestimonial, TestimonialStore } from './store.mts';

type Values = Record<string, string | string[]>;
const text = (value: string | string[] | undefined): string => (Array.isArray(value) ? value.join(', ') : value ?? '');
const slug = (value: string): string => value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const yearMonth = (timestamp: number): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit' }).format(timestamp).slice(0, 7);

/**
 * The testimonial a feedback submission would become if approved: only fields that may be published
 * (never the email address or phone number). The id is stable, so approving twice updates one entry.
 */
export const publishableEntry = (values: Values, submittedAt: number): Testimonial => {
  const name = text(values.name);
  const journey = text(values.journey);
  const places = text(values.destinations);
  const rating = Math.min(RATING_MAX, Math.max(1, Math.trunc(Number(text(values.rating))) || 1));
  return {
    id: `${slug(name) || 'traveller'}-${yearMonth(submittedAt)}-${submittedAt.toString(36).slice(-5)}`,
    name,
    rating,
    text: text(values.feedback),
    ...(journey || places ? { journey: journey && places ? `${journey} (${places})` : journey || places } : {}),
    ...(text(values.city) ? { location: text(values.city) } : {}),
  };
};

/** Why an entry cannot be published as it is (e.g. the text contains a phone number), or null. */
export const publishProblem = (entry: Testimonial): string | null => {
  try {
    checkTestimonials([entry]);
    return null;
  } catch (error) {
    return (error as Error).message.split('\n').slice(1).map((line) => line.replace(/^\s*testimonials\[0\][^:]*:\s*/, '')).join('; ');
  }
};

const publicFields = ({ approvedAt: _approvedAt, ...entry }: StoredTestimonial): Testimonial => entry;

/** Approved (newest first) followed by any entries kept in src/data/testimonials.mjs; featured ones lead. */
export const mergedTestimonials = (stored: StoredTestimonial[], fixed: readonly Testimonial[] = staticTestimonials): Testimonial[] => {
  const approved = [...stored].sort((a, b) => b.approvedAt - a.approvedAt).map(publicFields);
  const ids = new Set(approved.map((entry) => entry.id));
  return checkTestimonials([...approved, ...fixed.filter((entry) => !ids.has(entry.id))]);
};

// The CDN keeps the list for a minute, so a new approval is live within about a minute without a redeploy.
const LIST_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'public, max-age=0, must-revalidate',
  'Netlify-CDN-Cache-Control': 'public, s-maxage=60, stale-while-revalidate=60',
  'X-Robots-Tag': 'noindex',
};

/** GET /api/testimonials: the rendered homepage section and /feedback/ grid, using the same templates as the build. */
export const createTestimonialsHandler = (deps: { store: TestimonialStore; fixed?: readonly Testimonial[]; logError?: (message: string, details?: Record<string, unknown>) => void }) =>
  async (req: Request): Promise<Response> => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return new Response(null, { status: 405, headers: { Allow: 'GET' } });
    try {
      const stories = mergedTestimonials(await deps.store.list(), deps.fixed);
      const body = { version: storiesVersion(stories), count: stories.length, section: storiesSection(stories, { live: true }), grid: storiesGrid(stories, { live: true }) };
      return new Response(JSON.stringify(body), { status: 200, headers: LIST_HEADERS });
    } catch (error) {
      (deps.logError ?? ((message, details) => console.error(`[testimonials] ${message}`, details ?? {})))('Could not load testimonials', { reason: (error as Error).message?.slice(0, 200) });
      // The page keeps what it already shows.
      return new Response(JSON.stringify({ ok: false }), { status: 503, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
    }
  };
