import{getLocalSession}from'./auth';import{cloudConfigured,getCloudSession}from'./cloudAuth';
export const PERMISSIONS={
  Administrador:['*'],
  Gerente:['sales.create','sales.cancel','stock.move','stock.inventory','cash.open','cash.move','cash.close','purchase.receive','finance.write','fiscal.prepare','products.write','products.cost.view','reports.view'],
  Vendedor:['sales.create','cash.open','cash.close','products.view','stock.view','clients.write'],
  Estoque:['stock.move','stock.inventory','products.view','purchase.receive'],
  Financeiro:['finance.write','fiscal.prepare','reports.view','products.cost.view'],
  Fiscal:['fiscal.prepare','reports.view']
};
export function currentRole(){if(cloudConfigured())return getCloudSession()?.member?.role||'Sem acesso';return getLocalSession()?.role||'Sem acesso'}
const actionPage={
 'sales.create':'sales','sales.cancel':'sales','stock.move':'stock','stock.inventory':'stock',
 'cash.open':'cashier','cash.move':'cashier','cash.close':'cashier',
 'purchase.receive':'purchases','finance.write':'finance','fiscal.prepare':'finance',
 'products.write':'products','products.view':'products','stock.view':'stock',
 'clients.write':'clients','products.cost.view':'products','reports.view':'reports'
};
export function can(action,role=currentRole()){
 const member=cloudConfigured()?getCloudSession()?.member:null;
 if(member?.is_active===false)return false;
 const list=PERMISSIONS[role]||[];
 if(!(list.includes('*')||list.includes(action)))return false;
 const page=actionPage[action];
 if(member&&member.role===role&&Array.isArray(member.page_access)&&page&&!member.page_access.includes(page)){
  if(action==='products.cost.view'&&member.page_access.includes('finance'))return true;
  return false;
 }
 return true;
}
export function requirePermission(action){return{ok:can(action),role:currentRole(),action}}
export const PAGE_ACCESS={
  Administrador:['dashboard','products','stock','movements','sales','orders','cashier','clients','suppliers','finance','operations','reports','settings','intelligence'],
  Gerente:['dashboard','products','stock','movements','sales','orders','cashier','clients','suppliers','purchases','finance','operations','reports','settings','intelligence'],
  Vendedor:['dashboard','products','sales','orders','cashier','clients','operations'],
  Estoque:['dashboard','products','stock','movements','orders','purchases','suppliers'],
  Financeiro:['dashboard','finance','reports','clients','suppliers'],
  Fiscal:['dashboard','finance','products','reports']
};
export function canViewPage(page,role=currentRole()){if(page==='purchases')return false;const member=cloudConfigured()?getCloudSession()?.member:null;if(member&&member.is_active===false)return false;if(member&&Array.isArray(member.page_access)&&member.role===role)return member.page_access.includes(page);return(PAGE_ACCESS[role]||[]).includes(page)}
