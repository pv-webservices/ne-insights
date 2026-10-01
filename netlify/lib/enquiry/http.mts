// Request parsing and responses for the enquiry endpoint. JavaScript clients get JSON;
// plain HTML form posts (JavaScript off) get a 303 redirect or a small branded HTML page.
import { site } from '../../../src/data/site.mjs';
import { escapeHtml } from './email.mts';

export const MAX_BODY_BYTES = 32 * 1024;

export type FieldInput = Record<string, string | string[]>;

export class BadRequestError extends Error {
  readonly status: 400 | 413 | 415;
  constructor(status: 400 | 413 | 415, message: string) {
    super(message);
    this.status = status;
  }
}

export const wantsJson = (req: Request): boolean =>
  (req.headers.get('accept') ?? '').includes('application/json') || (req.headers.get('content-type') ?? '').includes('application/json');

const appendField = (target: FieldInput, key: string, value: string): void => {
  const existing = target[key];
  target[key] = existing === undefined ? value : [...(Array.isArray(existing) ? existing : [existing]), value];
};

/** Reads JSON, URL-encoded or multipart bodies into a flat field map (repeated keys become arrays). */
export const parseBody = async (req: Request): Promise<FieldInput> => {
  const declared = Number(req.headers.get('content-length') ?? 0);
  if (declared > MAX_BODY_BYTES) throw new BadRequestError(413, 'The form submission is too large.');
  const type = req.headers.get('content-type') ?? '';
  const fields: FieldInput = {};
  if (type.includes('multipart/form-data')) {
    const form = await req.formData();
    for (const [key, value] of form.entries()) if (typeof value === 'string') appendField(fields, key, value);
    return fields;
  }
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) throw new BadRequestError(413, 'The form submission is too large.');
  if (type.includes('application/json')) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new BadRequestError(400, 'The form data could not be read.');
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new BadRequestError(400, 'The form data could not be read.');
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (Array.isArray(value)) fields[key] = value.filter((item) => typeof item === 'string');
      else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') fields[key] = String(value);
    }
    return fields;
  }
  if (type.includes('application/x-www-form-urlencoded') || type === '') {
    for (const [key, value] of new URLSearchParams(text)) appendField(fields, key, value);
    return fields;
  }
  throw new BadRequestError(415, 'Unsupported form encoding.');
};

const NO_STORE = { 'Cache-Control': 'no-store' };

export const jsonResponse = (status: number, body: Record<string, unknown>, headers: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...NO_STORE, ...headers } });

/** 303 See Other makes the browser follow with GET, so refreshing the thank-you page never resubmits. */
export const redirectResponse = (location: string): Response => new Response(null, { status: 303, headers: { Location: location, ...NO_STORE } });

const telHref = `tel:${site.phone.replace(/\s/g, '')}`;

/** Branded fallback page for visitors without JavaScript. Their entries stay in the form when they go back. */
export const htmlErrorPage = (status: number, title: string, message: string, errors: Record<string, string> = {}, headers: Record<string, string> = {}): Response => {
  const list = Object.values(errors);
  const body = `<!doctype html><html lang="en-IN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, follow"><title>${escapeHtml(title)} | NE Insights</title><link rel="icon" href="/favicon.svg" type="image/svg+xml"><style>body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Arial,sans-serif;background:#f3f5f9;color:#1d2433;line-height:1.6}main{max-width:620px;margin:40px auto;padding:28px;background:#fff;border-radius:14px;border-top:6px solid #fde404}h1{color:#0b2a66;font-size:1.6rem;margin-top:0}a{color:#0b2a66;font-weight:600}li{margin:4px 0}.alt{margin-top:24px;padding:16px;background:#f3f5f9;border-radius:10px}</style></head><body><main><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p>${list.length ? `<ul>${list.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}<p>Use your browser’s <strong>Back</strong> button to return to the form. Your details will still be there.</p><div class="alt"><p><strong>Prefer to reach us directly?</strong></p><p>Call <a href="${telHref}">${escapeHtml(site.phone)}</a><br>WhatsApp <a href="https://wa.me/${site.whatsapp}">${escapeHtml(site.phone)}</a><br>Email <a href="mailto:${escapeHtml(site.email)}">${escapeHtml(site.email)}</a></p></div><p><a href="/">NE Insights home</a></p></main></body></html>`;
  return new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', ...NO_STORE, ...headers } });
};
