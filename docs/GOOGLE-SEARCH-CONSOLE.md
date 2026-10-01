# Google Search Console guide – neinsights.in

Use this after the new version is deployed to Netlify. Each step says where to click.

## 1. Pre-launch checklist (on the live domain)

Run `npm run audit:seo && npm run verify:live` from the project folder. Every line should say PASS. To check by hand:

| Check | How | Expected |
| --- | --- | --- |
| HTTPS | Open <http://neinsights.in> | Ends on `https://neinsights.in/` with a padlock |
| www redirect | Open <https://www.neinsights.in> | Ends on `https://neinsights.in/` |
| Trailing slash | Open <https://neinsights.in/about> | Ends on `/about/` |
| Indexable | View source of the homepage | `<meta name="robots" content="index, follow, max-image-preview:large">` and `<link rel="canonical" href="https://neinsights.in/">` |
| robots.txt | <https://neinsights.in/robots.txt> | `Allow: /` and `Sitemap: https://neinsights.in/sitemap-index.xml`, no `Disallow` |
| Sitemap | <https://neinsights.in/sitemap-index.xml> | Lists `sitemap-pages.xml`, which lists 59 pages |
| 404 | <https://neinsights.in/no-such-page/> | Branded "A little off the beaten path" page. `verify:live` confirms the real 404 status |
| Favicon | <https://neinsights.in/favicon.ico> | Yellow "NE" icon |
| Form | Send **one** test enquiry from <https://neinsights.in/contact/> | Thank-you page; email arrives in the Zoho inbox (not spam); Reply goes to the visitor |

> Before the new deploy, the live site was **blocked from Google**: every page had `noindex`, `robots.txt` said `Disallow: /`, and canonical tags pointed to `ne-insights.netlify.app`. Do not submit anything until the checks above pass.

## 2. Add a Domain property (DNS verification at GoDaddy)

The domain's DNS is hosted at **GoDaddy** (name servers `ns65.domaincontrol.com` and `ns66.domaincontrol.com`).

1. Go to <https://search.google.com/search-console> and sign in with the Google account that should own the property (ideally a business account, not a personal one).
2. **Add property → Domain** (left box). Enter `neinsights.in` (no `https://`, no `www`). Click **Continue**.
3. Google shows a TXT record like `google-site-verification=abc123…`. Click **Copy**.
4. In another tab, sign in to GoDaddy → **My Products → Domains → neinsights.in → DNS** (or **Manage DNS**).
5. **Add New Record**:
   - Type: **TXT**
   - Name / Host: **@**
   - Value: paste the `google-site-verification=…` text
   - TTL: default (1 hour)
6. **Save**. Leave the existing TXT records alone: the SPF record (`v=spf1 include:…`) and `zoho-verification`. You can have several TXT records.
7. Back in Search Console, click **Verify**. If it fails, wait 15–60 minutes and try again; DNS can take time to update. Keep the TXT record permanently: removing it un-verifies the property.

A Domain property covers `https://`, `http://`, `www` and every page in one place.

## 3. Submit the sitemap

1. In the property, open **Indexing → Sitemaps** (left menu).
2. Under "Add a new sitemap", type `sitemap-index.xml` (the box already shows `https://neinsights.in/`). Click **Submit**.
3. This single sitemap index covers **every indexable page** through `sitemap-pages.xml`. You do not need to submit pages one by one or add other sitemaps.
4. Status **"Couldn't fetch"** or **"Pending"** for up to 24 hours is normal for a new property. Check again the next day. It should then show "Success" with **59 discovered pages**.
5. If you open the sitemap in a browser and see "This XML file does not appear to have any style information associated with it", that is normal. Sitemaps are meant for search engines, not people.

## 4. The indexable pages (59 URLs)

**Main pages (11)**
- https://neinsights.in/
- https://neinsights.in/destinations/
- https://neinsights.in/tour-packages/
- https://neinsights.in/services/
- https://neinsights.in/car-rental/
- https://neinsights.in/hotel-booking/
- https://neinsights.in/jungle-safari/
- https://neinsights.in/about/
- https://neinsights.in/contact/
- https://neinsights.in/plan-my-trip/
- https://neinsights.in/faq/

**Destination guides (7)**
- https://neinsights.in/destinations/assam/
- https://neinsights.in/destinations/meghalaya/
- https://neinsights.in/destinations/arunachal-pradesh/
- https://neinsights.in/destinations/nagaland/
- https://neinsights.in/destinations/manipur/
- https://neinsights.in/destinations/mizoram/
- https://neinsights.in/destinations/tripura/

**Package collections (3)**
- https://neinsights.in/tour-packages/summer/
- https://neinsights.in/tour-packages/winter/
- https://neinsights.in/tour-packages/signature/

**Summer packages (14):** https://neinsights.in/tour-packages/summer-ne-01/ to https://neinsights.in/tour-packages/summer-ne-14/

**Winter packages (17):** https://neinsights.in/tour-packages/winter-ne-01/ to https://neinsights.in/tour-packages/winter-ne-17/

**Signature tours (5):** https://neinsights.in/tour-packages/signature-ne-01/ to https://neinsights.in/tour-packages/signature-ne-05/

**Legal (2)**
- https://neinsights.in/privacy-policy/
- https://neinsights.in/terms/

Total: 11 main + 7 destinations + 3 collections + 14 summer + 17 winter + 5 signature + 2 legal = **59**.

## 5. Request indexing for priority pages (about 10 per day)

Google limits manual requests. For each URL: paste it into the **search bar at the top of Search Console** (URL Inspection) → wait for the result → **Request indexing**. Ignore "URL is not on Google" before you request; that is expected for a new site.

- **Day 1:** home, /destinations/, /tour-packages/, /services/, /about/, /contact/, /plan-my-trip/, /car-rental/, /jungle-safari/, /hotel-booking/
- **Day 2:** all 7 destination guides, /tour-packages/summer/, /tour-packages/winter/, /tour-packages/signature/
- **Day 3:** /faq/, the 5 signature tours, summer-ne-07, summer-ne-12, winter-ne-09, winter-ne-14
- **After that:** you can stop. The sitemap makes Google discover the remaining package pages on its own, usually within 1–4 weeks.

Requesting indexing of the **homepage** also makes Google pick up the new favicon sooner. Google can still take **days to a few weeks** to show the new icon in search results.

## 6. Pages that must NOT be submitted

| URL | Why |
| --- | --- |
| /thank-you/ | Only reached after sending a form; `noindex`, excluded from the sitemap |
| 404 page (any missing URL) | Error page; `noindex` and a real 404 status |
| /image-credits/ | Licence list, no search value; `noindex, follow` |
| /sitemap/ | HTML list of links for visitors; `noindex, follow` (the XML sitemap is what Google uses) |
| /api/enquiry | Form endpoint, not a page |
| Any `ne-insights.netlify.app` or `deploy-preview-…` address | Duplicates of the real site; previews are `noindex` |

These pages are still crawlable on purpose (robots.txt does not block them), so Google can see the `noindex` instruction.

## 7. Weeks 1–4 follow-up

**Week 1**
- **Indexing → Pages**: watch "Indexed" grow. "Discovered – currently not indexed" and "Crawled – currently not indexed" are normal for a new site in the first weeks.
- "Excluded by 'noindex' tag" should list only /thank-you/, /image-credits/ and /sitemap/. Anything else listed there is a problem.
- **Sitemaps**: status "Success", 59 discovered.

**Week 2**
- **Enhancements** (left menu, appears once Google has processed pages): **Breadcrumbs** (all inner pages), **FAQ** (only /faq/; Google currently shows FAQ rich results only for some well-known government and health sites, but the markup is still read). Open any item with errors and use **Validate fix** after a correction.
- Organisation details are checked under **URL Inspection → Enhancements** for the homepage. You can also paste the homepage URL into <https://search.google.com/test/rich-results>.
- **Experience → Core Web Vitals / HTTPS**: needs real visitor traffic, so this may say "Not enough data" for weeks. Use <https://pagespeed.web.dev/> for lab scores on the homepage and one package page meanwhile.

**Week 3**
- **Google Business Profile** (<https://business.google.com>): create or claim "NE Insights Tours and Travels", category "Tour operator" or "Travel agency". Use exactly the same name, phone (+91 8473833199) and website (https://neinsights.in/) as the site. Add the office address only if the business receives visitors there (otherwise set a service area: the seven northeastern states). Verification is by postcard, phone or video. Once the address is confirmed, also add it to `src/data/site.mjs` so it appears in the site's structured data.

**Week 4**
- **Bing Webmaster Tools** (<https://www.bing.com/webmasters>): **Import from Google Search Console** (fastest; copies the verified site and sitemap) or add the site and submit `https://neinsights.in/sitemap-index.xml`. Bing also feeds DuckDuckGo, Yahoo and ChatGPT search.
- **Performance** report in Search Console: see which searches show the site. Use the queries to decide which destinations or packages deserve more content.
- Re-run `npm run verify:live` after every significant deploy.
