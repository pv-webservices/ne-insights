import {mkdir,writeFile,readFile,cp,rm,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {site,destinations,packages,faqs} from '../src/data/site.mjs';
import {packageAliases,collections} from '../src/data/packages.mjs';
import {esc,header,footer,pageHero,breadcrumbs,ogImage} from '../src/components/ui.mjs';
import {formRulesScript} from '../src/components/forms.mjs';
import {pageGraph,jsonLd,orgId} from '../src/seo/schema.mjs';
import {BRAND_NAVY,BRAND_YELLOW} from '../src/data/brand.mjs';
import * as pages from '../src/pages.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
// Production (indexable) on Netlify's production context, with --production, or NC_PRODUCTION=true.
// Deploy previews, branch deploys and plain local builds are noindex.
const production=process.argv.includes('--production')||process.env.NC_PRODUCTION==='true'||process.env.CONTEXT==='production';
const base=site.url;
const TITLE_SUFFIX=' | NE Insights';
const MAX_TITLE=65;

if(production){
  const missing=[];
  if(!/^https:\/\/[^/]+$/.test(base))missing.push('an HTTPS site.url or SITE_URL');
  if(!site.email||!site.phone)missing.push('the enquiry email and phone number');
  if(missing.length)throw new Error(`Complete these launch settings in src/data/site.mjs: ${missing.join('; ')}`);
  const pending=[!site.address&&'office address',!site.hours&&'business hours',!site.legalApproved&&'legal approval (legalApproved)',!site.founder&&'founder details'].filter(Boolean);
  if(pending.length)process.stdout.write(`Note: still to be confirmed by the client: ${pending.join(', ')}.\n`);
}

/** Last commit date of the given source files; the build time if they have uncommitted changes. */
const BUILD_TIME=new Date().toISOString();
const lastmodCache=new Map();
const lastModified=files=>{
  const key=files.join('|');
  if(!lastmodCache.has(key)){
    let value=BUILD_TIME;
    try{
      const dirty=execFileSync('git',['status','--porcelain','--',...files],{cwd:root,encoding:'utf8'}).trim();
      const committed=execFileSync('git',['log','-1','--format=%cI','--',...files],{cwd:root,encoding:'utf8'}).trim();
      if(!dirty&&committed)value=new Date(committed).toISOString();
    }catch{/* git unavailable: fall back to the build time */}
    lastmodCache.set(key,value);
  }
  return lastmodCache.get(key);
};
const SHARED=['src/components/ui.mjs','src/data/site.mjs'];
const SRC={
  pages:[...SHARED,'src/pages.mjs'],
  home:[...SHARED,'src/pages.mjs','src/data/company.mjs','src/components/forms.mjs','src/components/testimonials.mjs','src/data/testimonials.mjs'],
  about:[...SHARED,'src/pages.mjs','src/data/company.mjs'],
  forms:[...SHARED,'src/pages.mjs','src/components/forms.mjs'],
  packages:[...SHARED,'src/package-pages.mjs','src/data/packages.mjs']
};

const routes=[];
/**
 * @param {string} url
 * @param {{title:string,description:string,body:string,img?:string,imageAlt?:string,schema?:object[],pageType?:string,index?:boolean,sources?:string[],form?:boolean}} page
 */
const add=(url,page)=>routes.push({img:'hero',index:true,sources:SRC.pages,schema:[],...page,url});

add('/',{title:'Northeast India Tour Packages, Car Rental & Stays',description:'Explore Northeast India with NE Insights: custom tour packages, chauffeur-driven car rentals, handpicked stays and wildlife safari planning.',body:pages.home(),img:'hero-journey',imageAlt:'A winding mountain road through misty green hills of Northeast India',sources:SRC.home,form:true});
add('/destinations/',{title:'Explore Northeast India Destinations',description:'Explore seven distinctive states: Assam, Meghalaya, Arunachal Pradesh, Nagaland, Manipur, Mizoram and Tripura.',body:pages.destinationDirectory(),img:'meghalaya',pageType:'CollectionPage'});
for(const d of destinations)add(`/destinations/${d.slug}/`,{title:`${d.name} Travel Guide & Custom Tours`,description:d.intro,body:pages.destinationPage(d),img:d.image,imageAlt:`${d.name}, Northeast India`,schema:[{'@type':'TouristDestination',name:d.name,description:d.intro,touristType:['Nature','Culture'],containedInPlace:{'@type':'Country',name:'India'}}]});
const count=c=>packages.filter(p=>p.season===c).length;
add('/tour-packages/',{title:'Summer, Winter & Signature Tour Packages',description:`Explore ${count('Summer')} summer, ${count('Winter')} winter and ${count('Signature')} signature Northeast India itineraries. Filter by collection, destination, travel style and duration.`,body:pages.packagesPage(),img:'meghalaya',pageType:'CollectionPage',sources:SRC.packages});
for(const season of collections)add(`/tour-packages/${season.toLowerCase()}/`,{title:season==='Signature'?'Signature Northeast India Tours':`Domestic ${season} Tour Packages`,description:`${count(season)} ${season==='Signature'?'signature':`domestic ${season.toLowerCase()}`} itineraries across Northeast India, with NE package codes, overnight stays and day-by-day routes.`,body:pages.packagesPage(season),img:{Summer:'meghalaya',Winter:'rhino',Signature:'nagaland'}[season],pageType:'CollectionPage',sources:SRC.packages});
/** Package titles carry the code; long names drop the season word so the title stays within 65 characters. */
const packageTitle=p=>[`${p.name} | ${p.season} ${p.code}`,`${p.name} | ${p.code}`,p.name].find(t=>t.length+TITLE_SUFFIX.length<=MAX_TITLE)||p.name;
/** Very short intros get the trip length appended so every description has enough context (70+ characters). */
const packageDescription=p=>p.intro.length>=70?p.intro:`${p.intro} A ${p.nights}-night ${p.season.toLowerCase()} itinerary.`;
for(const p of packages)add(`/tour-packages/${p.slug}/`,{title:packageTitle(p),description:packageDescription(p),body:pages.packagePage(p),img:p.image,imageAlt:p.name,sources:SRC.packages,schema:[{'@type':'TouristTrip',name:`${p.season} ${p.code}: ${p.name}`,description:p.intro,provider:{'@id':orgId(base)},itinerary:{'@type':'ItemList',itemListElement:p.itinerary.map(([name],index)=>({'@type':'ListItem',position:index+1,name}))}}]});
add('/services/',{title:'Northeast Travel Services',description:'Bring your Northeast journey together with car rentals, hotel enquiries, safari planning, eco-tourism, cultural expeditions and custom itineraries.',body:pages.servicesPage(),img:'hero-journey',sources:SRC.about});
add('/car-rental/',{title:'Northeast India Car Rental with Drivers',description:'Plan airport transfers and multi-day journeys with commercial sedans for up to 3 guests, MUVs for 4–6 and Tempo Travellers for 7–20.',body:pages.carPage(),img:'hero-journey'});
add('/hotel-booking/',{title:'Handpicked Hotels & Homestays',description:'Plan a comfortable Northeast India stay with personalised enquiries for hotels, resorts, homestays and boutique retreats.',body:pages.hotelPage(),img:'homestay'});
add('/jungle-safari/',{title:'Kaziranga, Manas & Pobitora Safari Planning',description:'Discover Assam wildlife experiences with safari enquiries for Kaziranga, Manas and Pobitora. Thoughtful planning, with no guaranteed sightings.',body:pages.safariPage(),img:'rhino'});
add('/about/',{title:'About Us: Local Northeast India Travel Experts',description:'Meet NE Insights Tours and Travels: local experts crafting immersive, tailor-made and responsible journeys through Northeast India.',body:pages.aboutPage(),img:'village-walk',pageType:'AboutPage',sources:SRC.about});
add('/contact/',{title:'Contact Us: Call, WhatsApp or Email',description:'Get in touch about Northeast India travel, car rentals, accommodation, wildlife experiences and custom itineraries. Call, WhatsApp or email us.',body:pages.contactPage(),img:'traveller',pageType:'ContactPage',sources:SRC.forms,form:true});
add('/plan-my-trip/',{title:'Plan Your Northeast India Trip',description:'Send a personal travel enquiry with your dates, destinations, group size and interests. Begin your custom Northeast India journey.',body:pages.planPage(),img:'traveller',sources:SRC.forms,form:true});
add('/faq/',{title:'Northeast India Travel Questions',description:'Answers about planning Northeast India trips, custom routes, hotels, car rentals, safaris, airport transfers and permits.',body:pages.faqPage(),pageType:'FAQPage',faq:true});
add('/privacy-policy/',{title:'Privacy Policy',description:'How NE Insights handles the details you send through our enquiry forms: secure delivery to our mailbox, spam protection, retention and your choices.',body:pages.legalPage()});
add('/terms/',{title:'Travel Terms & Conditions',description:'Understand NE Insights enquiries, quotations, confirmation, travel conditions and supplier terms before planning your journey.',body:pages.legalPage(true)});

const usedImages=routes.map(r=>r.body).join('');
const credits=JSON.parse(await readFile(path.join(root,'src/data/image-credits.json'),'utf8')).filter(c=>usedImages.includes(`/${c.key}-`));
const plain=s=>String(s).replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').trim();
// Utility pages: crawlable links, but kept out of search results and the sitemap.
add('/image-credits/',{index:false,title:'Photography & Image Credits',description:'Credits and licence information for the regional photographs and illustrative imagery used on the NE Insights website.',body:`${pageHero('The places behind the pictures.','Regional photography and the people who made it possible.','hero','IMAGE CREDITS')}${breadcrumbs([['Image credits']])}<section class="section"><div class="container prose"><h2>Photography with a sense of place</h2><p>Wikimedia Commons photographs are used under the licences linked below. Images have been resized and converted to AVIF and WebP, and are displayed with responsive crops. Adapted photographs remain subject to their original share-alike licence where applicable.</p><ul class="credits-list">${credits.map(c=>`<li><a href="${esc(c.source)}" target="_blank" rel="noopener noreferrer">${esc(c.file)}</a><small>Photography: ${esc(plain(c.artist))} · <a href="${esc(c.licenseUrl)}">${esc(c.license)}</a></small></li>`).join('')}</ul><h2>Brand and illustrative imagery</h2><p>The NE Insights logo is the original brand artwork supplied by the business. The Tour Operators Association of Assam (TOAA) logo is displayed to show NE Insights’ associate membership of the association.</p><p>Some scenes are AI-generated illustrative images created for this website: the winding hill-road hero, the tiger safari banner, the traveller viewpoint, the Mizoram ridgeline, Loktak Lake, the village walk, the hillside homestay and the vehicle category photos. They convey the character of the region and do not depict a specific confirmed property, vehicle, guide or wildlife sighting.</p></div></section>`});
add('/sitemap/',{index:false,title:'Website Sitemap',description:'Find every destination guide, itinerary, service and information page on the NE Insights website, all in one place.',body:`${pageHero('Find your way.','Every journey and every useful detail, all in one place.','hero','SITEMAP')}${breadcrumbs([['Sitemap']])}<section class="section"><div class="container"><h2 class="sr-only">All pages</h2><ul class="sitemap-links">${routes.filter(r=>r.index).map(r=>`<li><a href="${r.url}">${esc(r.title)}</a></li>`).join('')}</ul></div></section>`});
add('/thank-you/',{index:false,title:'Thank You for Your Enquiry',description:'Thank you for contacting NE Insights. Your Northeast India travel enquiry has been sent and our team will reply by email or phone.',body:pages.thankYouPage(),img:'traveller'});
// Shareable link for collecting traveller feedback. Noindex: a form page has little search value on its own.
add('/feedback/',{index:false,title:'Share Your Travel Experience',description:'Travelled with NE Insights? Share your Northeast India travel experience. Our team reviews every submission before anything is featured on the website.',body:pages.feedbackPage(),img:'village-walk',imageAlt:'Travellers walking with a local guide through a Meghalaya village',sources:[...SRC.forms,'src/components/testimonials.mjs','src/data/testimonials.mjs'],form:true});
add('/feedback-thank-you/',{index:false,title:'Thank You for Your Feedback',description:'Thank you for sharing your NE Insights travel experience. Our team reviews every submission before anything is featured on the website.',body:pages.feedbackThankYouPage(),img:'traveller'});
add('/404.html',{index:false,title:'Page Not Found',description:'The page you requested could not be found. Return to NE Insights and explore Northeast India destinations, tours and services.',body:pages.notFound()});

/** Visible breadcrumb trail → [name, absolute URL] pairs (used for BreadcrumbList). */
const crumbsFromBody=(route)=>{
  const nav=route.body.match(/<nav class="breadcrumbs"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
  if(!nav)return route.url==='/'?[['Home',`${base}/`]]:[];
  const items=[...nav.matchAll(/<a href="([^"]+)">([^<]+)<\/a>|<span aria-current="page">([^<]+)<\/span>/g)];
  return items.map(m=>m[1]?[plain(m[2]),base+m[1]]:[plain(m[3]),base+route.url]);
};

const fullTitle=route=>route.title.length+TITLE_SUFFIX.length<=MAX_TITLE?route.title+TITLE_SUFFIX:route.title;

// ---- Static assets: content-hashed CSS/JS so they can be cached for a year ----
await mkdir(dist,{recursive:true});
for(const entry of await readdir(dist))await rm(path.join(dist,entry),{recursive:true,force:true});
await mkdir(path.join(root,'output'),{recursive:true});
await cp(path.join(root,'public'),dist,{recursive:true,filter:source=>path.basename(source)!=='site.js'});
const hashed=async(source,name,ext)=>{
  // Normalise line endings so Windows (CRLF checkout) and Netlify (LF) builds get the same hash.
  const content=(await readFile(path.join(root,source),'utf8')).replace(/\r\n/g,'\n');
  const hash=createHash('sha256').update(content).digest('hex').slice(0,10);
  const file=`/assets/${name}.${hash}.${ext}`;
  await mkdir(path.join(dist,'assets'),{recursive:true});
  await writeFile(path.join(dist,file),content);
  return file;
};
const assets={css:await hashed('src/styles/main.css','main','css'),js:await hashed('public/site.js','site','js')};

const HOME_LCP=`<link rel="preload" as="image" type="image/avif" imagesrcset="${['400','800','1200','1376'].map(w=>`/images/illustrations/hero-journey-${w}.avif ${w}w`).join(', ')}" imagesizes="100vw" fetchpriority="high">`;
const FAVICONS='<link rel="icon" href="/favicon.ico" sizes="48x48"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="icon" href="/favicon-96x96.png" type="image/png" sizes="96x96"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><link rel="manifest" href="/site.webmanifest">';
const NOSCRIPT_NAV='<noscript><style>@media(max-width:1023px){.nav-wrap{flex-wrap:wrap;height:auto;padding:10px 0}#navigation{position:static;transform:none;visibility:visible;width:100%;height:auto;flex-direction:row;flex-wrap:wrap;gap:6px 14px;padding:8px 0;background:none;box-shadow:none;order:5}#navigation>a,.nav-dropdown>a{padding:4px 0;font-size:13px;border:0}.menu-toggle,.dropdown-toggle,.nav-panel-head,.nav-panel-foot{display:none!important}}.filters{display:none}</style></noscript>';

// FAQPage is a WebPage subtype: the questions sit on the page entity. Only /faq/ is marked up (Google: one instance per site).
const faqMainEntity=faqs.map(([q,a])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}}));

const renderHead=route=>{
  const indexable=production&&route.index;
  const canonical=base+route.url;
  const title=fullTitle(route);
  const og=ogImage(route.img);
  const imageAlt=route.imageAlt||route.title;
  const meta=[
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(route.description)}">`,
    `<meta name="robots" content="${indexable?'index, follow, max-image-preview:large':'noindex, follow'}">`,
    indexable?`<link rel="canonical" href="${esc(canonical)}">`:'',
    `<meta property="og:site_name" content="${esc(site.name)}"><meta property="og:locale" content="en_IN"><meta property="og:type" content="${route.ogType||'website'}"><meta property="og:title" content="${esc(route.title)}"><meta property="og:description" content="${esc(route.description)}"><meta property="og:url" content="${esc(canonical)}">`,
    `<meta property="og:image" content="${esc(base+og)}"><meta property="og:image:type" content="image/jpeg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${esc(imageAlt)}">`,
    `<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(route.title)}"><meta name="twitter:description" content="${esc(route.description)}"><meta name="twitter:image" content="${esc(base+og)}"><meta name="twitter:image:alt" content="${esc(imageAlt)}">`
  ];
  const schema=indexable?`<script type="application/ld+json">${jsonLd(pageGraph({base,url:route.url,title:route.title,description:route.description,ogImage:og,pageType:route.pageType,crumbs:crumbsFromBody(route),pageProps:route.faq?{mainEntity:faqMainEntity}:{},extra:route.schema}))}</script>`:'';
  return `<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="${BRAND_NAVY}"><script>document.documentElement.classList.add('js')</script>${meta.join('')}${FAVICONS}<link rel="preload" href="/fonts/dm-sans.woff2" as="font" type="font/woff2" crossorigin><link rel="preload" href="/fonts/playfair.woff2" as="font" type="font/woff2" crossorigin>${route.url==='/'?HOME_LCP:''}<link rel="stylesheet" href="${assets.css}">${schema}<script src="${assets.js}" defer></script>${NOSCRIPT_NAV}`;
};

for(const route of routes){
  const head=renderHead(route);
  const html=`<!doctype html><html lang="en-IN"><head>${head}</head><body class="${route.url==='/'?'page-home':'page-inner'}">${header(route.url)}<main id="main">${route.body}</main>${footer()}${route.form?formRulesScript():''}</body></html>`;
  const file=route.url==='/404.html'?path.join(dist,'404.html'):path.join(dist,route.url,'index.html');
  await mkdir(path.dirname(file),{recursive:true});
  await writeFile(file,html);
}

// ---- Search engine files (only indexable pages are listed) ----
const indexable=routes.filter(r=>r.index);
await writeFile(path.join(dist,'sitemap-pages.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexable.map(r=>`<url><loc>${esc(base+r.url)}</loc><lastmod>${lastModified(r.sources)}</lastmod></url>`).join('\n')}\n</urlset>\n`);
const newest=indexable.map(r=>lastModified(r.sources)).sort().at(-1);
await writeFile(path.join(dist,'sitemap-index.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n<sitemap><loc>${base}/sitemap-pages.xml</loc><lastmod>${newest}</lastmod></sitemap>\n</sitemapindex>\n`);
// Everything is crawlable (noindex pages must be crawlable for the noindex to be seen).
await writeFile(path.join(dist,'robots.txt'),`User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap-index.xml\n`);

// ---- Netlify redirects: canonical host, /index.html → folder URL, retired URLs ----
const host=new URL(base).host;
const redirects=[
  '# Generated by scripts/build.mjs. Netlify already forces HTTPS and adds trailing slashes (Pretty URLs).',
  `https://www.${host}/* https://${host}/:splat 301!`,
  `http://www.${host}/* https://${host}/:splat 301!`,
  `http://${host}/* https://${host}/:splat 301!`,
  '/index.html / 301!',
  ...routes.filter(r=>r.url!=='/'&&r.url!=='/404.html').map(r=>`${r.url}index.html ${r.url} 301!`),
  '/sitemap.xml /sitemap-index.xml 301!',
  ...Object.entries(packageAliases).flatMap(([oldSlug,newSlug])=>[`/tour-packages/${oldSlug} /tour-packages/${newSlug}/ 301!`,`/tour-packages/${oldSlug}/* /tour-packages/${newSlug}/ 301!`])
];
await writeFile(path.join(dist,'_redirects'),redirects.join('\n')+'\n');

await writeFile(path.join(dist,'site.webmanifest'),JSON.stringify({name:`${site.name} – Northeast India Travel`,short_name:site.name,description:site.description,start_url:'/',scope:'/',display:'browser',lang:'en-IN',theme_color:BRAND_NAVY,background_color:BRAND_YELLOW,icons:[{src:'/icon-192x192.png',sizes:'192x192',type:'image/png'},{src:'/icon-512x512.png',sizes:'512x512',type:'image/png'},{src:'/icon-512x512-maskable.png',sizes:'512x512',type:'image/png',purpose:'maskable'}]},null,2)+'\n');

await writeFile(path.join(root,'output/routes.json'),JSON.stringify({production,base,assets,routes:routes.map(({url,title,index,description})=>({url,title:fullTitle({title}),index,description}))},null,2));
process.stdout.write(`Built ${routes.length} pages (${indexable.length} indexable) in dist/. ${production?'Production build.':'Preview build: every page is noindex.'}\n`);
