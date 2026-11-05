import{erpStorage}from'./storage';
import{cloudConfigured,getCloudSession}from'./cloudAuth';
import{uid}from'./ids';
const KEY='luxdecor-salespeople-v2';
const LEGACY='luxdecor-salespeople-v1';
// Nunca criar cadastros fictícios em produção.
const DEMO_CLEANED_KEY='luxdecor-salespeople-demo-cleaned-v1';
const DEMO_NAMES=new Set(['mariana silva','tatiane franco']);
const normalizedName=value=>String(value??'').trim().toLocaleLowerCase('pt-BR');
const asSeller=(value,index)=>{
 const row=typeof value==='string'?{name:value}:value;
 if(!row||typeof row!=='object')return null;
 const name=String(row.name??'').trim();
 if(!name)return null;
 return{...row,id:row.id||'seller-'+(index+1),name,active:row.active!==false,pin:String(row.pin||'').replace(/\D/g,'').slice(0,6),commission:row.commission??null,target:Number(row.target)||0,discountLimit:row.discountLimit??null};
};
function readJson(key){
 const raw=erpStorage.getItem(key);
 if(raw===null)return null;
 try{return JSON.parse(raw)}catch{
   try{erpStorage.setItem(key+'__corrupt__'+Date.now(),raw)}catch{}
   return null;
 }
}
export function getSalespeople(){
 try{
  const current=readJson(KEY),legacy=readJson(LEGACY);
  const source=Array.isArray(current)?current:Array.isArray(legacy)?legacy:[];
  let rows=source.map(asSeller).filter(Boolean);
  // Também limpa backups antigos restaurados após a migração inicial.
  const seededDemo=x=>DEMO_NAMES.has(normalizedName(x.name))&&['seller-1','seller-2'].includes(String(x.id));
  const foundSeeded=rows.some(seededDemo);
  rows=rows.filter(x=>!seededDemo(x));
  if((!cloudConfigured()||Boolean(getCloudSession()?.member?.tenant_owner_id))&&(erpStorage.getItem(DEMO_CLEANED_KEY)!=='1'||foundSeeded)){
    erpStorage.setItem(KEY,JSON.stringify(rows));
    erpStorage.setItem(LEGACY,JSON.stringify(rows.filter(x=>x.active!==false).map(x=>x.name)));
    erpStorage.setItem(DEMO_CLEANED_KEY,'1');
  }else if(!Array.isArray(current)&&(!cloudConfigured()||Boolean(getCloudSession()?.member?.tenant_owner_id))){
    erpStorage.setItem(KEY,JSON.stringify(rows));
  }
  return rows;
 }catch(error){
  console.error('Não foi possível ler o cadastro de vendedoras:',error);
  return[];
 }
}
export function saveSalespeople(rows=[]){
 if(!Array.isArray(rows))throw new Error('Lista de vendedoras inválida.');
 const normalized=rows.map((x,i)=>({
   ...x,id:x.id||uid('seller'),name:String(x.name||'').trim(),
   active:x.active!==false,pin:String(x.pin||'').replace(/\D/g,'').slice(0,6),
   commission:x.commission===''||x.commission==null?null:Number(x.commission),
   target:Number(x.target)||0,
   discountLimit:x.discountLimit===''||x.discountLimit==null?null:Number(x.discountLimit)
 }));
 if(normalized.some(x=>!x.name))throw new Error('Preencha o nome de todas as vendedoras antes de salvar.');
 const names=normalized.map(x=>normalizedName(x.name));
 if(new Set(names).size!==names.length)throw new Error('Existem vendedoras com nomes repetidos.');
 const payload=JSON.stringify(normalized);
 const legacyPayload=JSON.stringify(normalized.filter(x=>x.active).map(x=>x.name));
 const before=erpStorage.getItem(KEY),previousLegacy=erpStorage.getItem(LEGACY);
 try{
   erpStorage.setItem(KEY,payload);
   erpStorage.setItem(LEGACY,legacyPayload);
   if(erpStorage.getItem(KEY)!==payload||erpStorage.getItem(LEGACY)!==legacyPayload){
     throw new Error('A lista não foi confirmada no armazenamento.');
   }
   erpStorage.setItem(DEMO_CLEANED_KEY,'1');
 }catch(error){
   try{before===null?erpStorage.removeItem(KEY):erpStorage.setItem(KEY,before);
       previousLegacy===null?erpStorage.removeItem(LEGACY):erpStorage.setItem(LEGACY,previousLegacy)}catch{}
   throw new Error('Falha ao salvar vendedoras: '+String(error.message||error));
 }
 window.dispatchEvent(new CustomEvent('luxdecor-salespeople-updated',{detail:{count:normalized.length}}));
 return normalized;
}
export function activeSalespeople(){return getSalespeople().filter(x=>x.active!==false)}
export function sellerByName(name){return getSalespeople().find(x=>x.name===name)||null}
export function sellerCommission(name){const row=sellerByName(name);const global=Number(erpStorage.getItem('luxdecor-commission-rate')||2);return row?.commission==null?global:Number(row.commission)||0}
export function sellerDiscountLimit(name,role='Vendedor'){const row=sellerByName(name);if(row?.discountLimit!=null)return Number(row.discountLimit)||0;const roleKey=`luxdecor-discount-limit-${String(role).toLowerCase()}`;const roleDefault=role==='Administrador'?100:role==='Gerente'?25:10;return Number(erpStorage.getItem(roleKey)||roleDefault)}
export function verifySellerPin(name,pin){const row=sellerByName(name);return !row?.pin||String(row.pin)===String(pin||'')}
