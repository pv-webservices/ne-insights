// /api/feedback-review: the page behind the "Approve & publish" and "Reject" buttons in feedback emails.
// GET only shows the feedback and its status (mail scanners open links, so opening must never change
// anything); the buttons on the page POST the decision. The signed token in the link is the permission.
import { site } from '../../../src/data/site.mjs';
import { RATING_MAX, cleanText } from '../../../src/lib/enquiry-rules.mjs';
import type { Testimonial } from '../../../src/components/testimonials.mjs';
import { escapeHtml } from '../enquiry/email.mts';
import { parseBody } from '../enquiry/http.mts';
import { clientIp, isAllowedOrigin, parseOriginList, type RateLimiter } from '../enquiry/security.mts';
import { publishProblem } from './publish.mts';
import { reviewKey, verifyReview } from './review-token.mts';
import type { TestimonialStore } from './store.mts';

export const REVIEW_PATH = '/api/feedback-review';
const NAME_MIN = 2;
const NAME_MAX = 60;

type Done = 'approved' | 'rejected' | 'removed';
const DONE_MESSAGES: Record<Done, string> = {
  approved: 'Published. It will appear on the website within about a minute.',
  rejected: 'Rejected. This feedback will not be shown on the website.',
  removed: 'Removed. This feedback is no longer shown on the website.',
};

export interface ReviewDependencies {
  env: () => Record<string, string | undefined>;
  store: TestimonialStore;
  rateLimiter: RateLimiter;
  now?: () => number;
  logError?: (message: string, details?: Record<string, unknown>) => void;
}

// same-origin: the link token never leaks to other sites in a Referer, while the page's own form POST
// still carries a real Origin header (no-referrer would make it "null" and fail the origin check).
const HEADERS = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex', 'Referrer-Policy': 'same-origin', 'X-Frame-Options': 'DENY' };
const STYLE = 'body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Arial,sans-serif;background:#f3f5f9;color:#1d2433;line-height:1.6}main{max-width:640px;margin:32px auto;padding:0 16px}.card{padding:24px;background:#fff;border-radius:14px;border-top:6px solid #fde404;box-shadow:0 10px 30px -18px rgba(11,42,102,.4)}.brand{margin:0;font-size:12px;font-weight:800;letter-spacing:.14em;color:#1d7a3e}h1{margin:4px 0 16px;color:#0b2a66;font-size:1.6rem;line-height:1.2}.status{display:inline-block;margin:0 0 16px;padding:4px 12px;border-radius:99px;font-size:13px;font-weight:700;background:#eef1f6;color:#0b2a66}.status.live{background:#e8f4eb;color:#1d7a3e}.notice{margin:0 0 16px;padding:12px 14px;border-radius:10px;font-weight:600}.ok{background:#e8f4eb;color:#14532d}.warn{background:#fff8d9;color:#5c4200}.err{background:#fff1f0;color:#8a1c12}blockquote{margin:0 0 12px;padding:16px 18px;border-left:4px solid #fde404;background:#fbf8ee;border-radius:0 10px 10px 0;font-size:1.05rem;color:#0b2a66}blockquote p{margin:0 0 8px}blockquote p:last-child{margin:0}.stars{color:#8f6300;font-size:1.2rem;letter-spacing:2px}.who{margin:0 0 20px;font-size:14px}.who strong{color:#0b2a66}form{margin:0 0 12px}label{display:block;font-weight:700;color:#0b2a66;font-size:14px;margin-bottom:6px}input[type=text]{box-sizing:border-box;width:100%;padding:11px 12px;border:1.5px solid #dde3ee;border-radius:10px;font:inherit;margin-bottom:6px}.hint{margin:0 0 12px;font-size:13px;color:#5a6478}button{min-height:46px;padding:11px 20px;border:2px solid transparent;border-radius:99px;font:inherit;font-weight:700;cursor:pointer}.approve{background:#1d7a3e;color:#fff}.reject{background:#fff;border-color:#b42318;color:#b42318}button:focus-visible,input:focus-visible,a:focus-visible{outline:3px solid #f2b705;outline-offset:2px}.small{font-size:13px;color:#5a6478}a{color:#0b2a66;font-weight:600}';

const page = (status: number, title: string, body: string): Response =>
  new Response(`<!doctype html><html lang="en-IN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>${escapeHtml(title)} | NE Insights</title><link rel="icon" href="/favicon.svg" type="image/svg+xml"><style>${STYLE}</style></head><body><main><div class="card"><p class="brand">NE INSIGHTS · TRAVELLER FEEDBACK</p><h1>${escapeHtml(title)}</h1>${body}</div><p class="small">Only people with the feedback email can use these buttons, so please don’t forward it. <a href="${site.url}/">Go to the website</a></p></main></body></html>`, { status, headers: HEADERS });

const preview = (entry: Testimonial): string => {
  const stars = `${'★'.repeat(entry.rating)}${'☆'.repeat(RATING_MAX - entry.rating)}`;
  const meta = [entry.journey, entry.location].filter(Boolean).map((value) => escapeHtml(String(value))).join(' · ');
  return `<p class="stars" aria-label="Rated ${entry.rating} out of ${RATING_MAX}">${stars} <span class="small">${entry.rating}/${RATING_MAX}</span></p><blockquote>${entry.text.trim().split(/\n+/).map((line) => `<p>${escapeHtml(line.trim())}</p>`).join('')}</blockquote><p class="who"><strong>${escapeHtml(entry.name)}</strong>${meta ? ` · ${meta}` : ''}</p>`;
};

const decisionForms = (token: string, entry: Testimonial, { published, canApprove }: { published: boolean; canApprove: boolean }): string => {
  const hidden = `<input type="hidden" name="t" value="${escapeHtml(token)}">`;
  const approve = canApprove
    ? `<form method="post" action="${REVIEW_PATH}">${hidden}<input type="hidden" name="action" value="approve"><label for="name">Name shown on the website</label><input type="text" id="name" name="name" value="${escapeHtml(entry.name)}" minlength="${NAME_MIN}" maxlength="${NAME_MAX}" required autocomplete="off"><p class="hint">Shorten it if the traveller prefers, e.g. “Rahul S.”.</p><button class="approve" type="submit">${published ? 'Update on website' : 'Approve &amp; publish'}</button></form>`
    : '';
  const reject = `<form method="post" action="${REVIEW_PATH}">${hidden}<input type="hidden" name="action" value="reject"><button class="reject" type="submit">${published ? 'Remove from website' : 'Reject'}</button></form>`;
  return approve + reject;
};

const reviewUrl = (token: string, done: Done): string => `${REVIEW_PATH}?t=${encodeURIComponent(token)}&done=${done}`;

export const createReviewHandler = (deps: ReviewDependencies) => {
  const now = deps.now ?? Date.now;
  const logError = deps.logError ?? ((message: string, details?: Record<string, unknown>) => console.error(`[feedback-review] ${message}`, details ?? {}));
  const invalid = () => page(403, 'This link is not valid', '<p>The link may be incomplete or changed. Open it again from the feedback email, or copy the whole address.</p>');

  const show = async (token: string, done: string | null): Promise<Response> => {
    const key = reviewKey(deps.env());
    if (!key) return page(500, 'Feedback review is not set up', '<p>The website’s mail settings are missing. Ask your web developer to check them.</p>');
    const claim = verifyReview(token, key);
    if (!claim) return invalid();
    const published = await deps.store.get(claim.entry.id);
    const entry = published ? { ...claim.entry, name: published.name } : claim.entry;
    const expired = now() > claim.expiresAt;
    const problem = publishProblem(claim.entry);
    const notice = done && done in DONE_MESSAGES
      ? `<p class="notice ok" role="status">${DONE_MESSAGES[done as Done]}</p>`
      : problem ? `<p class="notice warn">This feedback can’t be published as it is: ${escapeHtml(problem)}.</p>`
      : expired && !published ? '<p class="notice warn">This approve link has expired (links last 180 days). You can still reject it.</p>' : '';
    const status = published ? '<p class="status live">Published on the website</p>' : '<p class="status">Not on the website</p>';
    return page(200, 'Review traveller feedback', `${notice}${status}${preview(entry)}${decisionForms(token, entry, { published: !!published, canApprove: !problem && !expired })}`);
  };

  const decide = async (req: Request, meta: { ip?: string }): Promise<Response> => {
    const env = deps.env();
    if (!isAllowedOrigin(req.headers, parseOriginList(env.ALLOWED_ORIGINS))) return page(403, 'Not allowed', '<p>Decisions can only be made from the review page on the NE Insights website.</p>');
    if (!deps.rateLimiter.hit(clientIp(req.headers, meta.ip)).allowed) return page(429, 'Please wait a moment', '<p>Too many attempts in a short time. Try again in a few minutes.</p>');
    const fields = await parseBody(req).catch(() => null);
    const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? '';
    const token = first(fields?.t);
    const key = reviewKey(env);
    const claim = key ? verifyReview(token, key) : null;
    if (!claim) return invalid();
    const action = first(fields?.action);
    if (action === 'reject') {
      const existed = await deps.store.get(claim.entry.id);
      await deps.store.remove(claim.entry.id);
      return new Response(null, { status: 303, headers: { Location: reviewUrl(token, existed ? 'removed' : 'rejected'), 'Cache-Control': 'no-store' } });
    }
    if (action !== 'approve') return page(400, 'Something went wrong', '<p>Choose Approve or Reject on the review page.</p>');
    if (now() > claim.expiresAt) return show(token, null);
    const name = cleanText(first(fields?.name)).slice(0, NAME_MAX);
    const entry: Testimonial = { ...claim.entry, name: name.length >= NAME_MIN ? name : claim.entry.name };
    const problem = publishProblem(entry);
    if (problem) return page(422, 'Please check the name', `<p class="notice err">${escapeHtml(problem)}.</p><p><a href="${REVIEW_PATH}?t=${encodeURIComponent(token)}">Back to the review page</a></p>`);
    try {
      await deps.store.save({ ...entry, approvedAt: now() });
    } catch (error) {
      logError('Could not save testimonial', { reason: (error as Error).message?.slice(0, 200) });
      return page(502, 'Not published yet', '<p>The website could not save this just now. Please try again in a minute.</p>');
    }
    return new Response(null, { status: 303, headers: { Location: reviewUrl(token, 'approved'), 'Cache-Control': 'no-store' } });
  };

  return async (req: Request, meta: { ip?: string } = {}): Promise<Response> => {
    if (req.method === 'POST') return decide(req, meta);
    if (req.method !== 'GET') return new Response(null, { status: 405, headers: { Allow: 'GET, POST' } });
    const url = new URL(req.url);
    return show(url.searchParams.get('t') ?? '', url.searchParams.get('done'));
  };
};
