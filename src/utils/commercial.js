import{uid}from'./ids';
const KEY='luxdecor-salespeople-v2';
const LEGACY='luxdecor-salespeople-v1';
const defaults=['Mariana Silva','Tatiane Franco'];
export function getSalespeople(){
 try{
  const current=JSON.parse(localStorage.getItem(KEY)||'null');
  if(Array.isArray(current)&&current.length)return current.map((x,i)=>typeof x==='string'?{id:uid('seller'),name:x,active:true,pin:'',commission:null,target:0,discountLimit:null}:x).filter(x=>x?.name);
  const legacy=JSON.parse(localStorage.getItem(LEGACY)||'null');
  const names=Array.isArray(legacy)&&legacy.length?legacy:defaults;
  const rows=names.map((name,i)=>({id:`seller-${i+1}`,name,active:true,pin:'',commission:null,target:0,discountLimit:null}));
  localStorage.setItem(KEY,JSON.stringify(rows));return rows;
 }catch{return defaults.map((name,i)=>({id:`seller-${i+1}`,name,active:true,pin:'',commission:null,target:0,discountLimit:null}))}
}
export function saveSalespeople(rows=[]){const clean=rows.filter(x=>x?.name?.trim()).map((x,i)=>({...x,id:x.id||uid('seller'),name:x.name.trim(),active:x.active!==false,pin:String(x.pin||'').replace(/\D/g,'').slice(0,6),commission:x.commission===''||x.commission==null?null:Number(x.commission),target:Number(x.target)||0,discountLimit:x.discountLimit===''||x.discountLimit==null?null:Number(x.discountLimit)}));localStorage.setItem(KEY,JSON.stringify(clean));localStorage.setItem(LEGACY,JSON.stringify(clean.filter(x=>x.active).map(x=>x.name)));return clean}
export function activeSalespeople(){return getSalespeople().filter(x=>x.active!==false)}
export function sellerByName(name){return getSalespeople().find(x=>x.name===name)||null}
export function sellerCommission(name){const row=sellerByName(name);const global=Number(localStorage.getItem('luxdecor-commission-rate')||2);return row?.commission==null?global:Number(row.commission)||0}
export function sellerDiscountLimit(name,role='Vendedor'){const row=sellerByName(name);if(row?.discountLimit!=null)return Number(row.discountLimit)||0;const roleKey=`luxdecor-discount-limit-${String(role).toLowerCase()}`;const roleDefault=role==='Administrador'?100:role==='Gerente'?25:10;return Number(localStorage.getItem(roleKey)||roleDefault)}
export function verifySellerPin(name,pin){const row=sellerByName(name);return !row?.pin||String(row.pin)===String(pin||'')}
