// Enquiry endpoint logic, independent of Netlify so it can be unit-tested with a mock mail transport.
import { MIN_FILL_MS, THANK_YOU_PATH, validateEnquiry } from '../../../src/lib/enquiry-rules.mjs';
import { buildEnquiryEmail, readMailConfig, type MailConfig, type MailMessage } from './email.mts';
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
const MESSAGES = {
  method: 'This address only accepts enquiry form submissions.',
  origin: 'This form can only be sent from the NE Insights website.',
  rateLimited: 'You have sent several enquiries in a short time. Please wait a few minutes and try again, or contact us directly.',
  validation: 'Some details need your attention.',
  notConfigured: `Our enquiry form is temporarily unavailable. ${PHONE_FALLBACK}`,
  deliveryFailed: `We couldn’t deliver your enquiry just now. Your details are still in the form. ${PHONE_FALLBACK}`,
} as const;

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

export const createEnquiryHandler = (deps: EnquiryDependencies) => {
  const now = deps.now ?? Date.now;
  const logError = deps.logError ?? ((message: string, details?: Record<string, unknown>) => console.error(`[enquiry] ${message}`, details ?? {}));

  return async (req: Request, meta: { ip?: string } = {}): Promise<Response> => {
    const json = wantsJson(req);
    const fail = (status: number, code: string, message: string, extra: Record<string, unknown> = {}, headers: Record<string, string> = {}): Response =>
      json ? jsonResponse(status, { ok: false, code, message, ...extra }, headers) : htmlErrorPage(status, status === 422 ? 'Please check your details' : 'Your enquiry was not sent', message, (extra.errors as Record<string, string>) ?? {}, headers);
    const succeed = (): Response => (json ? jsonResponse(200, { ok: true, redirect: THANK_YOU_PATH }) : redirectResponse(THANK_YOU_PATH));

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

    // Bots learn nothing: honeypot and too-fast submissions get the normal success response.
    if (firstValue(fields[HONEYPOT_FIELD]).trim()) return succeed();
    const timer = checkTimer(fields, now());
    if (timer === 'bot') return succeed();

    const { values, errors } = validateEnquiry(fields, { now: now() });
    if (Object.keys(errors).length) return fail(422, 'validation', MESSAGES.validation, { errors });

    const { config, missing } = readMailConfig(env);
    if (!config) {
      logError('Mail settings missing', { missing });
      return fail(500, 'not_configured', MESSAGES.notConfigured);
    }

    const message = buildEnquiryEmail(
      {
        values,
        pageUrl: sourcePage(fields, req.headers),
        submittedAt: now(),
        spamReasons: suspiciousReasons([values.name, values.message, values.requirements, values.city, values.topic].join(' ')),
        notes: timer === 'ok' ? [] : [timer],
      },
      config,
    );
    try {
      await withTimeout(deps.createTransport(config).sendMail(message), deps.sendTimeoutMs ?? SEND_TIMEOUT_MS);
    } catch (error) {
      const detail = error as { code?: string; responseCode?: number; message?: string };
      logError('SMTP delivery failed', { code: detail.code, responseCode: detail.responseCode, reason: detail.message?.slice(0, 200) });
      return fail(502, 'delivery_failed', MESSAGES.deliveryFailed);
    }
    return succeed();
  };
};
