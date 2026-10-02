// Testimonials kept in the code (optional). Normally this list stays EMPTY.
//
// Testimonials are published from the feedback email: "Approve & publish" saves them in Netlify Blobs and
// they appear on the homepage and /feedback/ within about a minute, with no code change or redeploy.
// "Reject" in the same email removes them again. See docs/CONTENT_UPDATES.md.
//
// Use this file only for a review received another way (e.g. in writing) that the traveller has agreed
// may be published. Schema (the build fails if an entry is incomplete or contains any other field):
//   id        required  unique, lowercase-hyphenated, e.g. 'meghalaya-2026-10-priya'
//   name      required  display name the traveller agreed to, e.g. 'Priya S.'
//   rating    required  whole number 1–5
//   text      required  the traveller's own words (fix obvious typos only)
//   journey   optional  e.g. 'Meghalaya journey', 'Kaziranga safari'
//   location  optional  their city, e.g. 'Delhi'
//   date      optional  month and year of the trip, e.g. 'October 2026'
//   featured  optional  true shows it first
//
// Never add an email address, phone number or anything else private: this file is published.
// Never invent, combine or "improve" reviews.

/** @type {import('../components/testimonials.mjs').Testimonial[]} */
export const testimonials = [];
