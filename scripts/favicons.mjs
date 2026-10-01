// Generates the favicon set in public/ from the NE Insights logo master: npm run favicons
// The "NE" monogram is cut from the logo and centred on a solid brand-yellow square,
// because the full logo (with "Insights" lettering) is unreadable at 16–48px.
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
import {BRAND_NAVY,BRAND_YELLOW} from '../src/data/brand.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const LOGO=path.join(root,'source-files/images/brand/logo.jpeg');
const PUBLIC=path.join(root,'public');
// Monogram bounds in the 1600×900 master (the N and the patterned E).
const MONOGRAM={left:270,top:36,width:1080,height:600};
// The tops of the "Insights" lettering reach into the monogram box; paint them out in brand yellow.
const yellowBox=(width,height)=>({input:{create:{width,height,channels:4,background:BRAND_YELLOW}}});
const LETTER_MASKS=[{...yellowBox(610,26),left:0,top:574},{...yellowBox(1080,6),left:0,top:594}];

/** Square PNG with the monogram filling `fill` of the canvas width. */
const iconPng=async(size,fill=0.86)=>{
  const inner=Math.round(size*fill);
  const cleaned=await sharp(LOGO).extract(MONOGRAM).composite(LETTER_MASKS).png().toBuffer();
  const mark=await sharp(cleaned).resize({width:inner,height:inner,fit:'inside',kernel:'lanczos3'}).toBuffer();
  return sharp({create:{width:size,height:size,channels:4,background:BRAND_YELLOW}}).composite([{input:mark,gravity:'center'}]).png({compressionLevel:9}).toBuffer();
};

/** ICO container holding a single PNG image (supported by every current browser and Google). */
const icoFromPng=(png,size)=>{
  const header=Buffer.alloc(6);header.writeUInt16LE(0,0);header.writeUInt16LE(1,2);header.writeUInt16LE(1,4);
  const entry=Buffer.alloc(16);
  entry.writeUInt8(size>=256?0:size,0);entry.writeUInt8(size>=256?0:size,1);entry.writeUInt8(0,2);entry.writeUInt8(0,3);
  entry.writeUInt16LE(1,4);entry.writeUInt16LE(32,6);entry.writeUInt32LE(png.length,8);entry.writeUInt32LE(22,12);
  return Buffer.concat([header,entry,png]);
};

// Simplified vector monogram for browsers that prefer SVG icons.
const SVG=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="${BRAND_YELLOW}"/><path fill="${BRAND_NAVY}" d="M7 47V16h6.2l13 19.6V16H31v31h-5.6L12 26.8V47z"/><g fill="none" stroke-width="3.2"><circle cx="46" cy="31.5" r="7.6" stroke="#d62a1c" stroke-dasharray="3 3"/><circle cx="46" cy="31.5" r="7.6" stroke="#118a3a" stroke-dasharray="3 3" stroke-dashoffset="3"/></g><path fill="none" stroke="${BRAND_NAVY}" stroke-width="4.2" stroke-linecap="round" d="M56.2 21.5A14 14 0 1 0 56.2 41.5"/><rect x="39.5" y="29.4" width="13" height="4.2" rx="1.6" fill="${BRAND_NAVY}"/></svg>\n`;

const outputs=[['favicon-48x48.png',48],['favicon-96x96.png',96],['apple-touch-icon.png',180],['icon-192x192.png',192],['icon-512x512.png',512]];
for(const [name,size] of outputs)await writeFile(path.join(PUBLIC,name),await iconPng(size));
// Maskable icons need the artwork inside the central 80% safe zone.
await writeFile(path.join(PUBLIC,'icon-512x512-maskable.png'),await iconPng(512,0.68));
await writeFile(path.join(PUBLIC,'favicon.ico'),icoFromPng(await iconPng(48),48));
await writeFile(path.join(PUBLIC,'favicon.svg'),SVG);
process.stdout.write(`Wrote ${outputs.length+3} favicon files to public/\n`);
