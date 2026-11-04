import{api,ensureFreshCloudSession,getCloudSession}from'../utils/cloudAuth';

// The cloud is authoritative. This map is only an in-memory working copy.
const records=new Map(),versions=new Map(),listeners=new Set();
let loaded=false,queue=Promise.resolve(),lastError=null,syncing=0;
const show=(status,message='')=>{
 window.dispatchEvent(new CustomEvent('erpluxdecor-cloud-status',{detail:{status,message}}));
 for(const fn of listeners)fn({status,message});
};
export const cloudReady=()=>loaded;
export const cloudError=()=>lastError;
export const subscribeCloud=fn=>{listeners.add(fn);return()=>listeners.delete(fn)};
export const erpCloudStorage={
 getItem:key=>records.has(key)?records.get(key):null,
 setItem:(key,value)=>{if(!loaded)throw Error('Banco não foi carregado.');const raw=String(value);if(records.get(key)===raw)return Promise.resolve();records.set(key,raw);return queueCloudWrite({[key]:raw})},
 removeItem:key=>{if(!loaded)throw Error('Banco não foi carregado.');records.delete(key);return queueCloudWrite({[key]:null})},
 key:index=>[...records.keys()][index]||null,
 get length(){return records.size}
};
export async function loadCloudDocuments(){
 const session=await ensureFreshCloudSession();if(!session.member?.tenant_owner_id)throw Error('Ative o perfil da Lux Decor.');
 const page=await api('/rest/v1/erpluxdecor_documents?select=document_key,document_value,revision&tenant_owner_id=eq.'+encodeURIComponent(session.member.tenant_owner_id)+'&limit=1000',{token:session.access_token});
 records.clear();versions.clear();
 for(const doc of page||[]){records.set(doc.document_key,doc.document_value===null?null:String(doc.document_value));versions.set(doc.document_key,Number(doc.revision)||0)}
 lastError=null;loaded=true;show('ready');window.dispatchEvent(new CustomEvent('erpluxdecor-cloud-reloaded'));return records.size;
}
export async function commitCloudDocuments(changes={}){
 if(!loaded)throw Error('O banco ainda não foi carregado.');
 const s=await ensureFreshCloudSession();
 const expected=Object.fromEntries(Object.keys(changes).map(k=>[k,versions.get(k)||0]));
 syncing++;show('saving');
 try{
  const updated=await api('/rest/v1/rpc/erpluxdecor_save_documents',{method:'POST',body:{p_changes:changes,p_expected:expected},token:s.access_token});
  for(const [k,v] of Object.entries(changes)){if(v===null)records.delete(k);else records.set(k,String(v));versions.set(k,updated[k]||((versions.get(k)||0)+1))}
  lastError=null;return updated;
 }catch(error){
  lastError=error;show('error',error.message);throw error;
 }finally{syncing--;if(syncing===0&&!lastError)show('saved')}
}
export function queueCloudWrite(changes={}){
 queue=queue.catch(()=>{}).then(()=>commitCloudDocuments(changes));
 // A remote rejection is visible, never presented as confirmed.
 queue.catch(err=>{console.error('Falha ao persistir no Supabase:',err)});
 return queue;
}
export async function flushCloudWrites(){await queue;if(lastError)throw lastError}
export function clearCloudDocuments(){records.clear();versions.clear();loaded=false;lastError=null;queue=Promise.resolve();show('disconnected')}
export async function importLegacyDocuments(keys=[]){
 if(getCloudSession()?.member?.role!=='Administrador')throw Error('Apenas o administrador pode importar cadastros.');
 const selections={};
 for(const key of keys){
  const raw=window.localStorage.getItem(key);
  if(raw!==null&&(!records.has(key)||records.get(key)===null))selections[key]=raw;
 }
 const batch=Object.entries(selections);
 if(!batch.length)return{inserted:0};
 for(let i=0;i<batch.length;i+=25)await commitCloudDocuments(Object.fromEntries(batch.slice(i,i+25)));
 return{inserted:batch.length};
}
export function availableLegacyKeys(){
 const keys=[];
 for(let i=0;i<window.localStorage.length;i++){
  const k=window.localStorage.key(i);
  if(k&&(k.startsWith('luxdecor-')||k.startsWith('luxdecorerp-'))&&!k.includes('__snapshot__')&&
     !k.startsWith('luxdecor-auth')&&!k.includes('app-schema-version'))keys.push(k);
 }
 return keys;
}
