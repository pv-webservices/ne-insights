// Approved traveller testimonials, shown on the homepage under "Traveller stories".
//
// ONLY add an entry when:
//   1. the feedback arrived through the website form (or in writing) from a real traveller,
//   2. NE Insights has approved it for publication, and
//   3. the traveller gave permission to publish (the feedback email says "Permission to publish: Yes").
// Website submissions are emailed to the team and NEVER written to this file automatically.
// Step-by-step instructions: docs/CONTENT_UPDATES.md → "Publishing an approved testimonial".
//
// Schema (the build fails if an entry is incomplete or contains any other field):
//   id        required  unique, lowercase-hyphenated, e.g. 'meghalaya-2026-10-priya'
//   name      required  display name the traveller agreed to, e.g. 'Priya S.'
//   rating    required  whole number 1–5, exactly as submitted
//   text      required  the traveller's own words (fix obvious typos only; shorten only with their agreement)
//   journey   optional  e.g. 'Meghalaya journey', 'Kaziranga safari', 'Car rental'
//   location  optional  the city they shared, e.g. 'Delhi'
//   date      optional  month and year of the trip, e.g. 'October 2026'
//   featured  optional  true shows it first
//
// Never add an email address, phone number or anything else private: this file is published.
// Never invent, combine or "improve" reviews. While the list is empty the homepage shows an invitation instead.

/** @type {import('../components/testimonials.mjs').Testimonial[]} */
export const testimonials = [];
