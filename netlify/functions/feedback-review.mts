// /api/feedback-review: approve or reject traveller feedback from the buttons in the feedback email.
// Approved testimonials are saved in Netlify Blobs and appear on the website without a redeploy.
import type { Config, Context } from '@netlify/functions';
import { createRateLimiter } from '../lib/enquiry/security.mts';
import { createReviewHandler } from '../lib/testimonials/review.mts';
import { blobTestimonialStore } from '../lib/testimonials/store.mts';

let handler: ReturnType<typeof createReviewHandler> | undefined;
const getHandler = () =>
  (handler ??= createReviewHandler({
    env: () => Netlify.env.toObject(),
    store: blobTestimonialStore(),
    rateLimiter: createRateLimiter({ limit: 20, windowMs: 10 * 60 * 1000 }),
  }));

export default async (req: Request, context: Context): Promise<Response> => getHandler()(req, { ip: context.ip });

export const config: Config = {
  path: '/api/feedback-review',
  rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
