import http from 'node:http';
import {stat,readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const result=spawnSync(process.execPath,[path.join(root,'scripts/build.mjs')],{stdio:'inherit'});
if(result.status!==0)process.exit(result.status||1);
const dist=path.join(root,'dist');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2','.xml':'application/xml','.txt':'text/plain; charset=utf-8'};
const port=Number(process.env.PORT)||4321;
http.createServer(async(req,res)=>{
 try{
  const url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  let file=path.resolve(dist,'.'+url);
  if(!file.startsWith(dist+path.sep)&&file!==dist){res.writeHead(403);res.end();return;}
  let status=200;
  try{const info=await stat(file);if(info.isDirectory())file=path.join(file,'index.html');await stat(file);}catch{file=path.join(dist,'404.html');status=404;}
  const data=await readFile(file);
  res.writeHead(status,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
  res.end(data);
 }catch{res.writeHead(400);res.end('Bad request');}
}).listen(port,'127.0.0.1',()=>console.log(`NE Insights preview: http://localhost:${port}`));
