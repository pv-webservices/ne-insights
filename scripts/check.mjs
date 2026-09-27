import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const routes=JSON.parse(await readFile(path.join(root,'output/routes.json'),'utf8'));
const failures=[],titles=new Set(),descriptions=new Set();
let links=0,images=0;
for(const route of routes){
 const file=path.join(root,'dist',route.url==='/404.html'?'404.html':route.url+'index.html');
 const html=await readFile(file,'utf8');
 const title=html.match(/<title>(.*?)<\/title>/)?.[1];
 const description=html.match(/<meta name="description" content="([^"]*)"/)?.[1];
 if(!title||titles.has(title))failures.push(`${route.url}: missing or duplicate title`);titles.add(title);
 if(!description||descriptions.has(description))failures.push(`${route.url}: missing or duplicate description`);descriptions.add(description);
 if((html.match(/<h1(?:\s|>)/g)||[]).length!==1)failures.push(`${route.url}: expected exactly one H1`);
 if(/Search Now|Pickup Location|Drop Date/.test(html))failures.push(`${route.url}: excluded booking panel found`);
 for(const match of html.matchAll(/(?:href|src)="(\/[^"?#]*)(?:\?[^"#]*)?(?:#[^"]*)?"/g)){
  const target=path.join(root,'dist',decodeURIComponent(match[1]));
  try{const info=await stat(target);if(info.isDirectory())await stat(path.join(target,'index.html'));links++;}catch{failures.push(`${route.url}: broken local reference ${match[1]}`);}
 }
 for(const match of html.matchAll(/<img\s[^>]*>/g)){
  images++;if(!/alt="[^"]*"/.test(match[0]))failures.push(`${route.url}: image lacks alt`);
  if(!/width="\d+"/.test(match[0])||!/height="\d+"/.test(match[0]))failures.push(`${route.url}: image lacks dimensions`);
 }
 for(const match of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g))try{JSON.parse(match[1]);}catch{failures.push(`${route.url}: invalid JSON-LD`);}
 if(html.includes('data-enquiry')&&!html.includes('<fieldset disabled data-enable-form>'))failures.push(`${route.url}: form is not disabled before progressive enhancement`);
 if(html.includes('data-enquiry')&&(html.match(/<fieldset/g)||[]).length!==(html.match(/<\/fieldset>/g)||[]).length)failures.push(`${route.url}: form fieldset mismatch`);
}
if(failures.length){console.error(failures.join('\n'));process.exit(1);}
console.log(`PASS: ${routes.length} pages; ${links} local references; ${images} image elements; unique metadata; one H1 per page; valid JSON-LD; excluded booking panel absent; form progressive enhancement.`);
