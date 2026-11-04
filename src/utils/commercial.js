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
 const raw=localStorage.getItem(key);
 if(raw===null)return null;
 try{return JSON.parse(raw)}catch{
   try{localStorage.setItem(key+'__corrupt__'+Date.now(),raw)}catch{}
   return null;
 }
}
export function getSalespeople(){
 try{
  const current=readJson(KEY),legacy=readJson(LEGACY);
  const source=Array.isArray(current)?current:Array.isArray(legacy)?legacy:[];
  let rows=source.map(asSeller).filter(Boolean);
  if(localStorage.getItem(DEMO_CLEANED_KEY)!=='1'){
    rows=rows.filter(x=>!DEMO_NAMES.has(normalizedName(x.name)));
    localStorage.setItem(KEY,JSON.stringify(rows));
    localStorage.setItem(LEGACY,JSON.stringify(rows.filter(x=>x.active!==false).map(x=>x.name)));
    localStorage.setItem(DEMO_CLEANED_KEY,'1');
  }else if(!Array.isArray(current)){
    localStorage.setItem(KEY,JSON.stringify(rows));
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
 const before=localStorage.getItem(KEY),previousLegacy=localStorage.getItem(LEGACY);
 try{
   localStorage.setItem(KEY,payload);
   localStorage.setItem(LEGACY,legacyPayload);
   if(localStorage.getItem(KEY)!==payload||localStorage.getItem(LEGACY)!==legacyPayload){
     throw new Error('O navegador não confirmou a gravação da lista.');
   }
   localStorage.setItem(DEMO_CLEANED_KEY,'1');
 }catch(error){
   try{before===null?localStorage.removeItem(KEY):localStorage.setItem(KEY,before);
       previousLegacy===null?localStorage.removeItem(LEGACY):localStorage.setItem(LEGACY,previousLegacy)}catch{}
   throw new Error('Falha ao salvar vendedoras no navegador: '+String(error.message||error));
 }
 window.dispatchEvent(new CustomEvent('luxdecor-salespeople-updated',{detail:{count:normalized.length}}));
 return normalized;
}
export function activeSalespeople(){return getSalespeople().filter(x=>x.active!==false)}
export function sellerByName(name){return getSalespeople().find(x=>x.name===name)||null}
export function sellerCommission(name){const row=sellerByName(name);const global=Number(localStorage.getItem('luxdecor-commission-rate')||2);return row?.commission==null?global:Number(row.commission)||0}
export function sellerDiscountLimit(name,role='Vendedor'){const row=sellerByName(name);if(row?.discountLimit!=null)return Number(row.discountLimit)||0;const roleKey=`luxdecor-discount-limit-${String(role).toLowerCase()}`;const roleDefault=role==='Administrador'?100:role==='Gerente'?25:10;return Number(localStorage.getItem(roleKey)||roleDefault)}
export function verifySellerPin(name,pin){const row=sellerByName(name);return !row?.pin||String(row.pin)===String(pin||'')}
