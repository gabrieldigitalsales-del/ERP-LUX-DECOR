import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const store=new Map();
globalThis.localStorage={
  getItem:k=>store.has(k)?store.get(k):null,
  setItem:(k,v)=>store.set(k,String(v)),
  removeItem:k=>store.delete(k),
  key:i=>[...store.keys()][i]||null,
  get length(){return store.size}
};
globalThis.window={dispatchEvent:()=>{}};
globalThis.CustomEvent=class{constructor(name,options){this.type=name;this.detail=options?.detail}};
const commercialSource=read('src/utils/commercial.js').replace("import{erpStorage}from'./storage';","const erpStorage=localStorage;").replace("import{uid}from'./ids';","const uid=()=> 'seller-test-generated';");
const commercial=await import('data:text/javascript;base64,'+Buffer.from(commercialSource).toString('base64'));
assert.deepEqual(commercial.getSalespeople(),[],'Nenhuma vendedora fictícia deve ser criada');

store.clear();
store.set('luxdecor-salespeople-v2',JSON.stringify([
  {id:'seller-1',name:'Mariana Silva',active:true},
  {id:'seller-2',name:'Tatiane Franco',active:true},
  {id:'seller-real',name:'Vendedora Real',active:true}
]));
assert.deepEqual(commercial.getSalespeople().map(x=>x.name),['Vendedora Real'],'Limpeza remove exemplos e preserva nomes reais');
assert.deepEqual(commercial.getSalespeople().map(x=>x.name),['Vendedora Real'],'Recarregar não repovoa exemplos');
const edited=commercial.saveSalespeople([{id:'seller-real',name:'Nome Atualizado',active:true,pin:'4321'}]);
assert.equal(edited[0].name,'Nome Atualizado');
assert.equal(commercial.getSalespeople()[0].name,'Nome Atualizado','Nome editado persiste ao reler');
commercial.saveSalespeople([]);
assert.equal(commercial.getSalespeople().length,0,'Lista vazia permanece vazia');
assert.throws(()=>commercial.saveSalespeople([{name:'Ana'},{name:'ana'}]),/repetidos/);
store.clear();
store.set('luxdecor-salespeople-v1',JSON.stringify(['Tatiane Franco','Vendedora Legada']));
assert.deepEqual(commercial.getSalespeople().map(x=>x.name),['Vendedora Legada'],'Migração legada não restaura exemplos');
store.set('luxdecor-salespeople-v2',JSON.stringify([{id:'seller-1',name:'Mariana Silva',active:true},{id:'seller-new',name:'Nova Vendedora',active:true}]));
assert.deepEqual(commercial.getSalespeople().map(x=>x.name),['Nova Vendedora'],'Backup antigo não pode recriar demonstrações');

const master=await import('data:text/javascript;base64,'+Buffer.from(read('src/data/masterData.js')).toString('base64'));
const editedProduct={id:'p-1',nome_produto:'Sofá antigo',preco_final:100,fornecedor:'Antigo',name:'Sofá novo',price:250,supplier:'Novo',category:'Estofados',color:'Areia'};
const saved=master.compactProduct(editedProduct);
const restored=master.hydrateProduct(saved);
assert.equal(restored.name,'Sofá novo','Nome editado não pode regredir');
assert.equal(restored.price,250,'Preço editado não pode regredir');
assert.equal(restored.supplier,'Novo','Fornecedor editado não pode regredir');
assert.equal(restored.color,'Areia','Cor editada deve persistir');

const inventory=JSON.parse(read('src/data/luxCurrentStock.json'));
assert.equal(inventory.length,54,'As 54 variações originais devem estar no catálogo');
const storage=read('src/utils/storage.js');
const boot=storage.split('export function bootstrapStorage(){')[1]?.split('export function storageHealth()')[0]||'';
assert.ok(boot.includes("if(!safeRead('luxdecor-inventory-initialized-v1',null))migrateLuxInventory()"),'Importação inicial deve acontecer uma única vez');
assert.ok(!boot.includes('migrateTo2130()')&&!boot.includes('migrateTo2131()'),'Migrações Home não podem executar');
assert.ok(!read('src/data/masterData.js').includes('homeProductsMaster.json'),'Catálogo Home não pode ser carregado');
const stockCode=read('src/pages/Stock.jsx');
assert.ok(stockCode.includes("filter(el=>String(el.value).trim()!=='')"),'Contagem de inventário em branco não pode virar zero');
assert.ok(!stockCode.includes('window.confirm('),'Inventário não deve usar diálogo nativo');
const cashierCode=read('src/pages/Cashier.jsx');
assert.ok(!cashierCode.includes("safeWrite('luxdecor-deliveries-v29'"),'Entrega não pode ser gravada fora da transação da venda');
assert.ok(cashierCode.includes("...(deliveryRequired?{'luxdecor-deliveries-v29':nextDeliveries}:{})"),'Entrega deve estar incluída na transação local');
console.log('OK: testes de vendedoras, produto, inventário, PDV e migrações.');
