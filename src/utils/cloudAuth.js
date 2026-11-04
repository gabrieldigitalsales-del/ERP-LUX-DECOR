// Supabase Auth: a publishable key is public. Never place service_role here.
const BASE=import.meta.env.VITE_SUPABASE_URL||'';
const KEY=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||'';
const SESSION='erpluxdecor-auth-v3';
let live=null;
const assertConfigured=()=>{if(!BASE||!KEY)throw Error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY na Vercel.')};
const errorText=j=>j?.msg||j?.error_description||j?.message||j?.error||'Erro de comunicação com Supabase.';
export async function api(path,{method='GET',body,token,headers={}}={}){
 assertConfigured();
 const s=live||readSession();
 const response=await fetch(BASE+path,{
  method,headers:{apikey:KEY,Authorization:'Bearer '+(token||s?.access_token||KEY),'Content-Type':'application/json',...headers},
  body:body===undefined?undefined:JSON.stringify(body)
 });
 const raw=await response.text();let result=null;
 try{result=raw?JSON.parse(raw):null}catch{result=raw}
 if(!response.ok)throw Error(errorText(result)+' ('+response.status+')');
 return result;
}
const readSession=()=>{try{return JSON.parse(sessionStorage.getItem(SESSION)||'null')}catch{return null}};
const keep=s=>{live=s;sessionStorage.setItem(SESSION,JSON.stringify(s));return s};
export const cloudConfigured=()=>Boolean(BASE&&KEY);
export const getCloudSession=()=>live||readSession();
export function clearCloudSession(){live=null;sessionStorage.removeItem(SESSION)}
async function memberFor(access_token,userId){
 const rows=await api('/rest/v1/erpluxdecor_members?select=user_id,tenant_owner_id,username,role,must_change_password&user_id=eq.'+encodeURIComponent(userId),{token:access_token});
 return Array.isArray(rows)?rows[0]||null:null;
}
export async function restoreCloudSession(){
 const prev=getCloudSession();
 if(!prev?.refresh_token)return null;
 try{
  if(prev.expires_at>Date.now()+90000&&prev.member){live=prev;return prev}
  const auth=await api('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:prev.refresh_token},token:KEY});
  const member=await memberFor(auth.access_token,auth.user.id);
  return keep({...auth,expires_at:Date.now()+auth.expires_in*1000,member});
 }catch(e){clearCloudSession();return null}
}
export async function signInCloud(email,password){
 const auth=await api('/auth/v1/token?grant_type=password',{method:'POST',token:KEY,body:{email:email.trim().toLowerCase(),password}});
 const member=await memberFor(auth.access_token,auth.user.id);
 return keep({...auth,expires_at:Date.now()+auth.expires_in*1000,member});
}
export async function signUpCloud(email,password){
 if(password.length<10)throw Error('Use uma senha com pelo menos 10 caracteres.');
 return api('/auth/v1/signup',{method:'POST',token:KEY,body:{email:email.trim().toLowerCase(),password}});
}
export async function activateCloudAccount(username,code){
 const s=getCloudSession();if(!s?.access_token)throw Error('Entre com seu e-mail e sua senha antes de ativar o perfil.');
 const rows=await api('/rest/v1/rpc/erpluxdecor_activate_account',{method:'POST',body:{p_username:username,p_code:code},token:s.access_token});
 const member=await memberFor(s.access_token,s.user.id);
 if(!member)throw Error('Conta não habilitada no cadastro da Lux Decor.');
 const result=keep({...s,member});return result;
}
export async function changeCloudPassword(oldPassword,newPassword){
 const s=getCloudSession();if(!s?.access_token)throw Error('Sua sessão expirou.');
 if(newPassword.length<10)throw Error('A senha deve ter pelo menos 10 caracteres.');
 // Reauthenticate so a session stolen from a browser cannot silently change password.
 await api('/auth/v1/token?grant_type=password',{method:'POST',token:KEY,body:{email:s.user.email,password:oldPassword}});
 await api('/auth/v1/user',{method:'PUT',token:s.access_token,body:{password:newPassword}});
 return true;
}
export async function signOutCloud(){
 const s=getCloudSession();
 try{if(s?.access_token)await api('/auth/v1/logout',{method:'POST',token:s.access_token})}catch{}
 clearCloudSession();
}
export async function ensureFreshCloudSession(){
 const s=getCloudSession();
 if(!s)throw Error('É necessário entrar no ERP.');
 if(s.expires_at<=Date.now()+30000){
  const next=await restoreCloudSession();if(!next)throw Error('Sessão expirada. Entre novamente.');
  return next;
 }
 return s;
}
