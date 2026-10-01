# Launch audit — 1 October 2026

Pre-launch QA, performance, enquiry email, technical SEO, accessibility and file organisation. Run everything with `npm test`. After deploying, run `npm run verify:live`.

## Findings on the live site before this work

- Every page was `noindex`, `robots.txt` said `Disallow: /`, and canonicals pointed to `ne-insights.netlify.app`, so the site could not appear in Google.
- The home page had no measurable Largest Contentful Paint (Lighthouse "NO_LCP", Performance score 0). The package carousel's scroll-snap made the browser scroll 4px on load, and Chrome stops recording LCP after any scroll.
- `/favicon.ico` and other icon sizes returned 404; `/index.html` returned 200 (duplicate of `/`).
- Forms did not send anything: the visitor had to download a summary or open WhatsApp/email themselves.

## Lighthouse (mobile, median of 3 runs, same local gzip server for both builds)

| Page | Build | Performance | Accessibility | Best practices | SEO | LCP | CLS | TBT | Page weight |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Home | before (live code) | 0 (NO_LCP) | 96 | 100 | 61 | not measurable | 0 | not measurable | 701 KiB |
| Home | after | **92** | **100** | 100 | **100** | **2.05 s** | 0 | 272 ms | **189 KiB** |
| /destinations/meghalaya/ | before | 97 | 96 | 100 | 69 | 2.26 s | 0 | 131 ms | 211 KiB |
| /destinations/meghalaya/ | after | 97 | **100** | 100 | **100** | **1.67 s** | 0 | 189 ms | **143 KiB** |

## Automated verification (`npm test`, exit 0)

- `npm run typecheck`: TypeScript, 0 errors (function, shared rules, tests).
- `npm run test:unit`: 22/22 pass. Covers sender and Reply-To headers (also rendered by nodemailer without sending), validation, consent, honeypot, 3-second timer, origin allow-list, header injection, rate limit, missing SMTP settings (500), SMTP failure and timeout (502), the no-JS 303 redirect and HTML error page.
- `npm run audit:seo`: PASS. 63 pages (59 indexable, 4 noindex), 11,501 internal links and asset references (212 unique, 0 broken), 1,035 images with alt and dimensions, 59 JSON-LD blocks, sitemap = the 59 indexable pages.
- `npm run test:e2e`: 162/162 pass. Includes 63 axe WCAG 2.1 AA scans (0 violations) plus 4 phone-width scans with the menu open and the form error state; every page loads with no console errors or failed requests; 404 status; redirects; favicons; layout at 320/375/768/1024/1440px (no horizontal scroll, targets ≥ 24px); skip link, focus visibility, mobile menu keyboard use; reduced motion; 19 form tests (intercepted endpoint, no-JS post, WhatsApp, offline, timeout, 4xx/5xx, draft kept and cleared).
- Not covered automatically: Firefox and Safari, real phones, and a real email delivery (needs the Netlify variables; see README).

The live site measured the same "before" figures (home NO_LCP; inner page 96–98, LCP 2.2–2.3 s). INP needs real visitor interactions; TBT is the lab proxy. Field data appears in Search Console once traffic builds. Local measurements are noisy on this machine (±100 ms TBT between runs).


Homepage rebuilt against `public/homepage UI.png`; all inner pages restyled with the same design system.

- `npm run build`: 57 pages. `npm run check`: PASS (4,829 local references, 884 images with alt and dimensions, one H1 per page, valid JSON-LD, booking panel still excluded).
- Playwright (local Chromium): 12 key pages × 1280/1024/768/390/360px with no horizontal overflow and no JavaScript errors; homepage full-page reviewed at 1440 and 390px.
- Interactions: mobile menu open/close (toggle, overlay, close button, Escape), dropdowns, hero slide dots and captions, package carousel buttons and progress, header scrolled state, FAQ disclosure, button colour-fill on all four variants, `/plan-my-trip/?interest=` prefill and email handoff link (not sent).
- Links: every internal link found across all pages (56 unique targets) returns HTTP 200; `/jungle-safari/#…` and `/car-rental/#…` anchors exist.
- Contact update: only +91 8473833199 is published (call and WhatsApp). Service cards, service/package panels, vehicle and safari rows have WhatsApp + Call buttons with topic-specific prefilled messages; the floating WhatsApp widget opens/closes (toggle, close button, Escape, outside click) at 1440 and 390px. Enquiry forms now hand off to WhatsApp. No message was sent during testing.
- Not done: no testimonials were added (none are verified), and Firefox/Safari and real devices were not tested.

# Verification — 27 September 2026

For the subsequent 28 September seasonal-package update, see `CONTENT_UPDATES.md`. Counts and contact-form status below describe the initial version.

## Passed

- `npm run build`: 28 static HTML pages (27 public pages and one custom 404).
- `npm run check`: 1,671 local links and asset references resolve; 102 image elements include alt text and dimensions; unique titles/descriptions; exactly one H1 per page; valid JSON-LD; enquiry forms disabled until JavaScript enhances them.
- The excluded tabbed booking/search panel is absent.
- Chromium: all 27 public pages checked at 1440px and 390px, giving 54 page/viewport checks, without horizontal overflow or JavaScript exceptions.
- Homepage checked at 1440, 1280, 1024, 768, 430, 390 and 360px. The final homepage, including its separate lower trip-summary form, passed all seven widths again.
- Mobile navigation, destination dropdown, Escape handling, FAQ disclosure, package style/destination filters, empty results and filter reset.
- Destination prefill, required-field validation, full enquiry summary, explicit unsent status and download link.
- Homepage trip-summary form and an actual downloaded text file, using synthetic details only.
- Main content and usable navigation available without JavaScript. Form fields disabled without JavaScript to prevent an accidental GET submission of personal details.
- Custom missing URL returns HTTP 404 with the branded page.
- All homepage images decoded successfully. Fonts and images load from local assets.

## Final local Lighthouse mobile report

`output/playwright/lighthouse-release-preview.json`

| Category | Score |
| --- | ---: |
| Performance | 92 |
| Accessibility | 100 |
| Best practices | 100 |
| SEO | 61 |

Largest Contentful Paint: 2.4 seconds. Cumulative Layout Shift: 0.

The SEO result reflects intentional preview `noindex`/robots restrictions. Preview canonical URLs use localhost; a verified production domain is required for publication. The production build emits crawlable pages and absolute URLs after configuration. These are local laboratory measurements, not deployed performance evidence.

The Lighthouse report completed and was saved. Its CLI subsequently exited with a Windows `EPERM` while cleaning up its own temporary Chrome profile; no workspace files were affected. This does not represent a clean CLI exit and is recorded separately from the report scores.

## Evidence

- `output/playwright/home-desktop.png`
- `output/playwright/home-mobile.png`
- `output/playwright/home-1440-viewport.png`
- `output/playwright/home-390-viewport.png`
- `output/playwright/enquiry-mobile.png`
- `output/playwright/qa-enquiry.txt`
- Browser verification snippets in `output/playwright/`.

## Remaining prerequisites and limits

- No production deployment, Git push or hosting mutation was performed.
- Add verified domain, phone, email or WhatsApp, office address and opening hours to `src/data/site.mjs`.
- Enquiries currently prepare a local download; nothing is delivered to the business. Email/WhatsApp handoff becomes available when configured.
- Replace the recreated logo with the original brand asset when supplied. Vehicle artwork illustrates categories, not an actual fleet. Hotel imagery is illustrative.
- No invented customer testimonials are displayed. Add genuine, permissioned reviews when available.
- Approve legal copy, confirm business claims and review itineraries before launch. `npm run build:production` correctly refuses to publish-ready-build while those settings are missing.
- Chrome/Chromium was verified. Edge, Firefox and Safari were not independently tested in this environment.
- Hosting redirects, actual email/WhatsApp delivery, real-device checks and production SEO still require configured business details and a deployment.
