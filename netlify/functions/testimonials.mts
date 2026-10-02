// GET /api/testimonials: approved testimonials, rendered with the site's own templates. The homepage and
// /feedback/ load it after the page, so an approval shows up within about a minute (CDN-cached for 60 s).
import type { Config } from '@netlify/functions';
import { createTestimonialsHandler } from '../lib/testimonials/publish.mts';
import { blobTestimonialStore } from '../lib/testimonials/store.mts';

let handler: ReturnType<typeof createTestimonialsHandler> | undefined;

export default async (req: Request): Promise<Response> => (handler ??= createTestimonialsHandler({ store: blobTestimonialStore() }))(req);

export const config: Config = { path: '/api/testimonials', method: 'GET' };
