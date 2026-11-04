import {compactProduct,hydrateProduct} from '../data/masterData';
import {cloudConfigured} from './cloudAuth';
import {erpCloudStorage,cloudReady,commitCloudDocuments,queueCloudWrite,flushCloudWrites} from '../services/cloudStore';
const businessStorage=()=>cloudConfigured()?erpCloudStorage:localStorage;
export const erpStorage={
 getItem:key=>businessStorage().getItem(key),
 setItem:(key,value)=>businessStorage().setItem(key,value),
 removeItem:key=>businessStorage().removeItem(key),
 key:index=>businessStorage().key(index),
 get length(){return businessStorage().length}
};
import {mergeLuxInventory} from '../data/luxInventory';
const masterSuppliers=[];
const LEGACY_PREFIX='luxdecor-';
const ERP_PREFIX='luxdecorerp-';
const VERSION_KEY='luxdecor-app-schema-version';
export const APP_SCHEMA_VERSION='2.20.0';
const isHomeKey=k=>Boolean(k&&(k.startsWith(LEGACY_PREFIX)||k.startsWith(ERP_PREFIX)));

export function safeRead(key,fallback){
  try{
    const raw=businessStorage().getItem(key);
    if(raw===null)return fallback;
    return JSON.parse(raw);
  }catch(err){
    try{localStorage.setItem(`${key}__corrupt__${Date.now()}`,localStorage.getItem(key)||'')}catch{}
    console.warn('Falha ao ler armazenamento local:',key,err);
    return fallback;
  }
}
export function safeReadArray(key,fallback=[]){
  const value=safeRead(key,fallback);
  if(Array.isArray(value)){const rows=value.filter(Boolean);return key==='luxdecor-products-v12'?rows.map(hydrateProduct):rows;}
  try{const raw=localStorage.getItem(key);if(raw!==null)localStorage.setItem(`${key}__invalid_shape__${Date.now()}`,raw)}catch{}
  return Array.isArray(fallback)?fallback.filter(Boolean):[];
}
export function safeWrite(key,value){
  if(cloudConfigured()&&key==='luxdecor-notifications-v12')return true;
  try{
    if(cloudConfigured()&&!cloudReady())throw Error('Banco remoto ainda não carregado.');
    const payload=key==='luxdecor-products-v12'&&Array.isArray(value)?value.map(compactProduct):value;
    const raw=JSON.stringify(payload);
    if(cloudConfigured()){
      if(erpCloudStorage.getItem(key)!==raw)void queueCloudWrite({[key]:raw});
    }else localStorage.setItem(key,raw);
    return true;
  }catch(err){
    console.error('Falha ao salvar armazenamento local:',key,err);
    try{window.dispatchEvent(new CustomEvent('luxdecor-storage-error',{detail:{key,message:String(err?.message||err)}}))}catch{}
    return false;
  }
}
export function homeStorageEntries(){
  const storage={};
  try{const source=businessStorage();for(let i=0;i<source.length;i++){const k=source.key(i);if(isHomeKey(k)&&!k.includes('__snapshot__'))storage[k]=source.getItem(k)}}catch{}
  return storage;
}
export function createLocalSnapshot(label='auto'){
  if(cloudConfigured())return null; // On cloud, documents are versioned in Postgres.
  try{
    const key=`luxdecor__snapshot__${Date.now()}`;
    sessionStorage.setItem(key,JSON.stringify({label,at:new Date().toISOString(),storage:homeStorageEntries()}));
    const snapshots=Object.keys(sessionStorage).filter(k=>k.startsWith('luxdecor__snapshot__')).sort();
    while(snapshots.length>8)sessionStorage.removeItem(snapshots.shift());
    return key;
  }catch{return null}
}
function migrateTo2120(){
  const finance=safeReadArray('luxdecor-finance-v12',[]).map((x,i)=>({
    ...x,id:x?.id??`fin-legacy-${i}`,accountId:x?.accountId||'',paidAmount:Number(x?.paidAmount)||0,
    status:['paid','partial','cancelled','open'].includes(String(x?.status||'').toLowerCase())?String(x.status).toLowerCase():(String(x?.status||'').toLowerCase()==='pago'?'paid':'open')
  }));
  safeWrite('luxdecor-finance-v12',finance);
  for(const key of ['luxdecorerp-fin-natures-v211','luxdecorerp-fin-budget-v211','luxdecorerp-bills-v211','luxdecorerp-bank-rows-v211','luxdecorerp-fin-closing-v211']){
    const value=safeRead(key,[]);if(!Array.isArray(value))safeWrite(key,[]);
  }
}

function hasTestMarker(...parts){return /\b(teste|test|placeholder|exemplo)\b/i.test(parts.map(x=>String(x??'')).join(' '))}
function cleanDemoAndTestData(){
  const rawSales=safeReadArray('luxdecor-sales-v12',[]);
  const rawPurchases=safeReadArray('luxdecor-purchases-v12',[]);
  const demoSaleIds=new Set(rawSales.filter(x=>x&&(hasTestMarker(x.client,x.status,x.notes,x.origin)||((x.id===1047&&x.client==='Carlos Andrade')||(x.id===1048&&x.client==='Mariana Lopes')))).map(x=>String(x.id)));
  const demoPurchaseIds=new Set(rawPurchases.filter(x=>x&&(hasTestMarker(x.supplier,x.status,x.notes,x.origin)||((x.id===200&&x.supplier==='Design Brasil')||(x.id===201&&x.supplier==='Bella Casa')))).map(x=>String(x.id)));
  const clients=safeReadArray('luxdecor-clients-v12',[]).filter(x=>x&&!hasTestMarker(x.name,x.doc,x.email,x.notes)&&!((x.id===1&&x.name==='Mariana Lopes')||(x.id===2&&x.name==='Carlos Andrade')));
  const suppliers=safeReadArray('luxdecor-suppliers-v12',[]).filter(x=>x&&!hasTestMarker(x.name,x.doc,x.email,x.notes)&&!(['Bella Casa','Estofados Minas','Design Brasil'].includes(String(x.name||''))&&/^\d{2}\./.test(String(x.doc||x.cnpj||''))));
  const sales=rawSales.filter(x=>x&&!demoSaleIds.has(String(x.id)));
  const purchases=rawPurchases.filter(x=>x&&!demoPurchaseIds.has(String(x.id)));
  const finance=safeReadArray('luxdecor-finance-v12',[]).filter(x=>{if(!x||hasTestMarker(x.desc,x.category,x.origin,x.notes))return false;const o=String(x.origin||'');if(demoSaleIds.has(o.replace(/^cash-sale:|^sale:/,'')))return false;if(demoPurchaseIds.has(o.replace(/^purchase:/,'')))return false;if([1,2,3,4].includes(x.id)&&['sale:1048','purchase:201','manual','sale:1047'].includes(o))return false;return true});
  const invoices=safeReadArray('luxdecor-nf-docs-v16',[]).filter(x=>x&&!hasTestMarker(x.client,x.status,x.notes)&&!demoSaleIds.has(String(x.saleId||'')));
  const movements=safeReadArray('luxdecor-stock-log-v16',[]).filter(x=>x&&!hasTestMarker(x.product,x.origin,x.note)&&![...demoSaleIds].some(id=>String(x.origin||'').includes(id))&&![...demoPurchaseIds].some(id=>String(x.origin||'').includes(id)));
  const notifications=safeReadArray('luxdecor-notifications-v12',[]).filter(x=>x&&!hasTestMarker(x.title,x.text,x.message,x.desc));
  const cashLog=safeReadArray('luxdecor-cash-log-v23',[]).filter(x=>x&&!hasTestMarker(x.label,x.desc,x.operator,x.note)&&![...demoSaleIds].some(id=>String(x.saleId||x.origin||'').includes(id)));
  const supplierNames=new Set(suppliers.map(x=>String(x.name||'').trim().toLocaleLowerCase('pt-BR')));
  for(const supplier of masterSuppliers){const k=String(supplier.name||'').trim().toLocaleLowerCase('pt-BR');if(k&&!supplierNames.has(k)){suppliers.push(supplier);supplierNames.add(k)}}
  safeWrite('luxdecor-clients-v12',clients);safeWrite('luxdecor-suppliers-v12',suppliers);safeWrite('luxdecor-finance-v12',finance);safeWrite('luxdecor-sales-v12',sales);safeWrite('luxdecor-purchases-v12',purchases);safeWrite('luxdecor-nf-docs-v16',invoices);safeWrite('luxdecor-stock-log-v16',movements);safeWrite('luxdecor-notifications-v12',notifications);safeWrite('luxdecor-cash-log-v23',cashLog);
  return {clients:clients.length,suppliers:suppliers.length,finance:finance.length,sales:sales.length,purchases:purchases.length,invoices:invoices.length,movements:movements.length,notifications:notifications.length,cashLog:cashLog.length};
}
function migrateTo2132(){
  const before={finance:safeReadArray('luxdecor-finance-v12',[]).length,sales:safeReadArray('luxdecor-sales-v12',[]).length,purchases:safeReadArray('luxdecor-purchases-v12',[]).length};
  const cleaned=cleanDemoAndTestData();
  safeWrite('luxdecorerp-cleanup-report-v2132',{at:new Date().toISOString(),before,after:cleaned,note:'Limpeza de dados demo/teste/placeholders antes do uso real. Produtos da base mestra e cadastros reais são preservados.'});
}

function migrateTo2133(){
  const products=safeReadArray('luxdecor-products-v12',[]);
  const productIds=new Set(products.map(p=>String(p?.id??'')));
  const sales=safeReadArray('luxdecor-sales-v12',[]);
  const invalidSales=sales.filter(s=>{
    const items=Array.isArray(s?.items)?s.items.filter(Boolean):[];
    if(!items.length)return true;
    return items.some(i=>!productIds.has(String(i?.productId??'')));
  });
  const invalidIds=new Set(invalidSales.map(s=>String(s.id)));
  if(!invalidIds.size){safeWrite('luxdecorerp-invalid-sales-cleanup-v2133',{at:new Date().toISOString(),removed:0,ids:[],note:'Nenhuma venda com produto inexistente encontrada.'});return}
  const keptSales=sales.filter(s=>!invalidIds.has(String(s.id)));
  const finance=safeReadArray('luxdecor-finance-v12',[]).filter(f=>{const o=String(f?.origin||'');return ![...invalidIds].some(id=>o===`sale:${id}`||o===`cash-sale:${id}`)});
  const invoices=safeReadArray('luxdecor-nf-docs-v16',[]).filter(n=>!invalidIds.has(String(n?.saleId??'')));
  const movements=safeReadArray('luxdecor-stock-log-v16',[]).filter(m=>![...invalidIds].some(id=>String(m?.origin||'').includes(`Venda #${id}`)||String(m?.origin||'').includes(`venda #${id}`)));
  const cashLog=safeReadArray('luxdecor-cash-log-v23',[]).filter(x=>!invalidIds.has(String(x?.saleId??'')));
  const warranties=safeReadArray('luxdecor-warranties-v29',[]).filter(x=>!invalidIds.has(String(x?.saleId??'')));
  const deliveries=safeReadArray('luxdecor-deliveries-v29',[]).filter(x=>!invalidIds.has(String(x?.saleId??'')));
  safeWrite('luxdecor-sales-v12',keptSales);safeWrite('luxdecor-finance-v12',finance);safeWrite('luxdecor-nf-docs-v16',invoices);safeWrite('luxdecor-stock-log-v16',movements);safeWrite('luxdecor-cash-log-v23',cashLog);safeWrite('luxdecor-warranties-v29',warranties);safeWrite('luxdecor-deliveries-v29',deliveries);
  safeWrite('luxdecorerp-invalid-sales-cleanup-v2133',{at:new Date().toISOString(),removed:invalidSales.length,ids:[...invalidIds],sales:invalidSales.map(s=>({id:s.id,client:s.client||'',status:s.status||'',channel:s.channel||'',items:(s.items||[]).map(i=>({productId:i.productId,name:i.name||''}))})),note:'Vendas de teste/incompatíveis com itens que não existem no cadastro atual foram removidas junto com vínculos financeiro, fiscal, caixa, estoque, garantia e entrega.'});
}

function migrateTo2134(){
  const finance=safeReadArray('luxdecor-finance-v12',[]);
  const sales=safeReadArray('luxdecor-sales-v12',[]);
  const purchases=safeReadArray('luxdecor-purchases-v12',[]);
  const bills=safeReadArray('luxdecorerp-bills-v211',[]);
  const saleIds=new Set(sales.map(x=>String(x?.id??'')));
  const purchaseIds=new Set(purchases.map(x=>String(x?.id??'')));
  const billIds=new Set(bills.map(x=>String(x?.id??'')));
  const removed=[];
  const kept=[];
  const reasonFor=x=>{
    if(!x)return 'registro inválido';
    if(hasTestMarker(x.desc,x.description,x.category,x.notes,x.origin,x.costCenter,x.paymentMethod))return 'marcador de teste/demo';
    if([1,2,3,4].includes(Number(x.id)))return 'seed financeiro histórico';
    const o=String(x.origin||'');
    if((o.startsWith('sale:')||o.startsWith('cash-sale:'))&&!saleIds.has(o.replace(/^cash-sale:|^sale:/,'')))return 'venda de origem inexistente';
    if(o.startsWith('purchase:')&&!purchaseIds.has(o.replace('purchase:','')))return 'compra de origem inexistente';
    if(o.startsWith('bill:')&&!billIds.has(o.replace('bill:','')))return 'boleto de origem inexistente';
    return '';
  };
  for(const x of finance){const reason=reasonFor(x);if(reason)removed.push({id:x?.id,desc:x?.desc||x?.description||'',type:x?.type||'',amount:Number(x?.amount)||0,status:x?.status||'',origin:x?.origin||'',reason});else kept.push(x)}
  const remainingPay=kept.filter(x=>x?.type==='pay'&&!['paid','cancelled'].includes(String(x?.status||'').toLowerCase())).map(x=>({id:x.id,desc:x.desc||'',amount:Number(x.amount)||0,paidAmount:Number(x.paidAmount)||0,due:x.due||'',status:x.status||'',origin:x.origin||'',category:x.category||''}));
  const remainingReceive=kept.filter(x=>x?.type==='receive'&&!['paid','cancelled'].includes(String(x?.status||'').toLowerCase())).map(x=>({id:x.id,desc:x.desc||'',amount:Number(x.amount)||0,paidAmount:Number(x.paidAmount)||0,due:x.due||'',status:x.status||'',origin:x.origin||'',category:x.category||''}));
  safeWrite('luxdecor-finance-v12',kept);
  safeWrite('luxdecorerp-finance-audit-v2134',{
    at:new Date().toISOString(),before:finance.length,after:kept.length,removed,
    remainingPay,remainingReceive,
    openPayTotal:remainingPay.reduce((s,x)=>s+Math.max(0,(Number(x.amount)||0)-(Number(x.paidAmount)||0)),0),
    openReceiveTotal:remainingReceive.reduce((s,x)=>s+Math.max(0,(Number(x.amount)||0)-(Number(x.paidAmount)||0)),0),
    note:'Limpeza conservadora: remove somente seeds conhecidos, registros marcados como teste/demo e vínculos órfãos. Lançamentos manuais legítimos, pagos, conciliados ou fechados são preservados.'
  });
}


function migrateTo2170(){
  const sales=safeReadArray('luxdecor-sales-v12',[]);
  const current=safeReadArray('luxdecor-orders-v217',[]);
  const bySale=new Map(current.map(o=>[String(o.saleId),o]));
  const orders=[...current];
  for(const sale of sales){
    if(!sale||sale.status!=='Concluída'||bySale.has(String(sale.id)))continue;
    orders.push({
      id:`ord-${sale.id}`,saleId:sale.id,client:sale.client||'Consumidor final',seller:sale.seller||'',operator:sale.operator||'',
      date:sale.date||'',createdAt:sale.createdAt||new Date().toISOString(),updatedAt:sale.createdAt||new Date().toISOString(),
      items:Array.isArray(sale.items)?sale.items:[],total:Number(sale.total)||0,
      fulfillment:sale.deliveryRequired?'Entrega':'Retirada',status:'Aguardando separação',source:'sale-migration'
    });
  }
  safeWrite('luxdecor-orders-v217',orders);
  const finance=safeReadArray('luxdecor-finance-v12',[]).map(f=>{
    const origin=String(f?.origin||'');
    if(f?.sourceType&&f?.sourceId)return f;
    if(origin.startsWith('cash-sale:')||origin.startsWith('sale:'))return{...f,sourceType:'sale',sourceId:origin.replace(/^cash-sale:|^sale:/,'')};
    if(origin.startsWith('purchase:'))return{...f,sourceType:'purchase',sourceId:origin.replace('purchase:','')};
    if(origin.startsWith('bill:'))return{...f,sourceType:'bill',sourceId:origin.replace('bill:','')};
    if(origin==='ofx')return{...f,sourceType:'ofx',sourceId:String(f.id||'')};
    if(origin==='recurring')return{...f,sourceType:'recurring',sourceId:String(f.id||'')};
    return{...f,sourceType:'manual',sourceId:String(f.id||'')};
  });
  safeWrite('luxdecor-finance-v12',finance);
}


function migrateLuxInventory(){
  const key='luxdecor-products-v12';
  const current=safeReadArray(key,[]);
  const sales=safeReadArray('luxdecor-sales-v12',[]);
  const referenced=new Set(sales.flatMap(s=>(s?.items||[]).flatMap(item=>[String(item?.productId||''),String(item?.id||'')])).filter(Boolean));
  const archived=current.filter(p=>String(p?.id||'').startsWith('imp-')&&!referenced.has(String(p.id)));
  // Preserve an on-device backup before removing old Home spreadsheet imports.
  if(archived.length){
    const archiveKey='luxdecor__legacy_home_products_backup_20261104';
    if(!localStorage.getItem(archiveKey)){
      localStorage.setItem(archiveKey,JSON.stringify({savedAt:new Date().toISOString(),products:archived}));
    }
  }
  const clean=current.filter(p=>!archived.includes(p));
  const merged=mergeLuxInventory(clean);
  if(!safeWrite(key,merged.products))throw new Error('Não foi possível persistir o catálogo Lux Decor.');
  safeWrite('luxdecor-inventory-initialized-v1',{at:new Date().toISOString(),inserted:merged.inserted,archivedHome:archived.length,total:merged.products.length});
}
export function bootstrapStorage(){
  if(cloudConfigured())return;
  try{
    for(const key of Object.keys(sessionStorage).filter(k=>k.startsWith('luxdecor__tx__'))){try{const tx=JSON.parse(sessionStorage.getItem(key)||'null');if(tx?.state==='preparing'&&tx.previous){for(const [k,raw] of Object.entries(tx.previous))raw===null?localStorage.removeItem(k):localStorage.setItem(k,raw)}sessionStorage.removeItem(key)}catch{}}
    const current=localStorage.getItem(VERSION_KEY);
    if(current!==APP_SCHEMA_VERSION){createLocalSnapshot(`before-update-${current||'first-install'}`);if(!safeRead('luxdecor-inventory-initialized-v1',null))migrateLuxInventory();localStorage.setItem(VERSION_KEY,APP_SCHEMA_VERSION)}
  }catch(err){console.error('Falha na migração local',err)}
}
export function storageHealth(){
  let keys=0,bytes=0,corrupt=0;
  try{const source=businessStorage();for(let i=0;i<source.length;i++){const k=source.key(i);if(!isHomeKey(k))continue;keys++;const v=source.getItem(k)||'';bytes+=v.length;if(k.includes('__corrupt__')||k.includes('__invalid_shape__'))corrupt++}}catch{}
  return{keys,bytes,corrupt,version:localStorage.getItem(VERSION_KEY)||'legacy'};
}
export const STORAGE_KEYS={
  products:'luxdecor-products-v12',clients:'luxdecor-clients-v12',suppliers:'luxdecor-suppliers-v12',finance:'luxdecor-finance-v12',sales:'luxdecor-sales-v12',purchases:'luxdecor-purchases-v12',movements:'luxdecor-stock-log-v16',invoices:'luxdecor-nf-docs-v16',cashLog:'luxdecor-cash-log-v23',cashSession:'luxdecor-cash-session-v23',held:'luxdecor-cash-held-v23',orders:'luxdecor-orders-v217'
};
export async function commitLocalTransaction(label,changes={}){
  if(cloudConfigured()){
    try{
      const transformed=Object.fromEntries(Object.entries(changes).map(([key,value])=>[key,JSON.stringify(key==='luxdecor-products-v12'&&Array.isArray(value)?value.map(compactProduct):value)]));
      await flushCloudWrites();
      await commitCloudDocuments(transformed);
      return{ok:true,txId:'cloud-'+Date.now()};
    }catch(error){return{ok:false,error}};
  }
  const txId=`tx_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,previous={};
  try{
    for(const key of Object.keys(changes))previous[key]=localStorage.getItem(key);
    sessionStorage.setItem(`luxdecor__tx__${txId}`,JSON.stringify({id:txId,label,at:new Date().toISOString(),keys:Object.keys(changes),previous,state:'preparing'}));
    for(const [key,value] of Object.entries(changes))if(!safeWrite(key,value))throw new Error(`Falha ao gravar ${key}`);
    sessionStorage.removeItem(`luxdecor__tx__${txId}`);return{ok:true,txId};
  }catch(error){
    for(const [key,raw] of Object.entries(previous)){try{raw===null?localStorage.removeItem(key):localStorage.setItem(key,raw)}catch{}}
    try{sessionStorage.setItem(`luxdecor__tx__${txId}`,JSON.stringify({id:txId,label,at:new Date().toISOString(),keys:Object.keys(changes),state:'rolled_back',error:String(error?.message||error)}))}catch{}
    return{ok:false,txId,error};
  }
}
