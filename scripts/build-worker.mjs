import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { createHash } from 'node:crypto';
const assets={};
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.woff2':'font/woff2','.webp':'image/webp','.png':'image/png','.jpeg':'image/jpeg','.txt':'text/plain; charset=utf-8'};
const include=new Set(['/fonts/manrope.woff2','/fonts/inter.woff2']);
async function htmlFiles(folder){for(const f of await readdir(folder,{withFileTypes:true})){if(f.name==='_next')continue;const path=join(folder,f.name);if(f.isDirectory())await htmlFiles(path);else if(f.name.endsWith('.html')){
 const url='/'+path.replaceAll('\\','/').replace(/^out\//,'');include.add(url);const html=await readFile(path,'utf8');
 for(const match of html.matchAll(/(?:href|src)="(\/[^"?#]+)"/g)){if(/\.(css|js|woff2|webp|png|jpeg)$/.test(match[1]))include.add(match[1]);}
}}}
await htmlFiles('out');
for(const url of include){const bytes=await readFile(join('out',url.slice(1)));assets[url]={data:bytes.toString('base64'),mime:types[extname(url)]||'application/octet-stream',etag:'"'+createHash('sha256').update(bytes).digest('hex').slice(0,24)+'"'};}
await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});
const worker=(await readFile('worker/index.mjs','utf8')).replace("import { ASSETS } from './assets.mjs';",'const ASSETS = '+JSON.stringify(assets)+';');
await writeFile('dist/server/index.js',worker);
await writeFile('dist/.openai/hosting.json',await readFile('.openai/hosting.json','utf8'));
console.log(`Built persistent contact Worker with ${include.size} embedded static resources.`);
