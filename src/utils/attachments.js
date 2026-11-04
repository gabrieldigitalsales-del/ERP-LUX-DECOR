import{api,getCloudSession,ensureFreshCloudSession,cloudConfigured}from'./cloudAuth';
const BUCKET='erpluxdecor-files',BASE=import.meta.env.VITE_SUPABASE_URL||'',API_KEY=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||'';
const DB_NAME='luxdecorerp-attachments',STORE='files',VERSION=1;
function dbOpen(){return new Promise((resolve,reject)=>{if(!('indexedDB'in window))return reject(new Error('IndexedDB indisponível'));const req=indexedDB.open(DB_NAME,VERSION);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'id'})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function legacyList(){
 try{const db=await dbOpen();return await new Promise((resolve,reject)=>{const req=db.transaction(STORE).objectStore(STORE).getAll();req.onsuccess=()=>resolve(req.result||[]);req.onerror=()=>reject(req.error)})}catch{return[]}
}
export const listLegacyLocalAttachments=legacyList;
function legacyPut(row){return dbOpen().then(db=>new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(row);tx.oncomplete=()=>resolve(row.id);tx.onerror=()=>reject(tx.error)}))}
function legacyGet(id){return dbOpen().then(db=>new Promise((resolve,reject)=>{const req=db.transaction(STORE).objectStore(STORE).get(id);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error)}))}
async function legacyDelete(id){try{const db=await dbOpen();return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(id);tx.oncomplete=()=>resolve(true);tx.onerror=()=>reject(tx.error)})}catch{return false}}
async function requestObject(path,options={}){
 const s=await ensureFreshCloudSession();
 const response=await fetch(BASE+'/storage/v1/object/'+path,{...options,headers:{apikey:API_KEY,Authorization:'Bearer '+s.access_token,...options.headers}});
 if(!response.ok){const t=await response.text();throw Error('Falha no armazenamento Supabase: '+t.slice(0,220))}
 return response;
}
const fullPath=p=>p.split('/').map(encodeURIComponent).join('/');
export async function putAttachment({id,name,type,dataUrl,module,recordId}){
 if(!cloudConfigured())return legacyPut({id,name,type,dataUrl,module,recordId,createdAt:new Date().toISOString()});
 const s=await ensureFreshCloudSession();if(s.member?.role!=='Administrador')throw Error('Somente o administrador pode incluir anexos no momento.');
 if(!id||!dataUrl)throw Error('Arquivo inválido ou vazio.');
 const blob=await fetch(dataUrl).then(r=>r.blob());
 if(blob.size>20971520)throw Error('Tamanho máximo: 20 MB por arquivo.');
 const objectPath=s.member.tenant_owner_id+'/'+encodeURIComponent(id);
 await requestObject(BUCKET+'/'+fullPath(objectPath),{method:'POST',headers:{'Content-Type':type||blob.type||'application/octet-stream','cache-control':'3600'},body:blob});
 try{
  await api('/rest/v1/erpluxdecor_attachments',{method:'POST',body:{id,tenant_owner_id:s.member.tenant_owner_id,object_path:objectPath,filename:name||'Arquivo',content_type:type||blob.type||'',module:module||'',record_id:recordId||'',file_size:blob.size},token:s.access_token});
 }catch(error){
  try{await requestObject(BUCKET+'/'+fullPath(objectPath),{method:'DELETE'})}catch{}
  throw error;
 }
 return id;
}
export async function getAttachment(id){
 if(!id)return null;
 if(!cloudConfigured())return legacyGet(id);
 const s=await ensureFreshCloudSession();
 const rows=await api('/rest/v1/erpluxdecor_attachments?select=*&tenant_owner_id=eq.'+s.member.tenant_owner_id+'&id=eq.'+encodeURIComponent(id),{token:s.access_token});
 if(!rows?.length)return null;
 const row=rows[0];
 const blob=await requestObject('authenticated/'+BUCKET+'/'+fullPath(row.object_path)).then(r=>r.blob());
 const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob)});
 return{id:row.id,name:row.filename,type:row.content_type,dataUrl,module:row.module,recordId:row.record_id,createdAt:row.created_at};
}
export async function listAttachments(){
 if(!cloudConfigured())return( await legacyList()).sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
 const s=await ensureFreshCloudSession();
 const rows=await api('/rest/v1/erpluxdecor_attachments?select=*&tenant_owner_id=eq.'+s.member.tenant_owner_id+'&order=created_at.desc&limit=1000',{token:s.access_token});
 return (rows||[]).map(r=>({id:r.id,name:r.filename,type:r.content_type,module:r.module,recordId:r.record_id,createdAt:r.created_at,bytes:r.file_size,objectPath:r.object_path}));
}
export async function deleteAttachment(id){
 if(!cloudConfigured())return legacyDelete(id);
 const s=await ensureFreshCloudSession();if(s.member?.role!=='Administrador')return false;
 const rows=await api('/rest/v1/erpluxdecor_attachments?select=object_path&tenant_owner_id=eq.'+s.member.tenant_owner_id+'&id=eq.'+encodeURIComponent(id),{token:s.access_token});
 if(!rows?.length)return false;
 await requestObject(BUCKET+'/'+fullPath(rows[0].object_path),{method:'DELETE'});
 await api('/rest/v1/erpluxdecor_attachments?tenant_owner_id=eq.'+s.member.tenant_owner_id+'&id=eq.'+encodeURIComponent(id),{method:'DELETE',token:s.access_token});
 return true;
}
export async function countAttachments(){return(await listAttachments()).length}
export async function attachmentStorageEstimate(){const rows=await listAttachments();return{count:rows.length,bytes:rows.reduce((s,r)=>s+(Number(r.bytes)||String(r.dataUrl||'').length),0)}}
