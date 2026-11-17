(() => {
  if (!document.querySelector('[data-admin-dashboard]')) return;
  const el = id => document.getElementById(id);
  const date = value => new Date(value).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'});
  const filters=el('inquiry-filters');
  let view='overview',page=1,total=0,selected=null,revision=0;
  const notice=(message,error=false)=>{const node=el('admin-notice');node.textContent=message;node.hidden=!message;node.classList.toggle('admin-error',error);node.setAttribute('role',error?'alert':'status');};
  async function api(path,method='GET',body){
    const response=await fetch('/api/admin/'+path,{method,cache:'no-store',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});
    const result=await response.json();
    if(!response.ok){if(response.status===401)location.assign('/admin');throw new Error(result.error||'Request failed.');}
    return result;
  }
  const params=()=>{const value=new URLSearchParams();for(const [key,v] of new FormData(filters))if(v)value.set(key,v);value.set('page',String(page));return value;};
  function cell(row,value){const node=document.createElement('td');node.textContent=String(value??'');row.append(node);return node;}
  function empty(container,text){const node=document.createElement('p');node.className='admin-empty';node.textContent=text;container.replaceChildren(node);}
  function recentRecord(item){const node=document.createElement('div');node.className='admin-record';const button=document.createElement('button');button.type='button';button.textContent=item.full_name+' · '+item.company_name;button.addEventListener('click',async()=>{await show('messages');await open(item.id);});const text=document.createElement('p');text.textContent=item.subject;const small=document.createElement('small');small.textContent=item.status+' · '+date(item.created_at);node.append(button,text,small);return node;}
  async function load(){const current=++revision;notice('Loading…');try{
    if(view==='overview'){
      const data=await api('overview');if(current!==revision)return;
      document.querySelectorAll('[data-metric]').forEach(n=>n.textContent=String(data[n.dataset.metric]??0));
      const recent=el('admin-recent');recent.replaceChildren(...data.recent.map(recentRecord));if(!data.recent.length)empty(recent,'No inquiries have been submitted yet.');
      const activity=el('admin-recent-activity');activity.replaceChildren(...data.activity.map(a=>{const n=document.createElement('p');n.className='admin-meta';n.textContent=a.action+' · '+date(a.created_at);return n;}));if(!data.activity.length)empty(activity,'No administrative actions recorded.');
    }else if(view==='messages'){
      const query=params();const data=await api('messages?'+query);if(current!==revision)return;total=data.total;
      const rows=el('inquiry-rows');rows.replaceChildren();for(const item of data.rows){const row=document.createElement('tr');const sender=cell(row,item.full_name);for(const text of [item.company_name,item.email]){const small=document.createElement('small');small.textContent=text;sender.append(small);}cell(row,item.subject);cell(row,item.status);cell(row,date(item.created_at));const action=cell(row,'');const button=document.createElement('button');button.type='button';button.textContent='Open';button.addEventListener('click',()=>open(item.id));action.append(button);rows.append(row);}
      el('inquiry-empty').hidden=data.rows.length>0;el('inquiry-total').textContent=total+' inquiries';el('inquiry-page').textContent='Page '+page;el('inquiry-previous').disabled=page===1;el('inquiry-next').disabled=page*15>=total;
      query.delete('page');el('inquiry-export').href='/api/admin/messages.csv?'+query;
    }else{
      const data=await api('activity');if(current!==revision)return;const rows=el('activity-rows');rows.replaceChildren();for(const item of data){const row=document.createElement('tr');for(const value of [date(item.created_at),item.administrator_email,item.action,item.entity_id])cell(row,value);rows.append(row);}el('activity-empty').hidden=data.length>0;
    }
    notice('');
  }catch(error){if(current===revision)notice(error.message,true);}}
  async function show(next){view=next;selected=null;el('inquiry-detail').hidden=true;document.querySelectorAll('[data-panel]').forEach(n=>n.hidden=n.dataset.panel!==next);document.querySelectorAll('[data-view]').forEach(n=>n.classList.toggle('active',n.dataset.view===next));el('admin-title').textContent=next==='overview'?'Overview':next==='messages'?'Corporate inquiries':'Activity log';await load();}
  async function open(id){try{
    const record=await api('messages/'+encodeURIComponent(id));if(view!=='messages')return;selected=record;
    el('detail-subject').textContent=record.subject;el('detail-sender').textContent=record.full_name+' · '+record.company_name;el('detail-contact').textContent=record.email+' · '+record.contact_number;el('detail-message').textContent=record.message;el('detail-meta').textContent='Received '+date(record.created_at)+' · Privacy consent: '+(record.consent?'Yes':'No')+' · Reference '+record.id;el('detail-status').value=record.status;el('detail-notes').value=record.administrative_notes||'';el('inquiry-detail').hidden=false;el('detail-subject').focus();
  }catch(error){notice(error.message,true);}}
  document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>show(button.dataset.view)));
  filters.addEventListener('submit',event=>{event.preventDefault();page=1;load();});
  filters.addEventListener('reset',()=>{page=1;setTimeout(load,0);});
  el('inquiry-previous').addEventListener('click',()=>{if(page>1){page--;load();}});
  el('inquiry-next').addEventListener('click',()=>{if(page*15<total){page++;load();}});
  el('detail-close').addEventListener('click',()=>{selected=null;el('inquiry-detail').hidden=true;});
  el('inquiry-edit').addEventListener('submit',async event=>{event.preventDefault();if(!selected)return;const button=el('detail-save');button.disabled=true;try{await api('messages/'+encodeURIComponent(selected.id),'PATCH',{status:el('detail-status').value,notes:el('detail-notes').value});await load();notice('Inquiry changes saved.');}catch(error){notice(error.message,true);}finally{button.disabled=false;}});
  el('detail-delete').addEventListener('click',async()=>{if(!selected||!confirm('Permanently delete this inquiry? This cannot be undone.'))return;const button=el('detail-delete');button.disabled=true;try{await api('messages/'+encodeURIComponent(selected.id),'DELETE',{confirmation:'DELETE'});selected=null;el('inquiry-detail').hidden=true;page=1;await load();notice('Inquiry deleted.');}catch(error){notice(error.message,true);}finally{button.disabled=false;}});
  api('session').then(user=>{el('admin-account').textContent=user.email+' · '+user.role;return load();}).catch(error=>notice(error.message,true));
})();
