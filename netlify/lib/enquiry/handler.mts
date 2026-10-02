// Enquiry endpoint logic, independent of Netlify so it can be unit-tested with a mock mail transport.
// One endpoint serves enquiries and traveller feedback; `form_type` selects the rules, email and thank-you page.
import { MIN_FILL_MS, formKind, successPath, validateSubmission, type FormKind } from '../../../src/lib/enquiry-rules.mjs';
import { buildEnquiryEmail, buildFeedbackEmail, readMailConfig, type MailConfig, type MailMessage } from './email.mts';
import { BadRequestError, htmlErrorPage, jsonResponse, parseBody, redirectResponse, wantsJson, type FieldInput } from './http.mts';
import { clientIp, isAllowedOrigin, parseOriginList, suspiciousReasons, type RateLimiter } from './security.mts';

export interface MailTransport {
  sendMail(message: MailMessage): Promise<unknown>;
}

export interface EnquiryDependencies {
  /** Environment variables, read on every request so a redeploy is the only thing needed after changes. */
  env: () => Record<string, string | undefined>;
  createTransport: (config: MailConfig) => MailTransport;
  rateLimiter: RateLimiter;
  now?: () => number;
  logError?: (message: string, details?: Record<string, unknown>) => void;
  sendTimeoutMs?: number;
}

export const SEND_TIMEOUT_MS = 9000;
const HONEYPOT_FIELD = 'website';

const PHONE_FALLBACK = 'Please call or WhatsApp us instead, or email us directly.';
/** What the visitor is sending, in their words. */
const NOUN: Record<FormKind, string> = { enquiry: 'enquiry', feedback: 'feedback' };
const MESSAGES = {
  method: 'This address only accepts enquiry form submissions.',
  origin: 'This form can only be sent from the NE Insights website.',
  // Checked before the body is read, so the wording covers enquiries and feedback alike.
  rateLimited: 'You have sent several messages in a short time. Please wait a few minutes and try again, or contact us directly.',
  validation: 'Some details need your attention.',
  notConfigured: (kind: FormKind) => `Our ${NOUN[kind]} form is temporarily unavailable. ${PHONE_FALLBACK}`,
  deliveryFailed: (kind: FormKind) => `We couldn’t deliver your ${NOUN[kind]} just now. Your details are still in the form. ${PHONE_FALLBACK}`,
} as const;

const EMAIL_BUILDERS = { enquiry: buildEnquiryEmail, feedback: buildFeedbackEmail } as const;
/** Free-text fields scanned for spam keywords and links. */
const SPAM_FIELDS: Record<FormKind, string[]> = { enquiry: ['name', 'message', 'requirements', 'city', 'topic'], feedback: ['name', 'feedback', 'city'] };

const firstValue = (value: string | string[] | undefined): string => (Array.isArray(value) ? value[0] ?? '' : value ?? '');

const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Mail server did not respond within ${ms} ms`)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error: unknown) => { clearTimeout(timer); reject(error); },
    );
  });

/** Picks the source page from the form (set by JavaScript) or, for plain posts, the Referer header. */
const sourcePage = (fields: FieldInput, headers: Headers): string => {
  const candidate = firstValue(fields.page) || headers.get('referer') || '';
  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href.slice(0, 500) : '';
  } catch {
    return '';
  }
};

/** Form timer: returns 'bot' when submitted too quickly, or a note when the timer can't be verified. */
const checkTimer = (fields: FieldInput, now: number): 'bot' | 'ok' | string => {
  const loadedAt = Number(firstValue(fields.ts));
  if (!Number.isFinite(loadedAt) || loadedAt <= 0) return 'Form timer not available (JavaScript off or field removed)';
  const elapsed = now - loadedAt;
  if (elapsed < 0) return 'Form timer could not be verified (visitor clock ahead of server)';
  return elapsed < MIN_FILL_MS ? 'bot' : 'ok';
};

/** JSON for JavaScript clients; a 303 redirect or a branded HTML page for plain form posts. */
const responder = (json: boolean, kind: FormKind) => ({
  fail: (status: number, code: string, message: string, extra: Record<string, unknown> = {}, headers: Record<string, string> = {}): Response =>
    json ? jsonResponse(status, { ok: false, code, message, ...extra }, headers) : htmlErrorPage(status, status === 422 ? 'Please check your details' : `Your ${NOUN[kind]} was not sent`, message, (extra.errors as Record<string, string>) ?? {}, headers),
  succeed: (): Response => (json ? jsonResponse(200, { ok: true, redirect: successPath(kind) }) : redirectResponse(successPath(kind))),
});

export const createEnquiryHandler = (deps: EnquiryDependencies) => {
  const now = deps.now ?? Date.now;
  const logError = deps.logError ?? ((message: string, details?: Record<string, unknown>) => console.error(`[enquiry] ${message}`, details ?? {}));

  return async (req: Request, meta: { ip?: string } = {}): Promise<Response> => {
    const json = wantsJson(req);
    // Until the body is read the form type is unknown, so these early responses use the enquiry wording.
    const { fail } = responder(json, 'enquiry');

    if (req.method !== 'POST') return fail(405, 'method', MESSAGES.method, {}, { Allow: 'POST' });

    const env = deps.env();
    if (!isAllowedOrigin(req.headers, parseOriginList(env.ALLOWED_ORIGINS))) return fail(403, 'origin', MESSAGES.origin);

    const limit = deps.rateLimiter.hit(clientIp(req.headers, meta.ip));
    if (!limit.allowed) return fail(429, 'rate_limited', MESSAGES.rateLimited, {}, { 'Retry-After': String(limit.retryAfterSeconds) });

    let fields: FieldInput;
    try {
      fields = await parseBody(req);
    } catch (error) {
      if (error instanceof BadRequestError) return fail(error.status, 'bad_request', error.message);
      return fail(400, 'bad_request', 'The form data could not be read.');
    }

    const kind = formKind(firstValue(fields.form_type));
    const form = responder(json, kind);

    // Bots learn nothing: honeypot and too-fast submissions get the normal success response.
    if (firstValue(fields[HONEYPOT_FIELD]).trim()) return form.succeed();
    const timer = checkTimer(fields, now());
    if (timer === 'bot') return form.succeed();

    const { values, errors } = validateSubmission(fields, { now: now() });
    if (Object.keys(errors).length) return form.fail(422, 'validation', MESSAGES.validation, { errors });

    const { config, missing } = readMailConfig(env);
    if (!config) {
      logError('Mail settings missing', { missing });
      return form.fail(500, 'not_configured', MESSAGES.notConfigured(kind));
    }

    const message = EMAIL_BUILDERS[kind](
      {
        values,
        pageUrl: sourcePage(fields, req.headers),
        submittedAt: now(),
        spamReasons: suspiciousReasons(SPAM_FIELDS[kind].map((name) => values[name]).join(' ')),
        notes: timer === 'ok' ? [] : [timer],
      },
      config,
    );
    try {
      await withTimeout(deps.createTransport(config).sendMail(message), deps.sendTimeoutMs ?? SEND_TIMEOUT_MS);
    } catch (error) {
      const detail = error as { code?: string; responseCode?: number; message?: string };
      logError('SMTP delivery failed', { code: detail.code, responseCode: detail.responseCode, reason: detail.message?.slice(0, 200) });
      return form.fail(502, 'delivery_failed', MESSAGES.deliveryFailed(kind));
    }
    return form.succeed();
  };
};
