// Signed "review" tokens for the Approve / Reject links in traveller-feedback emails.
// The token carries the publishable testimonial itself (compressed), so nothing is stored until someone
// with the email approves it. HMAC-SHA256 makes it tamper-proof: only links the server issued are accepted.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { deflateRawSync, inflateRawSync } from 'node:zlib';
import type { Testimonial } from '../../../src/components/testimonials.mjs';

const VERSION = 'v1';
/** Approve links stay valid this long; Reject/Remove links never expire (removing must always be possible). */
export const APPROVE_LINK_TTL_MS = 180 * 24 * 60 * 60 * 1000;
const KEY_CONTEXT = 'ne-insights feedback review v1';

export interface ReviewClaim {
  entry: Testimonial;
  /** Expiry of the approve permission (ms since epoch). */
  expiresAt: number;
}

/**
 * Signing key: FEEDBACK_REVIEW_SECRET if set, otherwise derived from the SMTP password, so the links work
 * without extra setup. Changing either secret invalidates links in earlier emails.
 */
export const reviewKey = (env: Record<string, string | undefined>): Buffer | null => {
  const secret = env.FEEDBACK_REVIEW_SECRET?.trim() || env.SMTP_PASS;
  return secret ? createHmac('sha256', secret).update(KEY_CONTEXT).digest() : null;
};

const sign = (key: Buffer, data: string): string => createHmac('sha256', key).update(data).digest('base64url');

export const signReview = (claim: ReviewClaim, key: Buffer): string => {
  const payload = deflateRawSync(Buffer.from(JSON.stringify({ e: claim.entry, x: claim.expiresAt }))).toString('base64url');
  return `${VERSION}.${payload}.${sign(key, `${VERSION}.${payload}`)}`;
};

/** Returns the claim only if the token is well formed and its signature matches. Expiry is checked by the caller. */
export const verifyReview = (token: string, key: Buffer): ReviewClaim | null => {
  const [version, payload, signature, extra] = token.split('.');
  if (version !== VERSION || !payload || !signature || extra !== undefined) return null;
  const expected = Buffer.from(sign(key, `${version}.${payload}`));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const data = JSON.parse(inflateRawSync(Buffer.from(payload, 'base64url'), { maxOutputLength: 64 * 1024 }).toString('utf8')) as { e?: Testimonial; x?: number };
    return data.e && typeof data.x === 'number' ? { entry: data.e, expiresAt: data.x } : null;
  } catch {
    return null;
  }
};
