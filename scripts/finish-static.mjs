import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

// Keep Next.js as the
// authoring renderer, then ship HTML with a small, independent interaction layer.
// The full application in the GitHub repository retains React and its backend.
let javascript = `(()=>{
const button=document.querySelector('.menu-button');
const nav=document.querySelector('nav[aria-label="Main navigation"]');
function closeMenu(){if(!button||!nav)return;nav.classList.remove('open');button.setAttribute('aria-expanded','false');button.setAttribute('aria-label','Open navigation');}
if(button&&nav){button.addEventListener('click',()=>{const open=button.getAttribute('aria-expanded')!=='true';nav.classList.toggle('open',open);button.setAttribute('aria-expanded',String(open));button.setAttribute('aria-label',open?'Close navigation':'Open navigation');});nav.addEventListener('click',e=>{if(e.target.closest('a'))closeMenu();});}
const keys=new Set();let armed=true;
addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();if(e.target.closest('input,textarea,select,[contenteditable="true"]'))return;keys.add(e.key.toLowerCase());if(armed&&['z','x','c'].every(k=>keys.has(k))){armed=false;location.assign('/admin');}});
addEventListener('keyup',e=>{keys.delete(e.key.toLowerCase());if(!keys.size)armed=true;});
addEventListener('blur',()=>{keys.clear();armed=true;});

document.querySelectorAll('footer button').forEach(b=>b.addEventListener('click',()=>{let note=document.querySelector('#privacy-status');if(!note){note=document.createElement('p');note.id='privacy-status';note.className='wrap muted-small';note.setAttribute('role','status');b.closest('footer').append(note);}note.textContent='This Sites version does not collect visitor analytics.';}));
})();`;
javascript += '\n' + await readFile('client/contact.js','utf8');
const name=`site-${createHash('sha256').update(javascript).digest('hex').slice(0,12)}.js`;
await mkdir('out/assets',{recursive:true});
await writeFile(join('out/assets',name),javascript);
let pages=0;
async function visit(folder){
 for(const entry of await readdir(folder,{withFileTypes:true})){
  const path=join(folder,entry.name);
  if(entry.isDirectory()){if(entry.name!=='_next')await visit(path);continue;}
  if(!entry.name.endsWith('.html'))continue;
  let html=await readFile(path,'utf8');
  html=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
  html=html.replace(/<link\b[^>]*>/gi,tag=>/\bas=["']script["']/i.test(tag)||/\brel=["']modulepreload["']/i.test(tag)?'':tag);
  html=html.replace('</head>','<link rel="preload" href="/fonts/manrope.woff2" as="font" type="font/woff2" crossorigin><link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin></head>');
  html=html.replace('</body>',`<script src="/assets/${name}" defer></script></body>`);
  await writeFile(path,html);pages++;
 }
}
await visit('out');
console.log(`Static delivery prepared: ${pages} pages, ${Buffer.byteLength(javascript)} bytes of browser JavaScript, no hydration runtime.`);
