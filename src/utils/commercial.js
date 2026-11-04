import{uid}from'./ids';
const KEY='luxdecor-salespeople-v2';
const LEGACY='luxdecor-salespeople-v1';
const defaults=['Mariana Silva','Tatiane Franco'];
export function getSalespeople(){
 try{
  const current=JSON.parse(localStorage.getItem(KEY)||'null');
  if(Array.isArray(current))return current.map((x,i)=>typeof x==='string'?{id:uid('seller'),name:x,active:true,pin:'',commission:null,target:0,discountLimit:null}:x).filter(x=>x?.name);
  const legacy=JSON.parse(localStorage.getItem(LEGACY)||'null');
  const names=Array.isArray(legacy)&&legacy.length?legacy:defaults;
  const rows=names.map((name,i)=>({id:`seller-${i+1}`,name,active:true,pin:'',commission:null,target:0,discountLimit:null}));
  localStorage.setItem(KEY,JSON.stringify(rows));return rows;
 }catch{return defaults.map((name,i)=>({id:`seller-${i+1}`,name,active:true,pin:'',commission:null,target:0,discountLimit:null}))}
}
export function saveSalespeople(rows=[]){
 if(!Array.isArray(rows))throw new Error('Lista de vendedoras inválida.');
 const normalized=rows.map((x,i)=>({...x,id:x.id||uid('seller'),name:String(x.name||'').trim(),active:x.active!==false,pin:String(x.pin||'').replace(/\\D/g,'').slice(0,6),commission:x.commission===''||x.commission==null?null:Number(x.commission),target:Number(x.target)||0,discountLimit:x.discountLimit===''||x.discountLimit==null?null:Number(x.discountLimit)}));
 if(normalized.some(x=>!x.name))throw new Error('Preencha o nome de todas as vendedoras antes de salvar.');
 const names=normalized.map(x=>x.name.toLocaleLowerCase('pt-BR'));
 if(new Set(names).size!==names.length)throw new Error('Existem vendedoras com nomes repetidos.');
 const payload=JSON.stringify(normalized);
 localStorage.setItem(KEY,payload);
 const verify=localStorage.getItem(KEY);
 if(verify!==payload)throw new Error('O navegador não confirmou o salvamento das vendedoras.');
 localStorage.setItem(LEGACY,JSON.stringify(normalized.filter(x=>x.active).map(x=>x.name)));
 window.dispatchEvent(new CustomEvent('luxdecor-salespeople-updated',{detail:{count:normalized.length}}));
 return normalized;
}
export function activeSalespeople(){return getSalespeople().filter(x=>x.active!==false)}
export function sellerByName(name){return getSalespeople().find(x=>x.name===name)||null}
export function sellerCommission(name){const row=sellerByName(name);const global=Number(localStorage.getItem('luxdecor-commission-rate')||2);return row?.commission==null?global:Number(row.commission)||0}
export function sellerDiscountLimit(name,role='Vendedor'){const row=sellerByName(name);if(row?.discountLimit!=null)return Number(row.discountLimit)||0;const roleKey=`luxdecor-discount-limit-${String(role).toLowerCase()}`;const roleDefault=role==='Administrador'?100:role==='Gerente'?25:10;return Number(localStorage.getItem(roleKey)||roleDefault)}
export function verifySellerPin(name,pin){const row=sellerByName(name);return !row?.pin||String(row.pin)===String(pin||'')}
