import{loginLocal,getLocalSession,logoutLocal}from'./auth';
const URL_BASE=import.meta.env.VITE_SUPABASE_URL||'';
const API_KEY=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||'';
const SESSION_KEY='erpluxdecor-cloud-session-v1';
export const CLOUD_AUTH_ENABLED=import.meta.env.VITE_ERPLUXDECOR_AUTH_MODE==='cloud';
const accountEmails={admin:'admin@erpluxdecor.example',administrador:'admin@erpluxdecor.example',vendedor:'vendedor@erpluxdecor.example',financeiro:'financeiro@erpluxdecor.example'};
function configured(){if(!URL_BASE||!API_KEY)throw Error('Conexão Supabase não configurada.')}
async function call(path,{method='GET',token,body}={}){
 configured();const response=await fetch(URL_BASE+path,{method,headers:{apikey:API_KEY,Authorization:'Bearer '+(token||API_KEY),'Content-Type':'application/json',Prefer:'return=representation'},body:body===undefined?undefined:JSON.stringify(body)});
 const json=await response.json().catch(()=>null);
 if(!response.ok)throw Error(json?.msg||json?.error_description||json?.message||json?.error||'Falha de comunicação com Supabase.');
 return json;
}
function saveSession(session){sessionStorage.setItem(SESSION_KEY,JSON.stringify(session));return session;}
export async function loginSession(username,password){
 if(!CLOUD_AUTH_ENABLED){const user=loginLocal(username,password);if(!user)throw Error('Usuário ou senha inválidos.');return user;}
 const clean=String(username||'').toLowerCase().trim();const email=accountEmails[clean];
 if(!email)throw Error('Usuário não cadastrado na Lux Decor.');
 const auth=await call('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}});
 const rows=await call('/rest/v1/erpluxdecor_members?select=user_id,tenant_owner_id,username,role,must_change_password&user_id=eq.'+encodeURIComponent(auth.user?.id),{token:auth.access_token});
 const member=Array.isArray(rows)?rows[0]:null;
 if(!member)throw Error('Usuário sem autorização para acessar o ERP Lux Decor.');
 const session={username:member.username,role:member.role,name:member.username,tenantOwnerId:member.tenant_owner_id,userId:member.user_id,mustChangePassword:member.must_change_password,accessToken:auth.access_token,refreshToken:auth.refresh_token,expiresAt:Date.now()+(Number(auth.expires_in)||3600)*1000};
 return saveSession(session);
}
export function getSession(){
 if(!CLOUD_AUTH_ENABLED)return getLocalSession();
 try{const s=JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null');if(!s?.accessToken||!s?.role||!s?.tenantOwnerId)return null;if(s.expiresAt&&Date.now()>s.expiresAt){sessionStorage.removeItem(SESSION_KEY);return null;}return s;}catch{return null;}
}
export async function logoutSession(){
 if(!CLOUD_AUTH_ENABLED){logoutLocal();return;}
 const s=getSession();sessionStorage.removeItem(SESSION_KEY);
 if(s?.accessToken)try{await call('/auth/v1/logout',{method:'POST',token:s.accessToken})}catch{}
}
export async function changeCloudPassword({oldPassword,newPassword}){
 if(!CLOUD_AUTH_ENABLED)throw Error('A alteração central de senha requer o login Supabase.');
 const s=getSession();if(!s?.accessToken)throw Error('Sessão expirada. Faça login novamente.');
 if(String(newPassword).length<10)throw Error('A nova senha deve ter pelo menos 10 caracteres.');
 if(newPassword===oldPassword||newPassword==='asd123')throw Error('Escolha uma senha diferente da senha inicial.');
 const email=accountEmails[s.username];if(!email)throw Error('Conta não identificada.');
 await call('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password:oldPassword}});
 await call('/auth/v1/user',{method:'PUT',token:s.accessToken,body:{password:newPassword}});
 await call('/rest/v1/erpluxdecor_members?user_id=eq.'+encodeURIComponent(s.userId),{method:'PATCH',token:s.accessToken,body:{must_change_password:false}});
 saveSession({...s,mustChangePassword:false});return true;
}
