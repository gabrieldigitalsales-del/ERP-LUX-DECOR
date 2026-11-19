import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {eligibleForPdv} from '../src/utils/pdvEligibility.js';
import {addMonthsClamped,addDaysIso} from '../src/utils/dateMath.js';

// Executa o próprio bloco de geração de vendas do Cashier.jsx com dados sintéticos.
// O teste não abre conexão com Supabase, não cria sessão real e não altera estoque.
const code=fs.readFileSync(new URL('../src/pages/Cashier.jsx',import.meta.url),'utf8');
const start=code.indexOf('const nextSales=[sale,...sales];');
const end=code.indexOf('const tx=await commitLocalTransaction',start);
assert.ok(start>=0&&end>start,'Bloco de finalização do PDV não encontrado');
const source=code.slice(start,end);
assert.ok(source.includes("const nextProducts=")&&source.includes("const nextFinance=")&&source.includes("const nextOrders="),'Bloco transacional incompleto');
const product=Object.freeze({id:'show-simulated-nevada',name:'Sofá Nevada — SIMULAÇÃO',sku:'TESTE-NEVADA',stockType:'Mostruário',active:true,stock:2,reserved:0,price:2999,cost:1700});
const cart=Object.freeze([{productId:product.id,name:product.name,sku:product.sku,price:2999,cost:1700,qty:1,category:'Sofás',pendingOrder:false}]);
assert.equal(eligibleForPdv(product),true);
const now='2026-11-19T12:00:00.000Z';
let sequence=0;
function simulate(payment,deliveryRequired=false){
 const id=999999;
 const sale={id,client:'CLIENTE TESTE — NÃO REAL',total:2999,date:'2026-11-19',status:'Concluída',payment:payment.type,items:[...cart],channel:'Caixa'};
 const context={
   id,now,c:sale.client,products:[product],cart,sales:[],sale,total:2999,
   currentMov:[],currentFinance:[],currentInv:[],clients:[{id:'client-test',name:sale.client,credit:0,total:0,phone:'',email:'',doc:''}],
   normalizedPayments:[{type:payment.type,amount:2999,fee:0,installments:payment.installments||1,nsu:''}],
   seller:'VENDEDOR TESTE',operator:'TESTE',paymentLabel:payment.type,session:{id:'session-test',sessionCode:'TESTE',terminal:'SIMULADOR'},
   cashPart:payment.type==='Dinheiro'?2999:0,change:0,deliveryRequired,storeCreditPart:0,cashLog:[],
   isOrderItem:item=>Boolean(item.pendingOrder),uid:kind=>kind+'-sim-'+(++sequence),
   immediate:['Pix','Dinheiro','Cartão de débito','Transferência'],isoToday:()=> '2026-11-19',
   addMonthsClamped,addDaysIso,safeRead:()=>[],formatCustomerAddress:()=> 'Endereço simulado',
   customerAddressFields:()=>({street:'Rua Teste',number:'0',neighborhood:'Simulação',cep:'00000000',city:'Cidade Teste',state:'MG'}),
 };
 const result=vm.runInNewContext(`(()=>{${source};return {nextSales,nextProducts,nextFinance,nextMov,nextOrders,nextCashLog,nextDeliveries,nextInv}})()`,context,{timeout:1500});
 assert.equal(result.nextSales.length,1);
 assert.equal(result.nextSales[0].total,2999);
 assert.equal(result.nextProducts[0].stock,1);
 assert.equal(product.stock,2,'O produto original não pode sofrer mutação');
 assert.equal(result.nextMov[0].type,'out');
 assert.equal(result.nextMov[0].qty,1);
 assert.equal(result.nextOrders.length,1);
 assert.equal(result.nextOrders[0].saleId,id);
 assert.equal(result.nextCashLog.length,1);
 assert.equal(result.nextCashLog[0].saleId,id);
 assert.equal(result.nextInv[0].status,'Rascunho');
 assert.equal(Math.round(result.nextFinance.reduce((sum,entry)=>sum+entry.amount,0)*100),299900);
 assert.ok(result.nextFinance.every(entry=>entry.sourceType==='sale'&&entry.sourceId===id));
 assert.equal(result.nextDeliveries?.length||0,deliveryRequired?1:0);
 return result;
}
const pix=simulate({type:'Pix'});
assert.equal(pix.nextFinance.length,1);
assert.equal(pix.nextFinance[0].status,'paid');
assert.equal(pix.nextFinance[0].paidAmount,2999);
const card=simulate({type:'Cartão de crédito',installments:3},true);
assert.equal(card.nextFinance.length,3);
assert.equal(card.nextFinance.filter(entry=>entry.status==='open').length,3);
assert.equal(card.nextFinance[0].due,'2026-12-19');
assert.equal(card.nextFinance[1].due,'2027-01-19');
assert.equal(card.nextFinance[2].due,'2027-02-19');
assert.equal(card.nextDeliveries[0].saleId,999999);
console.log('OK: simulação REAL DA LÓGICA PDV — venda, estoque, movimentação, financeiro Pix, cartão 3x, pedido e entrega.');
console.log(JSON.stringify({
 tipo:'SIMULAÇÃO ISOLADA (sem gravar no ERP)',
 produto:product.name,
 valor:2999,
 estoque:{antes:2,depois:pix.nextProducts[0].stock},
 pix:{financeiro:pix.nextFinance.length,situacao:pix.nextFinance[0].status},
 cartao3x:card.nextFinance.map(e=>({valor:e.amount,vencimento:e.due,status:e.status})),
 pedido:card.nextOrders[0].status,
 entrega:card.nextDeliveries[0].status,
 registrosReaisCriados:0
}));
