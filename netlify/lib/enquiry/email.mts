// Builds the enquiry notification email (branded HTML table + plain-text alternative).
import { FIELDS, FORM_TYPES, TIME_ZONE } from '../../../src/lib/enquiry-rules.mjs';
import { headerSafe } from './security.mts';

export interface MailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  to: string;
  from: string;
}

export interface MailMessage {
  from: { name: string; address: string };
  to: string;
  replyTo: { name: string; address: string };
  subject: string;
  text: string;
  html: string;
}

export interface EnquiryDetails {
  values: Record<string, string | string[]>;
  pageUrl: string;
  submittedAt: number;
  /** Suspicious-content reasons: prefix the subject so the team can review, never drop the email. */
  spamReasons: string[];
  /** Informational checks, e.g. the form timer could not be verified (JavaScript off). */
  notes: string[];
}

const SITE_NAME = 'NE Insights';
const NAVY = '#0b2a66';
const YELLOW = '#fde404';
const SUBJECT_TOPIC_LIMIT = 90;

export const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] as string);

export const formatSubmittedAt = (timestamp: number): string =>
  new Intl.DateTimeFormat('en-IN', { timeZone: TIME_ZONE, dateStyle: 'full', timeStyle: 'long' }).format(timestamp);

const formTypeLabel = (value: string): string => (FORM_TYPES as Record<string, string>)[value] ?? 'Website enquiry';

const asText = (value: string | string[] | undefined): string => (Array.isArray(value) ? value.join(', ') : value ?? '');

/** "New enquiry from {Name}: {Subject}", where the subject is the package/topic or the form type. */
export const buildSubject = (details: EnquiryDetails): string => {
  const { values, spamReasons } = details;
  const destinations = asText(values.destinations);
  const topic = asText(values.topic) || [formTypeLabel(asText(values.form_type)), destinations].filter(Boolean).join(' - ');
  const prefix = spamReasons.length ? '[Possible spam] ' : '';
  return headerSafe(`${prefix}New enquiry from ${headerSafe(asText(values.name), 60)}: ${headerSafe(topic, SUBJECT_TOPIC_LIMIT)}`, 200);
};

const rows = (details: EnquiryDetails): [string, string][] => {
  const { values } = details;
  const fieldRows = Object.entries(FIELDS)
    .filter(([name]) => name !== 'consent')
    .map(([name, rule]): [string, string] => [rule.label, asText(values[name])])
    .filter(([, value]) => value !== '');
  return [
    ['Form', formTypeLabel(asText(values.form_type))],
    ...(asText(values.topic) ? [['Enquiring about', asText(values.topic)] as [string, string]] : []),
    ...fieldRows,
    ['Privacy consent', 'Yes – agreed to the privacy notice'],
    ['Source page', details.pageUrl || 'Not provided'],
    ['Submitted', formatSubmittedAt(details.submittedAt)],
    ...(details.spamReasons.length ? [['Possible spam', details.spamReasons.join('; ')] as [string, string]] : []),
    ...(details.notes.length ? [['Automatic checks', details.notes.join('; ')] as [string, string]] : []),
  ];
};

const htmlValue = (label: string, value: string): string => {
  const safe = escapeHtml(value);
  if (label === 'Email address') return `<a href="mailto:${safe}" style="color:${NAVY}">${safe}</a>`;
  if (label === 'Phone number') return `<a href="tel:${escapeHtml(value.replace(/[^\d+]/g, ''))}" style="color:${NAVY}">${safe}</a>`;
  if (label === 'Source page' && /^https?:\/\//.test(value)) return `<a href="${safe}" style="color:${NAVY}">${safe}</a>`;
  return safe.replace(/\n/g, '<br>');
};

export const buildEnquiryEmail = (details: EnquiryDetails, config: Pick<MailConfig, 'to' | 'from'>): MailMessage => {
  const name = headerSafe(asText(details.values.name), 80);
  const email = asText(details.values.email);
  const subject = buildSubject(details);
  const table = rows(details);
  const text = [
    `New website enquiry – ${SITE_NAME}`,
    '',
    ...table.map(([label, value]) => `${label}: ${value.includes('\n') ? `\n${value}` : value}`),
    '',
    `Reply to this email to answer ${name} directly.`,
  ].join('\n');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head><body style="margin:0;padding:24px;background:#f3f5f9;font-family:Arial,Helvetica,sans-serif;color:#1d2433">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #dde3ee">
<tr><td style="background:${NAVY};padding:20px 24px;border-bottom:4px solid ${YELLOW}"><div style="color:${YELLOW};font-size:12px;letter-spacing:.12em;text-transform:uppercase;font-weight:bold">${SITE_NAME}</div><div style="color:#ffffff;font-size:20px;font-weight:bold;margin-top:4px">New website enquiry</div></td></tr>
<tr><td style="padding:8px 24px 4px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;line-height:1.5">
${table.map(([label, value]) => `<tr><th scope="row" align="left" valign="top" style="padding:10px 12px 10px 0;border-bottom:1px solid #eef1f6;width:34%;color:#5a6478;font-weight:600">${escapeHtml(label)}</th><td valign="top" style="padding:10px 0;border-bottom:1px solid #eef1f6">${htmlValue(label, value)}</td></tr>`).join('\n')}
</table></td></tr>
<tr><td style="padding:16px 24px 22px;font-size:13px;color:#5a6478">Reply to this email to answer ${escapeHtml(name)} directly.</td></tr>
</table></body></html>`;
  return {
    from: { name: `${name} via ${SITE_NAME}`, address: config.from },
    to: config.to,
    replyTo: { name, address: email },
    subject,
    text,
    html,
  };
};

/** Reads SMTP settings from environment variables. Never logs or returns the password elsewhere. */
export const readMailConfig = (env: Record<string, string | undefined>): { config: MailConfig; missing: [] } | { config: null; missing: string[] } => {
  const required = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'MAIL_TO', 'MAIL_FROM'] as const;
  const missing = required.filter((key) => !env[key]?.trim());
  const port = Number(env.SMTP_PORT);
  if (env.SMTP_PORT && (!Number.isInteger(port) || port <= 0)) missing.push('SMTP_PORT');
  if (missing.length) return { config: null, missing: [...new Set(missing)] };
  return {
    missing: [],
    config: {
      host: env.SMTP_HOST!.trim(),
      port,
      secure: env.SMTP_SECURE ? env.SMTP_SECURE === 'true' : port === 465,
      user: env.SMTP_USER!.trim(),
      pass: env.SMTP_PASS!,
      to: env.MAIL_TO!.trim(),
      from: env.MAIL_FROM!.trim(),
    },
  };
};
