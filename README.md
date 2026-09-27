# NC Insights

A static, multi-page Northeast India travel website. The supplied homepage image informed the layout and branding. The tabbed booking/search panel is deliberately omitted.

## Run locally

Requires Node.js 20+. No npm dependencies need to be installed.

```sh
npm run dev
```

Open `http://localhost:4321`. The server builds the site when it starts. After source edits, run `npm run build` and reload the browser. This server is for local preview only.

```sh
npm run build
npm run check
```

The output is ordinary HTML, CSS, vanilla JavaScript, SVG, WebP and WOFF2 files in `dist/`. There is no SPA, router, hydration, backend, database, authentication, PWA, service worker or production Node requirement. All primary page content is in the HTML.

## Content and design

- `src/data/site.mjs`: verified business settings, eight destinations, services, vehicle categories and FAQs.
- `src/data/packages.mjs`: 14 summer and 17 winter itineraries, based on the client Word documents, with season-specific EF codes.
- `src/package-pages.mjs`: collection pages, filters, hotel guidance and package detail templates.
- `src/pages.mjs`: static page templates.
- `src/components/ui.mjs`: shared header, footer, cards and hero/section building blocks.
- `src/data/images.mjs`: intrinsic sizes for every WebP (prevents layout shift) and which images ship a `-small` mobile variant.
- `src/styles/main.css`: responsive styles and design tokens.
- `public/site.js`: navigation, sticky header states, hero slideshow, scroll reveals, parallax, package carousel, counters, button colour-fill, touch feedback, package filters and enquiry preparation. All motion respects `prefers-reduced-motion`.
- `src/data/image-credits.json`: regional photo sources and licences; published at `/image-credits/`.
- `scripts/build.mjs`: build-time static HTML generation.

## Before a public launch

The supplied summer document provides the published phone numbers and enquiry email. Confirm these before launch, then supply the production domain (`site.url` or `SITE_URL`), office address and business hours in `src/data/site.mjs`. The single published phone number, +91 8473833199, is also the WhatsApp number (`site.whatsapp`, international digits only with no spaces or plus sign). It powers the call and WhatsApp buttons on service cards and pages, the header, the footer and the floating WhatsApp chat widget. Review route accuracy and business commitments, approve the legal copy, and set `legalApproved: true`. Do not invent testimonials; no customer reviews are published in this version.

```sh
npm run build:production
npm run check
```

The production build checks these settings. Preview builds intentionally use `noindex` and disallow crawling. Once configured, the production build creates absolute canonical/Open Graph URLs, an absolute sitemap, and crawlable robots rules. Do not deploy preview output as the public release.

Upload the **contents** of `dist/` to the hosting document root. The site uses root-relative URLs and expects a root-domain deployment. On Hostinger/Apache, the generated `.htaccess` configures `404.html`. Netlify and Cloudflare Pages serve the static output directly; verify the host's custom 404 handling. For GitHub Pages, use a custom domain or adapt root-relative paths for a repository subpath. No deployment has been performed.

## Enquiries

Forms use browser validation and a honeypot. The visitor reviews a locally generated summary, then downloads it or opens a configured email/WhatsApp app. Nothing is transmitted automatically and no form data is stored in localStorage. The feedback explicitly says it has **not** been sent. The visitor sends the message in their chosen app. With no configured contact, downloading is the only action available. This is intentional; there is no fake success confirmation. Fields stay disabled without JavaScript so personal details cannot accidentally be sent in a GET URL.

For long enquiries, downloading the summary is the dependable fallback if the device's email or WhatsApp URI limit is reached. If a hosting form endpoint is added later, update validation, privacy copy and response handling alongside it.

## Assets

Fonts and images are served locally. Regional photos are from Wikimedia Commons with attribution and licences in `/image-credits/`. The original NC Insights logo (`public/website-logo.jpeg`) is served as `images/logo.webp`. Eight illustrative images were AI-generated (Google Nano Banana 2, 1k) and converted to WebP: `hero-journey`, `wild-tiger`, `traveller` (each with a `-small` variant), `mizoram-hills`, `loktak`, `village-walk`, `homestay` and the four `fleet-*` vehicle category photos; the credits page says so. Original JPEG source assets are kept for reference but excluded from the output. There are no videos on the site.

Local preview requires no network connection after checkout. Font licence files are included in `public/fonts/`.

## Verification

See `QA.md` for browser checks, Lighthouse results and the remaining launch prerequisites.

## Seasonal itinerary content update

The Word documents in `public/` are kept as source material and are excluded from generated hosting files. See `CONTENT_UPDATES.md` for source reconciliation and verification. The four previous sample-package URLs redirect to their closest document-backed itineraries.
