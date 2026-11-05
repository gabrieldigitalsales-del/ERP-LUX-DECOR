import{getLocalSession}from'./auth';
import{cloudConfigured,getCloudSession}from'./cloudAuth';

// ERP familiar: todos os usuários habilitados têm os mesmos acessos operacionais.
// A autenticação e as políticas do Supabase continuam isolando os dados da empresa.
export const PERMISSIONS={
 Administrador:['*'],Gerente:['*'],Vendedor:['*'],Estoque:['*'],Financeiro:['*'],Fiscal:['*']
};
export function currentRole(){
 if(cloudConfigured())return getCloudSession()?.member?.role||'Sem acesso';
 return getLocalSession()?.role||'Sem acesso';
}
const isAuthorized=()=>{
 if(!cloudConfigured())return Boolean(getLocalSession());
 const session=getCloudSession();
 return Boolean(session?.access_token&&session?.member?.tenant_owner_id&&session.member.is_active!==false);
};
export function can(_action){return isAuthorized()}
export function requirePermission(action){return{ok:can(action),role:currentRole(),action}}
export const PAGE_ACCESS={
 Administrador:['*'],Gerente:['*'],Vendedor:['*'],Estoque:['*'],Financeiro:['*'],Fiscal:['*']
};
export function canViewPage(page){
 // A aba Compras continua removida a pedido da empresa.
 if(page==='purchases')return false;
 return isAuthorized();
}
