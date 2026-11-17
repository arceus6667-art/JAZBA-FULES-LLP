export function administrator(request,env){
 const id=request.headers.get('oai-authenticated-user-id');
 const email=request.headers.get('oai-authenticated-user-email')?.trim().toLowerCase();
 const allowed=(env.ADMIN_OWNER_EMAIL||'').split(',').map(v=>v.trim().toLowerCase()).filter(Boolean);
 return id&&email&&allowed.includes(email)?{id,email}:null;
}
export function adminLogin(request,headers,stylesheet){
 const signedIn=Boolean(request.headers.get('oai-authenticated-user-id'));
 const content=signedIn?'<p>This account is not authorised to access this dashboard. Sign out and use the Site owner’s ChatGPT account.</p><a class="button primary" href="/signout-with-chatgpt?return_to=%2Fadmin" target="_top">Switch account</a>':'<p>Sign in with the ChatGPT account that owns this Jazba Fuels Site. Public visitors cannot access inquiry records.</p><a class="button primary" href="/signin-with-chatgpt?return_to=%2Fadmin" target="_top">Sign in with ChatGPT ↗</a>';
 const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Jazba Command Centre — Sign in</title><link rel="stylesheet" href="'+stylesheet+'"></head><body><main class="admin-login"><div><a class="brand" href="/"><img class="brand-logo" src="/brand/jazba-fuels-logo-640.webp" alt="Jazba Fuels" width="640" height="213"></a><h1>Jazba Command Centre</h1>'+content+'<a class="login-back" href="/">Return to website</a></div></main></body></html>';
 return new Response(html,{status:signedIn?403:200,headers:{...headers,'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'}});
}
const states=['New','Read','Responded','Resolved','Archived'];
const columns='id,full_name,email,company_name,contact_number,subject,message,consent,status,administrative_notes,created_at,updated_at';
function selection(url){
 const where=[],values=[];
 const q=(url.searchParams.get('q')||'').trim().slice(0,150),status=url.searchParams.get('status');
 if(q){where.push('(full_name LIKE ? OR email LIKE ? OR company_name LIKE ? OR subject LIKE ?)');values.push(...Array(4).fill('%'+q+'%'));}
 if(status){if(!states.includes(status))throw {status:400,message:'Invalid status.'};where.push('status = ?');values.push(status);}
 for(const [key,operator,time] of [['from','>=','00:00:00.000'],['to','<=','23:59:59.999']]){
  const v=url.searchParams.get(key);if(!v)continue;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(v))throw {status:400,message:'Choose a valid date.'};
  const date=new Date(`${v}T${time}+05:30`);if(!Number.isFinite(+date))throw {status:400,message:'Choose a valid date.'};
  where.push('created_at '+operator+' ?');values.push(date.toISOString());
 }
 return {sql:where.length?' WHERE '+where.join(' AND '):'',values};
}
const audit=(db,user,action,id)=>db.prepare('INSERT INTO admin_audit (id,administrator_id,administrator_email,action,entity_id,created_at) VALUES (?,?,?,?,?,?)').bind(crypto.randomUUID(),user.id,user.email,action,id,new Date().toISOString());
export async function adminApi(request,env,{json,readJson}){
 try{
  const user=administrator(request,env);if(!user)return json({error:'Sign in with the authorised Site owner account.'},401);
  if(!env.DB)return json({error:'Database temporarily unavailable.'},503);
  const url=new URL(request.url),resource=url.pathname.slice('/api/admin/'.length);
  if(request.method==='GET'){
   if(resource==='session')return json({email:user.email,role:'Site owner'});
   if(resource==='overview'){
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata'}).format(new Date());
    const start=new Date(today+'T00:00:00+05:30').toISOString();
    const rows=await env.DB.batch([
     env.DB.prepare("SELECT COUNT(*) AS total, COALESCE(SUM(status='New'),0) AS unread, COALESCE(SUM(status='Resolved'),0) AS resolved, COALESCE(SUM(status='Archived'),0) AS archived FROM corporate_inquiries"),
     env.DB.prepare('SELECT COUNT(*) AS total FROM corporate_inquiries WHERE created_at >= ?').bind(start),
     env.DB.prepare('SELECT id, full_name, company_name, subject, status, created_at FROM corporate_inquiries ORDER BY created_at DESC LIMIT 5'),
     env.DB.prepare('SELECT action,entity_id,created_at FROM admin_audit ORDER BY created_at DESC LIMIT 6'),
    ]);
    return json({...rows[0].results[0],today:rows[1].results[0].total,recent:rows[2].results,activity:rows[3].results});
   }
   if(resource==='messages'||resource==='messages.csv'){
    const f=selection(url);
    if(resource==='messages.csv'){
     const result=await env.DB.prepare('SELECT '+columns+' FROM corporate_inquiries'+f.sql+' ORDER BY created_at DESC LIMIT 10000').bind(...f.values).all();
     const quote=v=>'"'+String(v??'').replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')+'"';
     const keys=columns.split(',');const csv='\uFEFF'+[keys,...result.results.map(r=>keys.map(k=>r[k]))].map(r=>r.map(quote).join(',')).join('\r\n');
     await audit(env.DB,user,'Exported inquiry records',String(result.results.length)).run();
     return new Response(csv,{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="jazba-inquiries.csv"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
    }
    const page=Math.max(1,Math.min(10000,Math.floor(Number(url.searchParams.get('page'))||1)));
    const rows=await env.DB.batch([
     env.DB.prepare('SELECT id,full_name,email,company_name,subject,status,created_at FROM corporate_inquiries'+f.sql+' ORDER BY created_at DESC LIMIT 15 OFFSET ?').bind(...f.values,(page-1)*15),
     env.DB.prepare('SELECT COUNT(*) AS total FROM corporate_inquiries'+f.sql).bind(...f.values),
    ]);
    return json({rows:rows[0].results,total:rows[1].results[0].total,page});
   }
   if(resource==='activity')return json((await env.DB.prepare('SELECT administrator_email,action,entity_id,created_at FROM admin_audit ORDER BY created_at DESC LIMIT 200').all()).results);
   if(resource.startsWith('messages/')){
    const record=await env.DB.prepare('SELECT '+columns+' FROM corporate_inquiries WHERE id = ?').bind(resource.slice(9)).first();
    return record?json(record):json({error:'Inquiry not found.'},404);
   }
  }
  if(['PATCH','DELETE'].includes(request.method)&&resource.startsWith('messages/')){
   if(request.headers.get('origin')!==url.origin||request.headers.get('sec-fetch-site')==='cross-site')return json({error:'Request origin is not allowed.'},403);
   const id=resource.slice(9);
   const record=await env.DB.prepare('SELECT id FROM corporate_inquiries WHERE id = ?').bind(id).first();
   if(!record)return json({error:'Inquiry not found.'},404);
   const body=await readJson(request);
   if(request.method==='DELETE'){
    if(body?.confirmation!=='DELETE')return json({error:'Deletion confirmation required.'},400);
    await env.DB.batch([env.DB.prepare('DELETE FROM corporate_inquiries WHERE id = ?').bind(id),audit(env.DB,user,'Deleted inquiry',id)]);
   }else{
    if(!body||!states.includes(body.status)||typeof body.notes!=='string'||body.notes.length>10000)return json({error:'Invalid status or notes.'},400);
    await env.DB.batch([env.DB.prepare('UPDATE corporate_inquiries SET status = ?, administrative_notes = ?, updated_at = ? WHERE id = ?').bind(body.status,body.notes,new Date().toISOString(),id),audit(env.DB,user,'Updated inquiry status or notes',id)]);
   }
   return json({ok:true});
  }
  return json({error:'Not found.'},404);
 }catch(error){if(error?.status)return json({error:error.message},error.status);console.error('Administrator operation failed');return json({error:'Unable to complete this request. Please try again.'},503);}
}
