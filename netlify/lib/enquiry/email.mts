// Builds the notification emails (branded HTML table + plain-text alternative) for enquiries and traveller feedback.
import { ENQUIRY_FIELDS, FEEDBACK_FIELDS, FORM_TYPES, RATING_MAX, TIME_ZONE, type FieldRule } from '../../../src/lib/enquiry-rules.mjs';
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

type Row = [label: string, value: string];

const SITE_NAME = 'NE Insights';
const NAVY = '#0b2a66';
const YELLOW = '#fde404';
const SUBJECT_TOPIC_LIMIT = 90;
const SPAM_PREFIX = '[Possible spam] ';
const CONSENT_FIELDS = new Set(['consent', 'publish_consent']);
const PRIVACY_ROW: Row = ['Privacy consent', 'Yes – agreed to the privacy notice'];

export const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] as string);

export const formatSubmittedAt = (timestamp: number): string =>
  new Intl.DateTimeFormat('en-IN', { timeZone: TIME_ZONE, dateStyle: 'full', timeStyle: 'long' }).format(timestamp);

const formTypeLabel = (value: string): string => (FORM_TYPES as Record<string, string>)[value] ?? 'Website enquiry';

const asText = (value: string | string[] | undefined): string => (Array.isArray(value) ? value.join(', ') : value ?? '');

const spamPrefix = (details: EnquiryDetails): string => (details.spamReasons.length ? SPAM_PREFIX : '');

/** "New enquiry from {Name}: {Subject}", where the subject is the package/topic or the form type. */
export const buildSubject = (details: EnquiryDetails): string => {
  const { values } = details;
  const destinations = asText(values.destinations);
  const topic = asText(values.topic) || [formTypeLabel(asText(values.form_type)), destinations].filter(Boolean).join(' - ');
  return headerSafe(`${spamPrefix(details)}New enquiry from ${headerSafe(asText(values.name), 60)}: ${headerSafe(topic, SUBJECT_TOPIC_LIMIT)}`, 200);
};

/** The rating was validated as a whole number from 1 to RATING_MAX; clamp anyway so the stars can never misrender. */
const ratingOf = (values: EnquiryDetails['values']): number => Math.min(RATING_MAX, Math.max(0, Math.trunc(Number(asText(values.rating))) || 0));

/** "New traveller feedback from {Name} — {rating}/5". */
export const buildFeedbackSubject = (details: EnquiryDetails): string =>
  headerSafe(`${spamPrefix(details)}New traveller feedback from ${headerSafe(asText(details.values.name), 60)} — ${ratingOf(details.values)}/${RATING_MAX}`, 200);

/** One row per filled-in field, labelled from the shared rules. Consent checkboxes get their own wording. */
const fieldRows = (fields: Record<string, FieldRule>, values: EnquiryDetails['values'], format: (name: string) => string | null = () => null): Row[] =>
  Object.entries(fields)
    .filter(([name]) => !CONSENT_FIELDS.has(name))
    .map(([name, rule]): Row => [rule.label, format(name) ?? asText(values[name])])
    .filter(([, value]) => value !== '');

const footerRows = (details: EnquiryDetails): Row[] => [
  ['Source page', details.pageUrl || 'Not provided'],
  ['Submitted', formatSubmittedAt(details.submittedAt)],
  ...(details.spamReasons.length ? [['Possible spam', details.spamReasons.join('; ')] as Row] : []),
  ...(details.notes.length ? [['Automatic checks', details.notes.join('; ')] as Row] : []),
];

const enquiryRows = (details: EnquiryDetails): Row[] => {
  const { values } = details;
  return [
    ['Form', formTypeLabel(asText(values.form_type))],
    ...(asText(values.topic) ? [['Enquiring about', asText(values.topic)] as Row] : []),
    ...fieldRows(ENQUIRY_FIELDS, values),
    PRIVACY_ROW,
    ...footerRows(details),
  ];
};

const feedbackRows = (details: EnquiryDetails): Row[] => {
  const { values } = details;
  const rating = ratingOf(values);
  const stars = `${'★'.repeat(rating)}${'☆'.repeat(RATING_MAX - rating)} ${rating}/${RATING_MAX}`;
  return [
    ['Form', formTypeLabel('feedback')],
    ...fieldRows(FEEDBACK_FIELDS, values, (name) => (name === 'rating' ? stars : null)),
    ['Permission to publish', 'Yes – agreed that NE Insights may publish this feedback, the rating, name and the city/journey shared, after review'],
    PRIVACY_ROW,
    ...footerRows(details),
  ];
};

const htmlValue = (label: string, value: string): string => {
  const safe = escapeHtml(value);
  if (label === 'Email address') return `<a href="mailto:${safe}" style="color:${NAVY}">${safe}</a>`;
  if (label === 'Phone number') return `<a href="tel:${escapeHtml(value.replace(/[^\d+]/g, ''))}" style="color:${NAVY}">${safe}</a>`;
  if (label === 'Source page' && /^https?:\/\//.test(value)) return `<a href="${safe}" style="color:${NAVY}">${safe}</a>`;
  return safe.replace(/\n/g, '<br>');
};

/** Approve / Reject links for a feedback email, or the reason the feedback can't be published as submitted. */
export type FeedbackReview = { approveUrl: string; rejectUrl: string } | { problem: string };

interface EmailLayout {
  heading: string;
  subject: string;
  rows: Row[];
  /** Plain-text closing lines (escaped for the HTML version). */
  closing: string[];
  /** Feedback only: the decision buttons, shown above the details. */
  review?: FeedbackReview;
}

const BUTTON = 'display:inline-block;margin:0 8px 8px 0;padding:11px 20px;border-radius:8px;font-weight:bold;font-size:15px;text-decoration:none';
const reviewHtml = (review: FeedbackReview | undefined): string => {
  if (!review) return '';
  if ('problem' in review) return `<tr><td style="padding:18px 24px 4px"><div style="padding:12px 14px;border-radius:8px;background:#fff8d9;color:#5c4200;font-size:14px">This feedback can’t be published on the website as submitted: ${escapeHtml(review.problem)}.</div></td></tr>`;
  return `<tr><td style="padding:20px 24px 6px"><div style="font-size:15px;font-weight:bold;color:${NAVY};margin-bottom:12px">Show this feedback on the website?</div><a href="${escapeHtml(review.approveUrl)}" style="${BUTTON};background:#1d7a3e;color:#ffffff">✓ Approve &amp; publish</a><a href="${escapeHtml(review.rejectUrl)}" style="${BUTTON};border:2px solid #b42318;padding:9px 18px;color:#b42318">✕ Reject</a><div style="font-size:12.5px;color:#5a6478">Each button opens a review page where you confirm. Nothing is published until you do.</div></td></tr>`;
};
const reviewText = (review: FeedbackReview | undefined): string[] => {
  if (!review) return [];
  if ('problem' in review) return [`This feedback can’t be published on the website as submitted: ${review.problem}.`, ''];
  return ['Show this feedback on the website? (Each link opens a review page where you confirm.)', `Approve & publish: ${review.approveUrl}`, `Reject: ${review.rejectUrl}`, ''];
};

const renderEmail = (layout: EmailLayout, details: EnquiryDetails, config: Pick<MailConfig, 'to' | 'from'>): MailMessage => {
  const name = headerSafe(asText(details.values.name), 80);
  const { heading, subject, rows: table, closing, review } = layout;
  const text = [
    `${heading} – ${SITE_NAME}`,
    '',
    ...reviewText(review),
    ...table.map(([label, value]) => `${label}: ${value.includes('\n') ? `\n${value}` : value}`),
    '',
    ...closing,
  ].join('\n');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head><body style="margin:0;padding:24px;background:#f3f5f9;font-family:Arial,Helvetica,sans-serif;color:#1d2433">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #dde3ee">
<tr><td style="background:${NAVY};padding:20px 24px;border-bottom:4px solid ${YELLOW}"><div style="color:${YELLOW};font-size:12px;letter-spacing:.12em;text-transform:uppercase;font-weight:bold">${SITE_NAME}</div><div style="color:#ffffff;font-size:20px;font-weight:bold;margin-top:4px">${escapeHtml(heading)}</div></td></tr>
${reviewHtml(review)}<tr><td style="padding:8px 24px 4px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;line-height:1.5">
${table.map(([label, value]) => `<tr><th scope="row" align="left" valign="top" style="padding:10px 12px 10px 0;border-bottom:1px solid #eef1f6;width:34%;color:#5a6478;font-weight:600">${escapeHtml(label)}</th><td valign="top" style="padding:10px 0;border-bottom:1px solid #eef1f6">${htmlValue(label, value)}</td></tr>`).join('\n')}
</table></td></tr>
<tr><td style="padding:16px 24px 22px;font-size:13px;color:#5a6478">${closing.map(escapeHtml).join('<br>')}</td></tr>
</table></body></html>`;
  return {
    from: { name: `${name} via ${SITE_NAME}`, address: config.from },
    to: config.to,
    replyTo: { name, address: asText(details.values.email) },
    subject,
    text,
    html,
  };
};

const replyLine = (details: EnquiryDetails): string => `Reply to this email to answer ${headerSafe(asText(details.values.name), 80)} directly.`;

export const buildEnquiryEmail = (details: EnquiryDetails, config: Pick<MailConfig, 'to' | 'from'>): MailMessage =>
  renderEmail({ heading: 'New website enquiry', subject: buildSubject(details), rows: enquiryRows(details), closing: [replyLine(details)] }, details, config);

export const buildFeedbackEmail = (details: EnquiryDetails, config: Pick<MailConfig, 'to' | 'from'>, review?: FeedbackReview): MailMessage =>
  renderEmail(
    {
      heading: 'New traveller feedback',
      subject: buildFeedbackSubject(details),
      rows: feedbackRows(details),
      review,
      closing: [
        replyLine(details),
        'Nothing is shown on the website unless you press “Approve & publish” and confirm. The email address and phone number are never published. Keep this email: its Reject button also removes the feedback later.',
      ],
    },
    details,
    config,
  );

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
