// Local preview server (not used in production). Mirrors the Netlify behaviour the site relies on:
// generated _redirects (301), custom 404 page with a real 404 status, folder URLs with trailing slashes,
// and POST /api/enquiry handled by the real function code. Emails are NEVER sent locally: the preview
// transport writes each rendered message to output/mail/*.eml instead.
//   npm run dev                 build (preview) and serve on http://localhost:4321
//   node scripts/serve.mjs --no-build   serve the existing dist/ (used by the browser tests)
import http from 'node:http';
import {stat,readFile,mkdir,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import nodemailer from 'nodemailer';
import {createEnquiryHandler} from '../netlify/lib/enquiry/handler.mts';
import {createRateLimiter} from '../netlify/lib/enquiry/security.mts';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if(!process.argv.includes('--no-build')){
  const result=spawnSync(process.execPath,[path.join(root,'scripts/build.mjs')],{stdio:'inherit'});
  if(result.status!==0)process.exit(result.status||1);
}
const dist=path.join(root,'dist');
const mailDir=path.join(root,'output/mail');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.avif':'image/avif','.png':'image/png','.jpg':'image/jpeg','.ico':'image/x-icon','.woff2':'font/woff2','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8','.webmanifest':'application/manifest+json','.json':'application/json'};
const port=Number(process.env.PORT)||4321;

/** Path-only rules from dist/_redirects ("/from /to 301!"), with trailing /* splats. */
const loadRedirects=async()=>{
  const text=await readFile(path.join(dist,'_redirects'),'utf8').catch(()=>'');
  return text.split('\n').map(line=>line.trim().split(/\s+/)).filter(([from,to])=>from?.startsWith('/')&&to).map(([from,to,status])=>({from,to,status:parseInt(status,10)||301}));
};
const matchRedirect=(rules,pathname)=>{
  for(const rule of rules){
    if(rule.from.endsWith('/*')){
      const prefix=rule.from.slice(0,-1);
      if(pathname.startsWith(prefix))return rule.to.replace(':splat',pathname.slice(prefix.length));
    }else if(rule.from===pathname)return rule.to;
  }
  return null;
};

const previewTransport=nodemailer.createTransport({streamTransport:true,buffer:true,newline:'unix'});
const enquiry=createEnquiryHandler({
  env:()=>({SMTP_HOST:'preview.invalid',SMTP_PORT:'465',SMTP_USER:'preview',SMTP_PASS:'preview',MAIL_TO:'operations@neinsights.in',MAIL_FROM:'operations@neinsights.in',...process.env}),
  createTransport:()=>({sendMail:async message=>{
    const info=await previewTransport.sendMail(message);
    await mkdir(mailDir,{recursive:true});
    await writeFile(path.join(mailDir,`${Date.now()}.eml`),info.message);
    return info;
  }}),
  rateLimiter:createRateLimiter({limit:50,windowMs:600000})
});

const toWebRequest=async req=>{
  const chunks=[];
  for await(const chunk of req)chunks.push(chunk);
  const headers=new Headers();
  for(const [key,value] of Object.entries(req.headers))if(typeof value==='string')headers.set(key,value);
  return new Request(`http://localhost:${port}${req.url}`,{method:req.method,headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)});
};

const redirects=await loadRedirects();
http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    if(url.pathname==='/api/enquiry'){
      const response=await enquiry(await toWebRequest(req),{ip:req.socket.remoteAddress});
      res.writeHead(response.status,Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    const pathname=decodeURIComponent(url.pathname);
    const target=matchRedirect(redirects,pathname);
    if(target){res.writeHead(301,{Location:target});res.end();return;}
    let file=path.resolve(dist,'.'+pathname);
    if(!file.startsWith(dist+path.sep)&&file!==dist){res.writeHead(403);res.end();return;}
    let status=200;
    try{
      const info=await stat(file);
      if(info.isDirectory()){
        if(!pathname.endsWith('/')){res.writeHead(301,{Location:pathname+'/'+url.search});res.end();return;}
        file=path.join(file,'index.html');
      }
      await stat(file);
    }catch{file=path.join(dist,'404.html');status=404;}
    const data=await readFile(file);
    res.writeHead(status,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'SAMEORIGIN'});
    res.end(data);
  }catch{res.writeHead(400);res.end('Bad request');}
}).listen(port,'127.0.0.1',()=>process.stdout.write(`NE Insights preview: http://localhost:${port} (enquiries are saved to output/mail/, never sent)\n`));
