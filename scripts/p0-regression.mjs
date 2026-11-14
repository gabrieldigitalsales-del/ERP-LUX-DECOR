import assert from 'node:assert/strict';
import fs from 'node:fs';
import {eligibleForPdv,pdvProducts} from '../src/utils/pdvEligibility.js';
import {addMonthsClamped,addDaysIso} from '../src/utils/dateMath.js';

const input=[
 {id:'show-1',name:'Sofá Nevada',stockType:'Mostruário',active:true,stock:2},
 {id:'show-2',name:'Sofá Creta',stockType:'MOSTRUARIO',active:true,stock:1},
 {id:'store-1',name:'Sofá Camaro',stockType:'Estoque',active:true,stock:9},
 {id:'archived',name:'Sofá Antigo',stockType:'Mostruário',active:false,stock:2},
 {id:'no-type',name:'Sofá Sem Tipo',active:true,stock:4},
];
assert.deepEqual(pdvProducts(input).map(x=>x.id),['show-1','show-2']);
assert.equal(eligibleForPdv(null),false);
assert.equal(eligibleForPdv(input[2]),false);
assert.equal(eligibleForPdv(input[3]),false);
const cash=fs.readFileSync(new URL('../src/pages/Cashier.jsx',import.meta.url),'utf8');
assert.ok(cash.includes('if(!eligibleForPdv(p))return false;'),'PDV deve filtrar estoque geral');
assert.ok(cash.includes("if(!eligibleForPdv(p))return toast("),'Carrinho não deve aceitar estoque geral');
assert.ok(cash.includes('return !eligibleForPdv(p)||'),'Checkout deve impedir venda fora de Mostruário');
const finance=fs.readFileSync(new URL('../src/pages/Finance.jsx',import.meta.url),'utf8');
assert.ok(finance.includes("await commitLocalTransaction('finance-save-confirmed'"),'Financeiro deve confirmar a persistência');
assert.ok(finance.includes('if(!result.ok)'),'Financeiro deve tratar falhas de persistência');
assert.equal([...finance.matchAll(/if\(!\(await commitFinance\(/g)].length,11,'Ações financeiras devem aguardar confirmação');
assert.ok(!finance.includes('safeWrite(STORAGE_KEYS.finance,clean)'), 'Financeiro não deve confirmar gravação assíncrona sem aguardar');
assert.equal(addMonthsClamped('2026-01-31',1),'2026-02-28');
assert.equal(addMonthsClamped('2028-01-31',1),'2028-02-29');
assert.equal(addMonthsClamped('2026-01-31',2),'2026-03-31');
assert.equal(addMonthsClamped('2026-12-31',2),'2027-02-28');
assert.equal(addDaysIso('2026-12-31',1),'2027-01-01');
const orders=fs.readFileSync(new URL('../src/pages/Orders.jsx',import.meta.url),'utf8');
assert.ok(orders.includes("commitLocalTransaction('orders-update'"),'Pedidos e entregas devem compartilhar transação');
assert.ok(orders.includes('if(!await persist(next,updated))return;'),'Entrega deve aguardar confirmação de persistência');
assert.ok(orders.includes('if(!await persist(next,deliveries))return;'),'Atualização de etapa deve aguardar confirmação');
const cashierDates=fs.readFileSync(new URL('../src/pages/Cashier.jsx',import.meta.url),'utf8');
assert.ok(cashierDates.includes('addMonthsClamped(isoToday(),idx+1)'),'Parcelas do PDV devem respeitar o fim do mês');
const financeDates=fs.readFileSync(new URL('../src/pages/Finance.jsx',import.meta.url),'utf8');
assert.ok(financeDates.includes('addMonthsClamped(form.due,r+i)'),'Parcelas do Financeiro devem respeitar o fim do mês');
console.log('OK: PDV Mostruário, Financeiro confirmado, pedidos atômicos e vencimentos em meses curtos.');
