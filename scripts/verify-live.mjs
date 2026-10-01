// Post-deploy check of the live site: npm run verify:live [-- https://neinsights.in]
// Compares the live HTML with the local production build (run `npm run audit:seo` first) and checks
// status codes, redirects, headers, sitemap, favicons and the enquiry endpoint.
// It never sends an email: the endpoint is only probed with requests that are rejected before delivery.
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=(process.argv[2]||'https://neinsights.in').replace(/\/$/,'');
const host=new URL(base).host;
const local=JSON.parse(await readFile(path.join(root,'output/routes.json'),'utf8').catch(()=>'null'));
const results=[];
const check=(name,ok,detail='')=>results.push({name,ok:!!ok,detail});
const get=(url,init={})=>fetch(url,{redirect:'manual',...init,headers:{'User-Agent':'ne-insights-verify-live',...init.headers}});

const home=await get(`${base}/`);
const homeHtml=await home.text();
check('Home page returns 200',home.status===200,`status ${home.status}`);
if(local){
  check('Live site runs the latest build (CSS/JS hashes match local production build)',homeHtml.includes(local.assets.css)&&homeHtml.includes(local.assets.js),`expects ${local.assets.css} and ${local.assets.js}`);
}
check('Home page is indexable',homeHtml.includes('<meta name="robots" content="index, follow, max-image-preview:large">'));
check('Home canonical is the live domain',homeHtml.includes(`<link rel="canonical" href="${base}/">`));
check('Security headers present',['x-content-type-options','referrer-policy','x-frame-options'].every(h=>home.headers.get(h)),['x-content-type-options','referrer-policy','x-frame-options'].map(h=>`${h}: ${home.headers.get(h)}`).join('; '));
check('HTTPS enforced (HSTS)',!!home.headers.get('strict-transport-security'),home.headers.get('strict-transport-security')||'missing');

const missing=await get(`${base}/verify-missing-${Date.now()}/`);
const missingHtml=await missing.text();
check('Unknown URL returns 404 with the branded page',missing.status===404&&missingHtml.includes('off the beaten path'),`status ${missing.status}`);
check('404 page is noindex',missingHtml.includes('noindex, follow'));

const redirects=[[`http://${host}/`,`${base}/`],[`https://www.${host}/`,`${base}/`],[`http://www.${host}/`,null],[`${base}/about`,'/about/'],[`${base}/index.html`,'/'],[`${base}/about/index.html`,'/about/'],[`${base}/sitemap.xml`,'/sitemap-index.xml']];
for(const [from,to] of redirects){
  const res=await get(from);
  const location=res.headers.get('location')||'';
  const ok=res.status===301&&(to===null?/^https:\/\//.test(location):location===to||location===`${base}${to}`);
  check(`Redirect ${from} → ${to??'https'}`,ok,`${res.status} ${location}`);
}

const robots=await (await get(`${base}/robots.txt`)).text();
check('robots.txt allows crawling and lists the sitemap',/^Allow: \/$/m.test(robots)&&!/^Disallow:/m.test(robots)&&robots.includes(`Sitemap: ${base}/sitemap-index.xml`),robots.replace(/\n/g,' | '));
const index=await get(`${base}/sitemap-index.xml`);
const indexXml=await index.text();
const child=indexXml.match(/<loc>([^<]+)<\/loc>/)?.[1];
const childXml=child?await (await get(child)).text():'';
const urls=[...childXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
const expected=local?local.routes.filter(r=>r.index).length:null;
check('Sitemap index and page sitemap are reachable',index.status===200&&urls.length>0,`${urls.length} URLs`);
if(expected!==null)check('Sitemap lists every indexable page',urls.length===expected,`${urls.length} live vs ${expected} built`);

for(const file of ['/favicon.ico','/favicon.svg','/favicon-48x48.png','/favicon-96x96.png','/apple-touch-icon.png','/icon-192x192.png','/icon-512x512.png','/site.webmanifest']){
  const res=await get(`${base}${file}`);
  check(`Favicon ${file}`,res.status===200,`${res.status} ${res.headers.get('content-type')}`);
}
const asset=local?await get(`${base}${local.assets.css}`):null;
if(asset)check('Hashed CSS is cached for a year',/max-age=31536000/.test(asset.headers.get('cache-control')||''),asset.headers.get('cache-control')||'');

const endpoint=`${base}/api/enquiry`;
const getEndpoint=await get(endpoint,{headers:{Accept:'application/json'}});
check('Enquiry function is deployed (GET → 405)',getEndpoint.status===405,`status ${getEndpoint.status}`);
const invalid=await get(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json',Origin:base},body:JSON.stringify({form_type:'contact',ts:String(Date.now()-60000)})});
const invalidBody=await invalid.json().catch(()=>({}));
check('Enquiry function validates (empty POST → 422, no email sent)',invalid.status===422&&invalidBody.code==='validation',`status ${invalid.status}`);
const foreign=await get(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json',Origin:'https://example.com'},body:'{}'});
check('Enquiry function rejects other websites (→ 403)',foreign.status===403,`status ${foreign.status}`);

const width=Math.max(...results.map(r=>r.name.length));
for(const r of results)process.stdout.write(`${r.ok?'PASS':'FAIL'}  ${r.name.padEnd(width)}  ${r.detail}\n`);
const failed=results.filter(r=>!r.ok).length;
process.stdout.write(`\n${results.length-failed}/${results.length} checks passed on ${base}\n`);
process.exit(failed?1:0);
