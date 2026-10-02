# Collecting traveller feedback

Send travellers this link after their trip: **<https://neinsights.in/feedback/>**. It opens the "Share your experience" form directly (no pop-up), so it works well on WhatsApp and in email. The same form is also on the homepage (Share Your Experience button) and linked in every page footer. The page is kept out of search results (`noindex`), and approved testimonials appear on it, below the form.

Example message: *"Thank you for travelling with NE Insights! We'd love to hear how your trip went. It takes two minutes: https://neinsights.in/feedback/"*

# Approving or rejecting feedback (no code changes)

Every feedback email to `operations@neinsights.in` has two buttons at the top: **✓ Approve & publish** and **✕ Reject**.

- **Approve & publish** opens a review page showing the feedback. You can shorten the name shown on the website (e.g. "Rahul S."), then press **Approve & publish**. It appears on the homepage ("Traveller stories") and on `/feedback/` within about a minute. Nothing is redeployed.
- **Reject** opens the same page. Press **Reject** and the feedback is not shown. If it was already published, the button says **Remove from website** and takes it down.
- Opening a button's link only shows the page. Nothing changes until the button on that page is pressed. (Email security scanners open links automatically, so this matters.)
- **Keep feedback emails.** The Reject button keeps working for good, so a review can be removed later, for example if the traveller withdraws permission. Approve links expire after 180 days.
- The links are signed, so they can't be guessed or edited, but anyone holding the email can use them. Don't forward feedback emails outside the team.
- If the feedback contains an email address or phone number, the email says it can't be published as submitted and shows no Approve button.

With one approved testimonial the homepage shows a single card. With two or more it shows the carousel, newest first. With none, it shows the "Your journey could inspire the next one" invitation.

## How it works (for developers)

- `/api/feedback-review` (`netlify/functions/feedback-review.mts`) serves the review page. The link token carries the publishable testimonial only (name, rating, text, journey, city), compressed and HMAC-signed. The key is `FEEDBACK_REVIEW_SECRET` if set, otherwise derived from `SMTP_PASS`. Changing either secret invalidates the links in older emails.
- Approved testimonials are stored in **Netlify Blobs** (site-wide store `approved-testimonials`). Feedback is never stored before approval.
- `/api/testimonials` (`netlify/functions/testimonials.mts`) returns the approved list rendered with the site's own templates. The CDN caches it for 60 seconds. `public/site.js` swaps the homepage section and the `/feedback/` grid when the list differs from what the page was built with.
- No rebuild happens on approval. That's deliberate: on Netlify's credit-based free plan each production deploy costs credits, and running out pauses the site.
- Local preview (`npm run dev`) stores approvals in `output/testimonials-store.json`, and the email links point at the local server.
- `src/data/testimonials.mjs` can still hold testimonials added by hand. These are built into the page and merged with approved ones. Do not add Review or AggregateRating structured data; the SEO audit fails if any appears.

# Traveller stories and feedback form — 2 October 2026

- New homepage section **Traveller stories**, between "Why travel with NE Insights" and "Moments waiting for you". It shows approved testimonials from `src/data/testimonials.mjs` (none yet, so it shows the invitation) and a **Share Your Experience** button.
- The button opens a feedback form in an accessible dialog (shown inline without JavaScript). The fields are name, email, a 1–5 star rating, the traveller's experience, and optionally phone, city, journey/service and destinations. The form also has a separate, required permission to publish, as well as the privacy consent.
- Submissions use the existing `POST /api/enquiry` function and Zoho SMTP with `form_type=feedback`. They have their own validation rules (phone is not required), email layout and noindex thank-you page, `/feedback-thank-you/`. All the existing spam protections apply.
- The privacy policy now explains how feedback is handled and published.

> **Note (1 October 2026):** the Word documents named below now live in `source-files/documents/` with lowercase-hyphenated names (for example `public/itinrerary/MANIPUR.docx` → `source-files/documents/itineraries/manipur.docx`), and images moved to `public/images/<folder>/` (generated from `source-files/images/`). The enquiry form now delivers directly to `operations@neinsights.in`. Paths below are as they were at the time.

# Client revisions — 30 September 2026

- **Brand:** the site now uses **NE Insights** everywhere (titles, metadata, headings, forms, enquiry summaries and every prefilled WhatsApp greeting). "Why travel with NC Insights" is now "Why travel with NE Insights".
- **Sikkim removed:** destination page, menus, footer, enquiry-form checkbox, FAQ, homepage imagery and its photo credit. The site now covers seven states. `sikkim.webp/.jpg` were deleted.
- **Package codes:** `EF-xx` is now `NE-xx` (for example Summer NE-07). URLs changed from `/tour-packages/summer-ef-07/` to `/tour-packages/summer-ne-07/`; every former EF URL gets a static redirect page, and the four legacy sample-package redirects in `netlify.toml` point at the new URLs.
- **Fleet:** Premium SUV removed (`fleet-premium.webp` deleted). Tempo Traveller capacity is now **7–20 guests** on the fleet cards, car-rental page, FAQ and every package page.
- **TOAA:** the "Associate Member — Tour Operators Association of Assam" badge (`public/images/toaa.webp`) appears in the footer on every page, in the homepage "Why travel with NE Insights" section and on the About page.
- **New Signature collection** (`/tour-packages/signature/`) from the five documents in `public/itinrerary/`:

| Code | Package | Duration | Route | Source |
| --- | --- | --- | --- | --- |
| Signature NE-01 | Imphal & Loktak Lake Extension | 2N / 3D | Kohima → 2N Imphal | `MANIPUR.docx` |
| Signature NE-02 | Kaziranga, Sivasagar & Hajo Heritage Trail | 4N / 5D | 1N Kaziranga · 1N Sivasagar · 2N Guwahati | `4N 5D sivsagar and hajo.docx` |
| Signature NE-03 | Shillong Cherry Blossom Special | 5N / 6D | 4N Shillong · 1N Cherrapunjee | `Cherry blossom  shillong.docx` |
| Signature NE-04 | Meghalaya, Kaziranga, Nagaland & Manipur | 9N / 10D | 3N Shillong · 1N Kaziranga · 3N Kohima · 2N Imphal | `shillong kohima imphal 10d.docx` |
| Signature NE-05 | Arunachal, Mizoram & Tripura Grand Tour | 11N / 12D | Tezpur/Bhalukpong · Dirang · 2N Tawang · Bomdila · Guwahati · 2N Aizawl · 3N Agartala | `Arunachal,Mizoram,Tripura ITINERARY.docx` |

Notes on the new itineraries:

- The Sivasagar/Hajo document is headed "Greeting from Vedanshi Travels"; that branding was not carried over.
- NE-01 starts in Kohima and NE-04/NE-05 end outside Guwahati, so package pages now show separate start and end points.
- Nagaland, Manipur and Mizoram routes carry an entry-permit (Inner Line Permit) note; routes with internal flights say flights are not included unless quoted.
- Cherry blossom dates are set by the festival organisers each year, so the page asks travellers to plan around the confirmed schedule rather than stating fixed dates.
- The source folder is spelt `itinrerary`; it was left as supplied. The `.docx` files are excluded from the published site.

Build after these changes: **62 static HTML pages**, `npm run check` PASS.

# Domestic itinerary update — 28 September 2026

## Source documents

- `public/DOMESTIC SUMMER PACKAGE.docx`
- `public/Domestic Winter Package.docx`

Both originals remain unchanged. They are content sources, not build instructions, and are excluded from the generated hosting files.

## Published content

- 14 summer packages, EF-01 through EF-14.
- 17 winter packages, EF-01 through EF-17.
- 160 day-by-day itinerary entries, with overnight destinations and durations checked against the source day sequences.
- Separate `/tour-packages/summer/` and `/tour-packages/winter/` pages, a combined catalogue, and season/destination/style/duration filters.
- Season and EF code included in package URLs, titles, structured data and enquiry prefills.
- Homepage seasonal navigation and four featured document-backed packages.
- Related packages on destination pages; personalised-enquiry links for states without a supplied itinerary.
- Source vehicle guidance: commercial sedan for up to 3 guests, MUV for 4–6 and Tempo Traveller for 7–10. Models, luggage carriers and seating remain subject to confirmation.
- Budget, Standard, Deluxe, Luxury and Premium accommodation guidance. The listed star equivalents describe package categories rather than verified ratings for named hotels.
- Source contact numbers and the enquiry email (now `operations@neinsights.in`) added. Visitors can review an enquiry and open their email app to send it themselves. No WhatsApp number was inferred.

## Source discrepancies resolved

- **Winter EF-01:** summary table says Kaziranga; the complete itinerary describes Guwahati. The user explicitly selected the detailed **Guwahati, 2 nights / 3 days** itinerary.
- **Summer EF-13:** heading says 6 nights / 7 days, while the summary and eight actual daily entries support **7 nights / 8 days**. Published the latter, including 3 Shillong, 2 Cherrapunjee and 2 Guwahati nights.
- Some departure headings say Shillong after a Guwahati overnight. These now depart from the preceding actual overnight location.
- Winter EF-06 repeats safari text within the transfer day. The public route keeps the clearly described jeep-safari transfer day and the following morning's elephant-ride plan without duplicating the day.
- Spelling and punctuation were edited for readability; dense background descriptions were condensed while preserving route stops, planned activities and important optional/direct-payment distinctions.
- Summer and winter codes overlap; every public package reference includes its season.
- Documents contain NE Insights and historical Eastern Fiesta branding. The existing NC Insights website brand was retained; no business rename was inferred.

The winter document is labelled 2020–21. Historic COVID instructions, fixed safari slots, absolute connectivity claims, old permit-processing details and old border-excursion rates were not represented as current requirements or prices. Routes retain relevant planning cautions and ask for current confirmation. No new package prices, confirmed hotel inventory or guaranteed wildlife sightings were invented.

## Previous URLs

| Previous sample package | Updated route |
| --- | --- |
| `/tour-packages/meghalaya-explorer/` | `/tour-packages/summer-ef-07/` |
| `/tour-packages/assam-wildlife-culture/` | `/tour-packages/winter-ef-14/` |
| `/tour-packages/arunachal-scenic-circuit/` | `/tour-packages/summer-ef-12/` |
| `/tour-packages/complete-northeast-escape/` | `/tour-packages/winter-ef-17/` |

Old URLs contain static redirects, a normal fallback link, and the new canonical URL. They are excluded from the sitemap.

## Verification

- Build: **57 static HTML pages**, plus four legacy redirects.
- Static check: **3,551 local references** and **219 image elements**, unique metadata, valid JSON-LD, one primary H1, and the excluded booking/search panel remains absent.
- Source comparison: all **31 package day counts**, **160 days total**, and overnight totals reconcile with the daily itineraries.
- Browser: all package detail pages load; summer/winter totals, combined filters, URL-prefilled filters, reset, both source corrections and all four redirects passed.
- Enquiry: package reference carried into the form and the email handoff URL. The URL was inspected only; **no email was sent**.
- Layout: 32 page/viewport checks across 1440, 768, 390 and 360px, with no horizontal overflow or JavaScript errors.
- Visual review caught and corrected a text-encoding problem; final source and rendered text were checked again.

No production deployment was performed. Office address, opening hours, final domain and legal approval remain pending. Confirm the supplied contact details and current travel arrangements before launch.
