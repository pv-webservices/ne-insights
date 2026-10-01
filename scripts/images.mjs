// Generates the optimised, responsive images in public/images from the full-resolution
// masters in source-files/images. Run after adding or replacing a master: npm run images
// Outputs are committed, so Netlify builds do not need to run sharp.
import {mkdir,readdir,rm,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SOURCE=path.join(root,'source-files/images');
const OUTPUT=path.join(root,'public/images');
const MANIFEST=path.join(root,'src/data/image-manifest.json');

const PHOTO_WIDTHS=[400,800,1200];
// Full-bleed hero backgrounds get one larger size for wide desktop screens.
const HERO_WIDTHS=[400,800,1200,1600];
const HERO_KEYS=new Set(['hero','hero-journey','traveller','wild-tiger']);
const BRAND_WIDTHS={logo:[120,240,360],toaa:[120,240]};
const OG_SIZE=[1200,630];
const WEBP={quality:66,effort:5};
const AVIF={quality:45,effort:4};

const toKey=file=>path.parse(file).name;

/** Crops away the white margin around the yellow logo plate so the header logo has no dead space. */
const loadMaster=async(dir,file)=>{
  const input=sharp(path.join(SOURCE,dir,file));
  if(dir==='brand'&&toKey(file)==='logo'){
    const trimmed=await input.trim({background:'#ffffff',threshold:30}).toBuffer();
    return sharp(trimmed);
  }
  return input;
};

const writeVariants=async(image,dir,key,widths)=>{
  await mkdir(path.join(OUTPUT,dir),{recursive:true});
  for(const width of widths){
    const resized=image.clone().resize({width,withoutEnlargement:true});
    await resized.clone().webp(WEBP).toFile(path.join(OUTPUT,dir,`${key}-${width}.webp`));
    await resized.clone().avif(AVIF).toFile(path.join(OUTPUT,dir,`${key}-${width}.avif`));
  }
};

const writeOg=async(image,key)=>{
  await mkdir(path.join(OUTPUT,'og'),{recursive:true});
  await image.clone().resize({width:OG_SIZE[0],height:OG_SIZE[1],fit:'cover',position:sharp.strategy.attention}).jpeg({quality:72,mozjpeg:true}).toFile(path.join(OUTPUT,'og',`${key}.jpg`));
};

// Clear previous outputs (contents only: removing the folder itself fails on Windows if it is open).
await mkdir(OUTPUT,{recursive:true});
for(const entry of await readdir(OUTPUT))await rm(path.join(OUTPUT,entry),{recursive:true,force:true});
const manifest={};
for(const dir of (await readdir(SOURCE)).sort()){
  for(const file of (await readdir(path.join(SOURCE,dir))).sort()){
    if(!/\.(jpe?g|png|webp)$/i.test(file))continue;
    const key=toKey(file);
    const image=await loadMaster(dir,file);
    const {width,height}=await image.clone().toBuffer({resolveWithObject:true}).then(r=>r.info);
    const candidate=dir==='brand'?BRAND_WIDTHS[key]||[240]:HERO_KEYS.has(key)?HERO_WIDTHS:PHOTO_WIDTHS;
    const widths=[...new Set(candidate.map(w=>Math.min(w,width)))];
    await writeVariants(image,dir,key,widths);
    if(dir==='brand'&&key==='logo')await image.clone().resize({width:600}).png({palette:true,compressionLevel:9}).toFile(path.join(OUTPUT,dir,'logo-600.png'));
    if(dir!=='brand')await writeOg(image,key);
    const largest=Math.max(...widths);
    manifest[key]={dir,width:largest,height:Math.round(height*largest/width),widths,og:dir!=='brand'};
    process.stdout.write(`${dir}/${key}: ${widths.join(', ')}\n`);
  }
}
await writeFile(MANIFEST,JSON.stringify(manifest,null,2)+'\n');
process.stdout.write(`Wrote ${Object.keys(manifest).length} images and src/data/image-manifest.json\n`);
