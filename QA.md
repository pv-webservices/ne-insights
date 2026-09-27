# Redesign verification — 28 September 2026

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
