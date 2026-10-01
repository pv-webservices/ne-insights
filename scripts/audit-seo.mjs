// Technical SEO audit of the built site in dist/. Run: npm run audit:seo (builds in production mode first).
// Fails (exit 1) on any issue. Pass --allow-preview to audit a preview (noindex) build.
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const {production,base,routes}=JSON.parse(await readFile(path.join(root,'output/routes.json'),'utf8'));
const allowPreview=process.argv.includes('--allow-preview');
const issues=[];
const fail=(where,message)=>issues.push(`${where}: ${message}`);
if(!production&&!allowPreview)fail('build','dist/ is a preview build. Run npm run audit:seo (it builds with --production).');

const TITLE_MAX=65,DESC_MIN=70,DESC_MAX=170;
const INDEX_ROBOTS='index, follow, max-image-preview:large',NOINDEX_ROBOTS='noindex, follow';
const REQUIRED_OG=['og:site_name','og:locale','og:type','og:title','og:description','og:url','og:image','og:image:width','og:image:height','og:image:alt'];
const REQUIRED_TWITTER=['twitter:card','twitter:title','twitter:description','twitter:image','twitter:image:alt'];
const FAVICON_LINKS=['/favicon.ico','/favicon.svg','/favicon-96x96.png','/apple-touch-icon.png','/site.webmanifest'];

const decode=s=>s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
const attr=(tag,name)=>{const m=tag.match(new RegExp(`\\s${name}="([^"]*)"`));return m?decode(m[1]):null;};
const metaContent=(html,key)=>{
  const tag=html.match(new RegExp(`<meta (?:name|property)="${key.replace(/[.:]/g,'\\$&')}" content="[^"]*">`))?.[0];
  return tag?attr(tag,'content'):null;
};
const fileFor=url=>url==='/404.html'?path.join(dist,'404.html'):path.join(dist,url,'index.html');
const exists=async file=>{try{await stat(file);return true;}catch{return false;}};
/** Resolves a local URL path to a file in dist (folders need an index.html). */
const resolves=async urlPath=>{
  const target=path.join(dist,decodeURIComponent(urlPath));
  try{const info=await stat(target);return info.isDirectory()?exists(path.join(target,'index.html')):true;}catch{return false;}
};

const pages=new Map();
for(const route of routes)pages.set(route.url,await readFile(fileFor(route.url),'utf8'));
const ids=new Map([...pages].map(([url,html])=>[url,new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]))]));
const titles=new Map(),descriptions=new Map();
const checkedLinks=new Map();
let linkCount=0,imageCount=0,schemaCount=0;

for(const route of routes){
  const {url}=route;
  const html=pages.get(url);
  const head=html.slice(0,html.indexOf('</head>'));
  const indexable=route.index&&production;

  // Titles and descriptions
  const title=decode(html.match(/<title>([^<]*)<\/title>/)?.[1]??'');
  if(!title)fail(url,'missing <title>');
  else if(title.length>TITLE_MAX)fail(url,`title is ${title.length} characters (max ${TITLE_MAX}): "${title}"`);
  const description=metaContent(head,'description')??'';
  if(!description)fail(url,'missing meta description');
  else if(description.length<DESC_MIN||description.length>DESC_MAX)fail(url,`description is ${description.length} characters (${DESC_MIN}–${DESC_MAX})`);
  if(route.index){titles.set(title,[...(titles.get(title)??[]),url]);descriptions.set(description,[...(descriptions.get(description)??[]),url]);}

  // Robots and canonical
  const robots=metaContent(head,'robots');
  const expectedRobots=indexable?INDEX_ROBOTS:NOINDEX_ROBOTS;
  if(robots!==expectedRobots)fail(url,`robots meta is "${robots}", expected "${expectedRobots}"`);
  const canonicals=[...head.matchAll(/<link rel="canonical" href="([^"]*)">/g)].map(m=>m[1]);
  if(indexable&&(canonicals.length!==1||canonicals[0]!==base+url))fail(url,`needs one self-referencing canonical (${base+url}), found ${JSON.stringify(canonicals)}`);
  if(!route.index&&canonicals.length)fail(url,'noindex page must not have a canonical tag');

  // Headings: one H1, no skipped levels
  const headings=[...html.matchAll(/<h([1-6])[\s>]/g)].map(m=>+m[1]);
  if(headings.filter(h=>h===1).length!==1)fail(url,`expected exactly one H1, found ${headings.filter(h=>h===1).length}`);
  headings.forEach((level,i)=>{if(i>0&&level>headings[i-1]+1)fail(url,`heading level skipped: h${headings[i-1]} → h${level} (heading #${i+1})`);});

  // Open Graph and Twitter
  for(const key of REQUIRED_OG)if(!metaContent(head,key))fail(url,`missing ${key}`);
  for(const key of REQUIRED_TWITTER)if(!metaContent(head,key))fail(url,`missing ${key}`);
  if(metaContent(head,'og:url')!==base+url)fail(url,'og:url does not match the page URL');
  if(metaContent(head,'og:image:width')!=='1200'||metaContent(head,'og:image:height')!=='630')fail(url,'og:image must be declared 1200×630');
  const ogPath=(metaContent(head,'og:image')??'').replace(base,'');
  if(!await resolves(ogPath))fail(url,`og:image file missing: ${ogPath}`);

  // Favicons
  for(const href of FAVICON_LINKS)if(!head.includes(`href="${href}"`))fail(url,`missing favicon link ${href}`);

  // Structured data
  const blocks=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>m[1]);
  if(indexable&&!blocks.length)fail(url,'missing JSON-LD');
  for(const block of blocks){
    schemaCount++;
    if(block.includes('<'))fail(url,'JSON-LD contains an unescaped "<"');
    let data;
    try{data=JSON.parse(block);}catch{fail(url,'invalid JSON-LD');continue;}
    const graph=data['@graph']??[data];
    const byType=type=>graph.find(node=>[node['@type']].flat().includes(type));
    const org=byType('TravelAgency');
    if(!org?.['@id']||!org.telephone||!org.address||!org.logo?.url)fail(url,'Organization/TravelAgency needs @id, telephone, address and logo');
    if(!byType('WebSite'))fail(url,'missing WebSite schema');
    if(url!=='/'&&!byType('BreadcrumbList'))fail(url,'inner page missing BreadcrumbList');
    if(url==='/faq/'&&!byType('FAQPage')?.mainEntity?.length)fail(url,'FAQ page missing FAQPage questions');
  }

  // Images
  const imgs=[...html.matchAll(/<img\s[^>]*>/g)].map(m=>m[0]);
  imageCount+=imgs.length;
  if(imgs.filter(tag=>/fetchpriority="high"/.test(tag)).length>1)fail(url,'more than one fetchpriority="high" image');
  for(const tag of imgs){
    if(attr(tag,'alt')===null)fail(url,`image without alt: ${attr(tag,'src')}`);
    if(!/\swidth="\d+"/.test(tag)||!/\sheight="\d+"/.test(tag))fail(url,`image without width/height: ${attr(tag,'src')}`);
    if(attr(tag,'loading')!=='lazy'&&attr(tag,'fetchpriority')!=='high'&&!/\/brand\/logo-/.test(attr(tag,'src')??''))fail(url,`below-the-fold image should be lazy: ${attr(tag,'src')}`);
  }

  // Internal links and assets (href, src and every srcset candidate)
  const refs=[...html.matchAll(/\s(?:href|src)="(\/[^"]*)"/g)].map(m=>decode(m[1]));
  for(const m of html.matchAll(/\s(?:srcset|imagesrcset)="([^"]*)"/g))refs.push(...m[1].split(',').map(part=>part.trim().split(/\s+/)[0]).filter(Boolean));
  for(const ref of refs){
    linkCount++;
    const [withoutHash,hash]=ref.split('#');
    const pathOnly=withoutHash.split('?')[0];
    if(!checkedLinks.has(pathOnly))checkedLinks.set(pathOnly,await resolves(pathOnly));
    if(!checkedLinks.get(pathOnly)){fail(url,`broken internal link ${ref}`);continue;}
    if(/[A-Z_ ]/.test(pathOnly)&&!pathOnly.startsWith('/assets/'))fail(url,`URL should be lowercase and hyphenated: ${pathOnly}`);
    if(!path.extname(pathOnly)&&!pathOnly.endsWith('/'))fail(url,`internal link without trailing slash: ${pathOnly}`);
    if(hash){
      const target=pathOnly===''?url:pathOnly;
      if(pages.has(target)&&!ids.get(target).has(hash))fail(url,`link to missing anchor ${ref}`);
    }
  }
  for(const m of html.matchAll(/href="#([^"]+)"/g))if(!ids.get(url).has(m[1]))fail(url,`link to missing anchor #${m[1]}`);

  // Forms post to the function and link the privacy policy
  for(const form of html.match(/<form class="enquiry-form[\s\S]*?<\/form>/g)??[]){
    if(!/action="\/api\/enquiry" method="post"/.test(form))fail(url,'enquiry form must POST to /api/enquiry');
    for(const name of ['name','email','phone','message','consent'])if(!new RegExp(`name="${name}"[^>]*required`).test(form))fail(url,`enquiry form field "${name}" must be required`);
    if(!form.includes('href="/privacy-policy/"'))fail(url,'consent must link to the privacy policy');
  }
}
for(const [title,urls] of titles)if(urls.length>1)fail('site',`duplicate title "${title}" on ${urls.join(', ')}`);
for(const [description,urls] of descriptions)if(urls.length>1)fail('site',`duplicate description on ${urls.join(', ')}`);

// OG image files must really be 1200×630
const ogFiles=new Set([...pages.values()].map(html=>metaContent(html,'og:image')?.replace(base,'')).filter(Boolean));
for(const og of ogFiles){
  const meta=await sharp(path.join(dist,og)).metadata().catch(()=>null);
  if(!meta||meta.width!==1200||meta.height!==630)fail(og,`OG image is ${meta?.width}×${meta?.height}, expected 1200×630`);
}

// robots.txt, sitemaps and favicon files
const robotsTxt=await readFile(path.join(dist,'robots.txt'),'utf8');
if(!/^User-agent: \*$/m.test(robotsTxt)||!/^Allow: \/$/m.test(robotsTxt))fail('robots.txt','must allow all crawlers');
if(/^Disallow:/m.test(robotsTxt))fail('robots.txt','must not block any path (noindex pages, CSS or JS)');
if(!robotsTxt.includes(`Sitemap: ${base}/sitemap-index.xml`))fail('robots.txt','missing Sitemap line');
const sitemapIndex=await readFile(path.join(dist,'sitemap-index.xml'),'utf8');
const childMaps=[...sitemapIndex.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
const sitemapUrls=[];
for(const child of childMaps){
  const file=path.join(dist,child.replace(base,''));
  if(!await exists(file)){fail('sitemap-index.xml',`missing ${child}`);continue;}
  const xml=await readFile(file,'utf8');
  for(const entry of xml.matchAll(/<url><loc>([^<]+)<\/loc>(?:<lastmod>([^<]+)<\/lastmod>)?<\/url>/g)){
    sitemapUrls.push(entry[1]);
    if(!entry[2]||Number.isNaN(Date.parse(entry[2])))fail('sitemap',`missing or invalid lastmod for ${entry[1]}`);
  }
}
const expected=routes.filter(r=>r.index).map(r=>base+r.url).sort();
const listed=[...sitemapUrls].sort();
for(const u of expected)if(!listed.includes(u))fail('sitemap',`indexable page missing: ${u}`);
for(const u of listed)if(!expected.includes(u))fail('sitemap',`non-indexable or unknown page listed: ${u}`);
if(new Set(listed).size!==listed.length)fail('sitemap','duplicate URLs');
for(const file of ['favicon.ico','favicon.svg','favicon-48x48.png','favicon-96x96.png','apple-touch-icon.png','icon-192x192.png','icon-512x512.png','site.webmanifest'])if(!await exists(path.join(dist,file)))fail('favicons',`missing ${file}`);
for(const [file,size] of [['favicon-48x48.png',48],['favicon-96x96.png',96],['apple-touch-icon.png',180],['icon-192x192.png',192],['icon-512x512.png',512]]){
  const meta=await sharp(path.join(dist,file)).metadata().catch(()=>null);
  if(meta?.width!==size||meta?.height!==size)fail('favicons',`${file} should be ${size}×${size}`);
}

if(issues.length){
  process.stderr.write(`SEO audit: ${issues.length} issue(s)\n${issues.map(i=>`  ✗ ${i}`).join('\n')}\n`);
  process.exit(1);
}
const indexableCount=routes.filter(r=>r.index).length;
process.stdout.write(`SEO audit PASS: ${routes.length} pages (${indexableCount} indexable, ${routes.length-indexableCount} noindex); ${linkCount} internal links/assets checked (${checkedLinks.size} unique, 0 broken); ${imageCount} images; ${schemaCount} JSON-LD blocks; ${listed.length} sitemap URLs match the indexable pages; titles ≤ ${TITLE_MAX}, descriptions ${DESC_MIN}–${DESC_MAX}, unique.\n`);
