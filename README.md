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

### Deploying on Netlify (GitHub)

There are **no npm dependencies** — the build uses only Node.js built-ins, so Netlify's install step has nothing to fetch. Everything Netlify needs is in the repo:

- `netlify.toml`: build command `npm run build && npm run check`, publish directory `dist`, Node 22, 301 redirects for the four legacy package URLs, and cache headers for images and fonts.
- `.nvmrc`: Node 22 for local work.
- The build writes `dist/_headers` (security headers). Netlify serves `dist/404.html` for missing pages automatically.

Steps:

1. Push this folder to a GitHub repository (`dist/` and `output/` are git-ignored; Netlify builds them).
2. In Netlify: **Add new site → Import an existing project → GitHub**, pick the repo. The build settings are read from `netlify.toml`; leave the fields as detected.
3. Deploy. Page canonical/Open Graph URLs and the sitemap automatically use Netlify's site URL (`URL`, or `DEPLOY_PRIME_URL` on deploy previews). Set a `SITE_URL` environment variable once a custom domain is connected.

**Search indexing is off by default.** Until the launch settings are complete, every page ships with `noindex` and `robots.txt` disallows crawling. To go live for search engines, fill in `address`, `hours` and `legalApproved: true` in `src/data/site.mjs`, then add the environment variable `NC_PRODUCTION=true` in Netlify and redeploy. If anything is still missing, the Netlify build fails with a message listing it and the previous deploy stays live.

The source Word documents, the reference screenshot and original JPEGs in `public/` are committed with the repo but excluded from the published site. If the GitHub repository is public, those files are visible there; use a private repository if that matters.

Other hosts: upload the **contents** of `dist/` to the document root. On Hostinger/Apache the generated `.htaccess` configures `404.html`.

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
