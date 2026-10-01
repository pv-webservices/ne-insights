// POST /api/enquiry: delivers website enquiries to the NE Insights mailbox through Zoho SMTP.
// Settings come from Netlify environment variables (see .env.example and README.md).
import type { Config, Context } from '@netlify/functions';
import nodemailer from 'nodemailer';
import { createEnquiryHandler } from '../lib/enquiry/handler.mts';
import { createRateLimiter } from '../lib/enquiry/security.mts';

const RATE_LIMIT = { limit: 5, windowMs: 10 * 60 * 1000 };
const SMTP_TIMEOUTS = { connectionTimeout: 5000, greetingTimeout: 5000, socketTimeout: 8000 };

let handler: ReturnType<typeof createEnquiryHandler> | undefined;
const getHandler = () =>
  (handler ??= createEnquiryHandler({
    env: () => Netlify.env.toObject(),
    createTransport: (smtp) =>
      nodemailer.createTransport({ host: smtp.host, port: smtp.port, secure: smtp.secure, auth: { user: smtp.user, pass: smtp.pass }, ...SMTP_TIMEOUTS }),
    rateLimiter: createRateLimiter(RATE_LIMIT),
  }));

export default async (req: Request, context: Context): Promise<Response> => getHandler()(req, { ip: context.ip });

export const config: Config = {
  path: '/api/enquiry',
  // Platform limit (per IP) in front of the in-memory 5-per-10-minutes limit; 180 s is Netlify's maximum window.
  rateLimit: { windowLimit: 5, windowSize: 180, aggregateBy: ['ip', 'domain'] },
};
