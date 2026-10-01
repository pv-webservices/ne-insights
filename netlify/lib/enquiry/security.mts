// Spam and abuse protection for the enquiry endpoint.

const PRODUCTION_HOSTS = new Set(['neinsights.in', 'www.neinsights.in', 'ne-insights.netlify.app']);
// Netlify deploy previews and branch deploys: deploy-preview-12--ne-insights.netlify.app, main--ne-insights.netlify.app
const PREVIEW_HOST_SUFFIX = '--ne-insights.netlify.app';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * True when the request comes from one of the site's own pages.
 * Checks the Origin header and falls back to the Referer (some browsers omit Origin on same-origin POSTs).
 */
export const isAllowedOrigin = (headers: Headers, extraOrigins: string[] = []): boolean => {
  const origin = headers.get('origin');
  const candidate = origin && origin !== 'null' ? origin : headers.get('referer');
  if (!candidate) return false;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return false;
  }
  if (extraOrigins.includes(url.origin)) return true;
  if (LOCAL_HOSTS.has(url.hostname)) return url.protocol === 'http:' || url.protocol === 'https:';
  if (url.protocol !== 'https:') return false;
  return PRODUCTION_HOSTS.has(url.hostname) || url.hostname.endsWith(PREVIEW_HOST_SUFFIX);
};

/** Parses a comma-separated ALLOWED_ORIGINS environment variable into exact origins. */
export const parseOriginList = (value: string | undefined): string[] =>
  (value ?? '').split(',').map((item) => item.trim().replace(/\/$/, '')).filter(Boolean);

/** Best-effort client IP on Netlify (context.ip), then the forwarding headers. */
export const clientIp = (headers: Headers, contextIp?: string): string =>
  contextIp || headers.get('x-nf-client-connection-ip') || headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

export interface RateLimiter {
  /** Records an attempt and returns whether it is allowed, with the seconds until the oldest attempt expires. */
  hit(key: string): { allowed: boolean; retryAfterSeconds: number };
}

const MAX_TRACKED_KEYS = 5000;

/**
 * Sliding-window limiter held in function memory. Netlify may run several instances, so this is a
 * second line of defence behind the platform rate limit configured on the function.
 */
export const createRateLimiter = ({ limit, windowMs, now = Date.now }: { limit: number; windowMs: number; now?: () => number }): RateLimiter => {
  const attempts = new Map<string, number[]>();
  return {
    hit(key) {
      const time = now();
      const recent = (attempts.get(key) ?? []).filter((stamp) => time - stamp < windowMs);
      if (recent.length >= limit) {
        attempts.set(key, recent);
        return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((recent[0] + windowMs - time) / 1000)) };
      }
      attempts.delete(key);
      attempts.set(key, [...recent, time]);
      if (attempts.size > MAX_TRACKED_KEYS) attempts.delete(attempts.keys().next().value as string);
      return { allowed: true, retryAfterSeconds: 0 };
    },
  };
};

/** Makes a value safe for a single-line email header: no line breaks or control characters. */
export const headerSafe = (value: string, maxLength = 120): string =>
  value.replace(/[\x00-\x1f\x7f\x85\u{2028}\u{2029}]+/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength);

const SUSPICIOUS_PATTERNS: [string, RegExp][] = [
  ['crypto', /\b(crypto|bitcoin|btc|forex|binary options?)\b/i],
  ['gambling', /\b(casino|betting|jackpot)\b/i],
  ['pharmacy', /\b(viagra|cialis|pharmacy)\b/i],
  ['adult', /\b(porn|escort|xxx)\b/i],
  ['marketing', /\b(seo|backlinks?|guest posts?|link building|web design services|rank(ing)? your (site|website))\b/i],
  ['money', /\b(loan offer|make money|investment opportunity|work from home)\b/i],
  ['link markup', /<a\s|\[url=|\[link=/i],
];
const MAX_LINKS_BEFORE_FLAG = 2;

/** Returns the reasons a submission looks like spam. Flagged enquiries are still delivered. */
export const suspiciousReasons = (text: string): string[] => {
  const reasons = SUSPICIOUS_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([reason]) => reason);
  const links = text.match(/https?:\/\/|www\./gi)?.length ?? 0;
  if (links > MAX_LINKS_BEFORE_FLAG) reasons.push(`${links} links`);
  return reasons;
};
