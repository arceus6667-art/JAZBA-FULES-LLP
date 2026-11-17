// Kept dependency-free at runtime. The build embeds only referenced static assets.
import { ASSETS } from './assets.mjs';

const baseHeaders = {
  'X-Content-Type-Options':'nosniff',
  'X-Frame-Options':'DENY',
  'Referrer-Policy':'strict-origin-when-cross-origin',
  'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security':'max-age=31536000; includeSubDomains',
  'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
};
const decoded = new Map();
const encoder = new TextEncoder();
const json = (body,status=200) => Response.json(body,{status,headers:{...baseHeaders,'Cache-Control':'no-store'}});
const digest = async input => [...new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(input)))].map(v=>v.toString(16).padStart(2,'0')).join('');

async function readJson(request){
 if(!request.headers.get('content-type')?.includes('application/json'))throw {status:415,message:'Please send the form as JSON.'};
 const reader=request.body?.getReader();if(!reader)throw {status:400,message:'Please complete the inquiry form.'};
 const chunks=[];let total=0;
 while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>16000){await reader.cancel();throw {status:413,message:'Your message is too long.'};}chunks.push(value);}
 const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw {status:400,message:'Invalid form submission.'};}
}
function validated(raw){
 if(!raw||typeof raw!=='object'||raw.consent!==true)throw {status:400,message:'Please complete the required fields and privacy consent.'};
 const limits={fullName:[2,100],email:[3,254],companyName:[2,150],contactNumber:[7,25],subject:[3,160],message:[3,5000]};
 const data={};for(const [key,[min,max]] of Object.entries(limits)){
  if(typeof raw[key]!=='string')throw {status:400,message:'Please complete all required fields.'};
  const value=raw[key].trim();if(value.length<min||value.length>max)throw {status:400,message:key==='message'?'Please enter a message between 3 and 5,000 characters.':'Please check the length of your form details.'};data[key]=value;
 }
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)||!/^[+\d\s()\-]{7,25}$/.test(data.contactNumber))throw {status:400,message:'Please enter a valid email address and contact number.'};
 if(raw.website)throw {status:400,message:'Unable to accept this submission.'};
 if(typeof raw.submissionId!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(raw.submissionId))throw {status:400,message:'Please refresh the page and try again.'};
 return {...data,id:raw.submissionId};
}
async function contact(request,env){
 const origin=request.headers.get('origin');
 if(origin!==new URL(request.url).origin||request.headers.get('sec-fetch-site')==='cross-site')return json({error:'This request must come from the Jazba Fuels website.'},403);
 if(!env.DB||!env.CONTACT_HASH_SECRET)return json({error:'Inquiry service is temporarily unavailable. Please call +91 90047 77892.'},503);
 try{
  const data=validated(await readJson(request));
  const fingerprint=await digest(JSON.stringify(data));
  const previous=await env.DB.prepare('SELECT fingerprint FROM corporate_inquiries WHERE id = ?').bind(data.id).first();
  if(previous){if(previous.fingerprint!==fingerprint)return json({error:'Please refresh before sending a different inquiry.'},409);return json({id:data.id,message:'Thank you for contacting Jazba Fuels LLP. We will reach you very shortly.'});}
  const now=Date.now(),hour=Math.floor(now/3600000);
  const key=await crypto.subtle.importKey('raw',encoder.encode(env.CONTACT_HASH_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const ip=request.headers.get('cf-connecting-ip')||'shared';
  const token=[...new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(`${hour}:${ip}`)))].map(v=>v.toString(16).padStart(2,'0')).join('');
  const result=await env.DB.batch([
   env.DB.prepare('DELETE FROM contact_rate_limits WHERE expires_at < ?').bind(now),
   env.DB.prepare('INSERT INTO contact_rate_limits (id, attempts, expires_at) VALUES (?, 1, ?) ON CONFLICT(id) DO UPDATE SET attempts = attempts + 1').bind(token,(hour+1)*3600000),
   env.DB.prepare("INSERT INTO corporate_inquiries (id, full_name, email, company_name, contact_number, subject, message, consent, status, fingerprint, created_at) SELECT ?, ?, ?, ?, ?, ?, ?, 1, 'New', ?, ? WHERE (SELECT attempts FROM contact_rate_limits WHERE id = ?) <= 12 ON CONFLICT(id) DO NOTHING").bind(data.id,data.fullName,data.email,data.companyName,data.contactNumber,data.subject,data.message,fingerprint,new Date(now).toISOString(),token),
  ]);
  if(result[2].meta.changes===0){
   const stored=await env.DB.prepare('SELECT fingerprint FROM corporate_inquiries WHERE id = ?').bind(data.id).first();
   if(!stored||stored.fingerprint!==fingerprint)return json({error:'Too many inquiries. Please try again later or call +91 90047 77892.'},429);
  }
  return json({id:data.id,message:'Thank you for contacting Jazba Fuels LLP. We will reach you very shortly.'},201);
 }catch(error){
  if(error?.status)return json({error:error.message},error.status);
  console.error('Inquiry storage failed');
  return json({error:'We could not save your inquiry. Please try again or call +91 90047 77892.'},503);
 }
}
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(url.pathname==='/api/contact')return request.method==='POST'?contact(request,env):json({error:'Method not allowed.'},405);
  if(url.pathname.startsWith('/api/'))return json({error:'Not found.'},404);
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{...baseHeaders,Allow:'GET, HEAD'}});
  let path=url.pathname;try{path=decodeURIComponent(path);}catch{return new Response('Bad request',{status:400});}
  if(path==='/')path='/index.html';
  let asset=ASSETS[path];if(!asset&&!path.includes('.'))asset=ASSETS[path.replace(/\/$/,'')+'.html'];
  let status=200;if(!asset){asset=ASSETS['/404.html'];status=404;}
  if(!asset)return new Response('Not found',{status:404,headers:baseHeaders});
  if(request.headers.get('if-none-match')===asset.etag)return new Response(null,{status:304,headers:{...baseHeaders,ETag:asset.etag}});
  if(!decoded.has(asset.etag)){const text=atob(asset.data);decoded.set(asset.etag,Uint8Array.from(text,c=>c.charCodeAt(0)));}
  const immutable=path.startsWith('/assets/')||path.startsWith('/_next/');
  return new Response(request.method==='HEAD'?null:decoded.get(asset.etag),{status,headers:{...baseHeaders,'Content-Type':asset.mime,ETag:asset.etag,'Cache-Control':asset.mime.startsWith('text/html')?'public, max-age=0, must-revalidate':immutable?'public, max-age=31536000, immutable':'public, max-age=3600'}});
 }
};
