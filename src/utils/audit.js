import{erpStorage}from'./storage';
import{getLocalSession}from'./auth';
import{uid}from'./ids';
export function addAudit(action,module,detail='',changes=null){
  try{
    const raw=JSON.parse(erpStorage.getItem('luxdecor-audit-log')||'[]');const items=Array.isArray(raw)?raw:[];const session=getLocalSession();
    items.unshift({id:uid('audit'),at:new Date().toISOString(),user:session?.username||session?.name||session?.role||'Sistema',role:session?.role||'Sistema',action,module,detail,changes});
    erpStorage.setItem('luxdecor-audit-log',JSON.stringify(items.slice(0,1500)));
  }catch{}
}
export function auditChange(action,module,before,after,detail=''){addAudit(action,module,detail,{before,after})}
export function getAudit(){try{const v=JSON.parse(erpStorage.getItem('luxdecor-audit-log')||'[]');return Array.isArray(v)?v:[]}catch{return[]}}
