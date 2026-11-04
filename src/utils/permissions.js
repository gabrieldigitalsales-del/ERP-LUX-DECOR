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
export function can(action,role=currentRole()){const list=PERMISSIONS[role]||[];return list.includes('*')||list.includes(action)}
export function requirePermission(action){return{ok:can(action),role:currentRole(),action}}
export const PAGE_ACCESS={
  Administrador:['dashboard','products','stock','movements','sales','orders','cashier','clients','suppliers','purchases','finance','operations','reports','settings','intelligence'],
  Gerente:['dashboard','products','stock','movements','sales','orders','cashier','clients','suppliers','purchases','finance','operations','reports','settings','intelligence'],
  Vendedor:['dashboard','products','sales','orders','cashier','clients','operations'],
  Estoque:['dashboard','products','stock','movements','orders','purchases','suppliers'],
  Financeiro:['dashboard','finance','reports','clients','suppliers'],
  Fiscal:['dashboard','finance','products','reports']
};
export function canViewPage(page,role=currentRole()){return(PAGE_ACCESS[role]||[]).includes(page)}
