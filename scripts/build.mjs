import {mkdir,writeFile,readFile,cp} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {site,destinations,packages,faqs} from '../src/data/site.mjs';
import {packageAliases} from '../src/data/packages.mjs';
import {esc,header,footer,pageHero,breadcrumbs} from '../src/components/ui.mjs';
import * as pages from '../src/pages.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
// Production mode: `--production` flag, or NC_PRODUCTION=true (e.g. a Netlify environment variable).
const production = process.argv.includes('--production') || process.env.NC_PRODUCTION === 'true';
if(production){
  const missing=[];
  if(!/^https:\/\/[^/]+/.test(site.url))missing.push('HTTPS site.url or SITE_URL');
  if(!site.email&&!site.whatsapp)missing.push('a verified email or WhatsApp enquiry destination');
  if(!site.phone||!site.address||!site.hours)missing.push('phone, office address and business hours');
  if(!site.legalApproved)missing.push('business approval of privacy and travel terms (legalApproved)');
  if(missing.length)throw new Error(`Complete these launch settings in src/data/site.mjs: ${missing.join('; ')}`);
}
const base = (site.url || 'http://localhost:4321').replace(/\/$/,'');
const routes=[];
const add=(url,title,description,body,img='hero',schema=null)=>routes.push({url,title,description,body,img,schema});
add('/','Northeast India, Your Way','Explore Northeast India with NC Insights: custom tour packages, chauffeur-driven car rentals, handpicked stays and wildlife safari planning.',pages.home(),'hero-journey');
add('/destinations/','Explore Northeast India Destinations','Explore eight distinctive states: Assam, Meghalaya, Arunachal Pradesh, Sikkim, Nagaland, Manipur, Mizoram and Tripura.',pages.destinationDirectory(),'meghalaya');
for(const d of destinations)add(`/destinations/${d.slug}/`,`${d.name} Travel Guide & Custom Tours`,d.intro,pages.destinationPage(d),d.image,{'@type':'TouristDestination',name:d.name,description:d.intro});
add('/tour-packages/','Domestic Summer & Winter Tour Packages','Explore 14 summer and 17 winter Northeast India itineraries. Filter by season, destination, travel style and duration.',pages.packagesPage(),'meghalaya');
for(const season of ['Summer','Winter'])add(`/tour-packages/${season.toLowerCase()}/`,`Domestic ${season} Packages`,`${season==='Summer'?'14':'17'} domestic ${season.toLowerCase()} itineraries across Northeast India, with EF package codes, overnight stays and day-by-day routes.`,pages.packagesPage(season),season==='Summer'?'meghalaya':'rhino');
for(const p of packages)add(`/tour-packages/${p.slug}/`,`${p.name} | ${p.season} ${p.code}`,p.intro,pages.packagePage(p),p.image,{'@type':'TouristTrip',name:`${p.season} ${p.code}: ${p.name}`,description:p.intro,itinerary:{'@type':'ItemList',itemListElement:p.itinerary.map(([name],index)=>({'@type':'ListItem',position:index+1,name}))}});
add('/services/','Northeast Travel Services','Bring your Northeast journey together with car rentals, hotel enquiries, safari planning and personal tour itineraries.',pages.servicesPage(),'meghalaya');
add('/car-rental/','Northeast India Car Rental with Drivers','Plan airport transfers and multi-day journeys with commercial sedans for up to 3 guests, MUVs for 4–6 and Tempo Travellers for 7–10.',pages.carPage());
add('/hotel-booking/','Handpicked Hotels & Homestays','Plan a comfortable Northeast India stay with personalised enquiries for hotels, resorts, homestays and boutique retreats.',pages.hotelPage(),'homestay');
add('/jungle-safari/','Kaziranga, Manas & Pobitora Safari Planning','Discover Assam wildlife experiences with safari enquiries for Kaziranga, Manas and Pobitora. Thoughtful planning, with no guaranteed sightings.',pages.safariPage(),'rhino');
add('/about/','Your Local Northeast Travel Partner','Meet NC Insights and discover our approach to personal, thoughtfully paced journeys through Northeast India.',pages.aboutPage(),'bridge');
add('/contact/','Contact NC Insights','Get in touch about Northeast India travel, car rentals, accommodation, wildlife experiences and custom itineraries.',pages.contactPage(),'meghalaya');
add('/plan-my-trip/','Plan Your Northeast India Trip','Prepare a personal travel enquiry with your dates, destinations, group size and interests. Begin your custom Northeast India journey.',pages.planPage());
add('/faq/','Northeast India Travel Questions','Answers about planning Northeast India trips, custom routes, hotels, car rentals, safaris, airport transfers and permits.',pages.faqPage(),'hero',{'@type':'FAQPage',mainEntity:faqs.map(([q,a])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}}))});
add('/privacy-policy/','Privacy Policy','How the NC Insights static website processes your enquiry details, downloaded summaries and optional email or WhatsApp handoff.',pages.legalPage());
add('/terms/','Travel Terms & Conditions','Understand NC Insights enquiries, quotations, confirmation, travel conditions and supplier terms before planning your journey.',pages.legalPage(true));
const usedImages=routes.map(r=>r.body).join('')+pages.home();
const credits=JSON.parse(await readFile(path.join(root,'src/data/image-credits.json'),'utf8')).filter(c=>usedImages.includes(`/images/${c.key}.webp`));
const plain=s=>String(s).replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').trim();
add('/image-credits/','Photography & Image Credits','Credits and licence information for the regional photographs and illustrative imagery used on the NC Insights website.',`${pageHero('The places behind the pictures.','Regional photography and the people who made it possible.','hero','IMAGE CREDITS')}${breadcrumbs([['Image credits']])}<section class="section"><div class="container prose"><h2>Photography with a sense of place</h2><p>Wikimedia Commons photographs are used under the licences linked below. Images have been resized and converted to WebP, and are displayed with responsive crops. Adapted photographs remain subject to their original share-alike licence where applicable.</p><ul class="credits-list">${credits.map(c=>`<li><a href="${esc(c.source)}" target="_blank" rel="noopener noreferrer">${esc(c.file)}</a><small>Photography: ${esc(plain(c.artist))} · <a href="${esc(c.licenseUrl)}">${esc(c.license)}</a></small></li>`).join('')}</ul><h2>Brand and illustrative imagery</h2><p>The NC Insights logo is the original brand artwork supplied by the business.</p><p>Some scenes are AI-generated illustrative images created for this website: the winding hill-road hero, the tiger safari banner, the traveller viewpoint, the Mizoram ridgeline, Loktak Lake, the village walk, the hillside homestay and the vehicle category photos. They convey the character of the region and do not depict a specific confirmed property, vehicle, guide or wildlife sighting.</p></div></section>`);
add('/sitemap/','Website Sitemap','Find every destination guide, itinerary, service and information page on the NC Insights website.',`${pageHero('Find your way.','Every journey and every useful detail, all in one place.','hero','SITEMAP')}<section class="section"><div class="container"><ul class="sitemap-links">${routes.map(r=>`<li><a href="${r.url}">${esc(r.title)}</a></li>`).join('')}</ul></div></section>`);
add('/404.html','Page Not Found','The page you requested could not be found. Return to NC Insights and explore Northeast India.',pages.notFound());

await mkdir(path.join(root,'dist'),{recursive:true});
await mkdir(path.join(root,'output'),{recursive:true});
await cp(path.join(root,'public'),path.join(root,'dist'),{recursive:true,filter:source=>!(/\.(jpe?g|png|docx)$/i.test(source))});
await cp(path.join(root,'src/styles/main.css'),path.join(root,'dist/main.css'));
for(const route of routes){
 const canonical=base+route.url;
 const schemas=[{'@context':'https://schema.org','@type':'TravelAgency',name:site.name,description:site.description,...(base?{url:base}:{}),...(site.email?{email:site.email}:{}),...(site.phone?{telephone:site.phone}:{}),areaServed:destinations.map(d=>({'@type':'State',name:d.name}))}];
 if(route.schema)schemas.push({'@context':'https://schema.org',...route.schema});
 if(base&&route.url!=='/'&&route.url!=='/404.html')schemas.push({'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Home',item:base+'/'},{'@type':'ListItem',position:2,name:route.title,item:canonical}]});
 const body=route.body.replace(/(<form class="enquiry-form(?: [^"]*)?"[^>]*>)/g,'$1<fieldset disabled data-enable-form>').replace(/(<\/noscript>)<\/form>/g,'$1</fieldset></form>');
 const html=`<!doctype html><html lang="en-IN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#0b2a66"><script>document.documentElement.classList.add('js')</script><title>${esc(route.title)} | NC Insights</title><meta name="description" content="${esc(route.description)}"><meta name="robots" content="${production&&route.url!=='/404.html'?'index,follow':'noindex,follow'}"><link rel="canonical" href="${esc(canonical)}"><meta property="og:type" content="website"><meta property="og:locale" content="en_IN"><meta property="og:site_name" content="NC Insights"><meta property="og:title" content="${esc(route.title)}"><meta property="og:description" content="${esc(route.description)}"><meta property="og:url" content="${esc(canonical)}"><meta property="og:image" content="${esc(base)}/images/${route.img}.webp"><meta name="twitter:card" content="summary_large_image"><link rel="icon" type="image/svg+xml" href="/favicon.svg"><link rel="preload" href="/fonts/dm-sans.woff2" as="font" type="font/woff2" crossorigin><link rel="preload" href="/fonts/playfair.woff2" as="font" type="font/woff2" crossorigin>${route.url==='/'?'<link rel="preload" as="image" href="/images/hero-journey.webp" imagesrcset="/images/hero-journey-small.webp 760w, /images/hero-journey.webp 1376w" imagesizes="100vw" fetchpriority="high">':''}<link rel="stylesheet" href="/main.css"><script type="application/ld+json">${JSON.stringify(schemas).replace(/</g,'\\u003c')}</script><script src="/site.js" defer></script><noscript><style>@media(max-width:1023px){.nav-wrap{flex-wrap:wrap;height:auto;padding:10px 0}#navigation{position:static;transform:none;visibility:visible;width:100%;height:auto;flex-direction:row;flex-wrap:wrap;gap:6px 14px;padding:8px 0;background:none;box-shadow:none;order:5}#navigation>a,.nav-dropdown>a{padding:4px 0;font-size:13px;border:0}.menu-toggle,.dropdown-toggle,.nav-panel-head,.nav-panel-foot{display:none!important}}.filters{display:none}</style></noscript></head><body class="${route.url==='/'?'page-home':'page-inner'}">${header(route.url)}<main id="main">${body}</main>${footer()}</body></html>`;
 const target=path.join(root,'dist',route.url==='/404.html'?'404.html':route.url,'index.html');
 const file=route.url==='/404.html'?path.join(root,'dist/404.html'):target;
 await mkdir(path.dirname(file),{recursive:true});
 await writeFile(file,html);
}
const publicRoutes=routes.filter(r=>r.url!=='/404.html');
// Keep the previous four package URLs useful without retaining the replaced sample itineraries.
for(const [oldSlug,newSlug] of Object.entries(packageAliases)){
 const folder=path.join(root,'dist/tour-packages',oldSlug);
 await mkdir(folder,{recursive:true});
 const target=`/tour-packages/${newSlug}/`;
 await writeFile(path.join(folder,'index.html'),`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Updated tour package | NC Insights</title><meta name="robots" content="noindex,follow"><link rel="canonical" href="${esc(base+target)}"><meta http-equiv="refresh" content="0;url=${target}"></head><body><h1>This itinerary has been updated.</h1><p><a href="${target}">View the seasonal package</a></p></body></html>`);
}
await writeFile(path.join(root,'dist/sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${publicRoutes.map(r=>`<url><loc>${esc(base+r.url)}</loc></url>`).join('')}</urlset>`);
await writeFile(path.join(root,'dist/robots.txt'),`User-agent: *\n${production?'Allow: /':'Disallow: /'}\n${base?`Sitemap: ${base}/sitemap.xml\n`:''}`);
await writeFile(path.join(root,'dist/_headers'),'/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: SAMEORIGIN\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n');
await writeFile(path.join(root,'dist/.htaccess'),'Options -Indexes\nErrorDocument 404 /404.html\n<IfModule mod_headers.c>\nHeader set X-Content-Type-Options "nosniff"\nHeader set Referrer-Policy "strict-origin-when-cross-origin"\nHeader set X-Frame-Options "SAMEORIGIN"\n</IfModule>\n');
await writeFile(path.join(root,'output/routes.json'),JSON.stringify(routes.map(({url,title})=>({url,title})),null,2));
console.log(`Built ${routes.length} static HTML pages in dist/. ${production?'Production build.':'Preview build: noindex. Add verified business settings for production.'}`);
