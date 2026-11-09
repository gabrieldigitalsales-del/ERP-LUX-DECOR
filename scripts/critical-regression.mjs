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
const commercialSource=read('src/utils/commercial.js').replace("import{erpStorage}from'./storage';","const erpStorage=localStorage;").replace("import{cloudConfigured,getCloudSession}from'./cloudAuth';","const cloudConfigured=()=>false;const getCloudSession=()=>null;").replace("import{uid}from'./ids';","const uid=()=> 'seller-test-generated';");
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
const login=read('src/components/CloudLogin.jsx');
assert.ok(login.includes('signInUsername')&&!login.includes('type="email"'),'Login deve pedir usuário e senha, não e-mail');
assert.ok(login.includes('erpluxdecor-setup'),'Primeiro acesso deve exigir ativação protegida');
const settings=read('src/pages/Settings.jsx');
assert.ok(settings.includes('<UserManagement/>'),'Somente Admin deve gerenciar funcionários');
assert.ok(stockCode.includes('changeArchived')&&stockCode.includes('restoreProduct'),'Arquivamento e restauração de produtos precisam existir');
const movementCode=read('src/pages/Movements.jsx');
assert.ok(movementCode.includes("type=\"date\"")&&movementCode.includes('detailType'),'Movimentações precisam ter filtros e detalhes');
assert.ok(read('src/components/Sidebar.jsx').includes("['movements','Movimentações'"),'Movimentações devem aparecer no menu');
assert.ok(stockCode.includes('const deleteProduct=async()=>'),'Exclusão real deve estar implementada no Estoque');
assert.ok(stockCode.includes('deleteProtection(p)')&&stockCode.includes('STORAGE_KEYS.sales')&&stockCode.includes('STORAGE_KEYS.movements'),'Exclusão exige checagem do histórico');
assert.ok(stockCode.includes("deleteConfirmation.trim()!==String(p.sku||p.name).trim()"),'Exclusão exige confirmação por código');
assert.ok(stockCode.includes('luxdecor-deleted-seed-ids-v1'),'Produtos excluídos não devem reaparecer ao importar');
assert.ok(cashierCode.includes("const[openValue,setOpenValue]=useState('');"),'Caixa não pode iniciar com R$ 200 de fundo implícito');
assert.ok(cashierCode.includes("currentRole()==='Administrador'&&<div className=\"pdv-optional-opening\""),'Apenas administrador vê opção de fundo inicial');
assert.ok(cashierCode.includes('const opening=Math.max(0,Number(openValue)||0)'), 'Caixa deve abrir normalmente com R$ 0,00');
const productsNoFiscal=read('src/pages/Products.jsx');
assert.ok(!productsNoFiscal.includes('quick-ncm-search')&&!productsNoFiscal.includes('NCM pendente'),'O cadastro não deve pedir NCM');
assert.ok(!read('src/pages/Finance.jsx').includes('Financeiro & Fiscal'),'Financeiro não deve exibir módulo Fiscal');
assert.ok(!read('src/pages/Sales.jsx').includes('<span>Fiscal</span>'),'Fluxo de vendas sem etapa fiscal');
assert.ok(!read('src/pages/Settings.jsx').includes('luxdecor-fiscal-'),'Configurações não devem gravar campos fiscais legados');
const unified=read('src/pages/InventoryHub.jsx');
assert.ok(unified.includes('<Stock embedded')&&unified.includes('<Products embedded'),'Produtos e Estoque devem compartilhar um módulo');
const sidebar=read('src/components/Sidebar.jsx');
assert.ok(sidebar.includes("['stock','Produtos e Estoque'")&&!sidebar.includes("['products','Produtos'"),'Menu principal não deve duplicar Produtos e Estoque');
const app=read('src/App.jsx');
assert.ok(app.includes('<InventoryHub')&&app.includes('setNotifications')&&!app.includes('deriveAlerts'),'Aplicação deve manter módulo unificado e notificações operacionais');
const topbar=read('src/components/Topbar.jsx');
assert.ok(topbar.includes('Bell')&&topbar.includes('Marcar lidas'),'Sininho e leitura de notificações devem estar ativos');
const operational=read('src/utils/operationalNotifications.js');
assert.ok(operational.includes('auto-low')&&operational.includes('auto-overdue')&&operational.includes('auto-reservation'),'Avisos úteis de estoque, contas e reservas devem existir');
assert.ok(!operational.includes("id:'auto-ncm'")&&!operational.includes("id:'auto-nf'"),'Alertas NCM e fiscais não podem ser gerados');
const cloudGate=read('src/CloudGate.jsx');
assert.ok(cloudGate.includes('LoadingScreen persist')&&cloudGate.includes('stage===\'checking\''),'A logo deve carregar antes do login');
const loadingScreen=read('src/components/LoadingScreen.jsx');
assert.ok(loadingScreen.includes('lux-logo.png'),'Tela de carregamento deve usar logo original da Lux Decor');
assert.ok(!read('src/utils/erpEngine.js').includes('auto-ncm'),'Não gerar alertas NCM');
assert.ok(!fs.existsSync(path.join(root,'src/services/ncmService.js')),'Serviço NCM legado não deve existir');
assert.ok(!fs.existsSync(path.join(root,'src/data/ncmTable.json')),'Tabela NCM legada não deve carregar no ERP');
const pdvSource=read('src/pages/Cashier.jsx');
assert.ok(pdvSource.includes("normalize('NFD')")&&pdvSource.includes('terms.every(term=>searchable.includes(term))'),'PDV deve buscar sem acentos e com palavras em ordem livre');
assert.ok(pdvSource.includes('disabled={!session||(available<=0&&!p.madeToOrder)}'),'Produtos sem estoque não devem ser clicáveis no PDV, exceto sob encomenda configurada');
assert.ok(pdvSource.includes('orderTarget&&<Modal')&&pdvSource.includes('add(target,true)'),'Encomendas exigem confirmação antes de entrar no carrinho');
assert.ok(pdvSource.includes('pendingOrder:order')&&pdvSource.includes("isOrderItem(i)"),'Venda sob encomenda deve ser registrada sem diminuir estoque');
assert.ok(pdvSource.includes("if(availableFor(p)<=0&&!p.madeToOrder)return toast"),'Sem estoque também deve ser bloqueado pela função de adicionar, não apenas pelo botão');
assert.equal('sofá retrátil'.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').includes('sofa'),true,'Sofa deve encontrar Sofá');
const pdvFinal=read('src/pages/Cashier.jsx');
assert.ok(!pdvFinal.includes('saveQuotation')&&!pdvFinal.includes("tab==='quotes'")&&!pdvFinal.includes('Salvar cotação'),'Salvar cotação e aba de cotações devem ficar fora do PDV');
assert.ok(pdvFinal.includes('const setLinePrice=(id,raw)=>'),'PDV deve aceitar preço manual na própria venda');
assert.ok(pdvFinal.includes('onChange={e=>setLinePrice(i.productId,e.target.value)}'),'Preço pendente deve ser editável na tela de pagamento');
assert.ok(pdvFinal.includes('setPaymentRows(prev=>prev.length===1?'),'Pagamento simples deve acompanhar o valor informado');
assert.ok(pdvFinal.includes("const invalidPrice=cart.find(i=>!(Number(i.price)>0))"),'Não finalizar venda com preço pendente');
assert.ok(pdvFinal.includes('disabled={finalizing||total<=0||cart.some(i=>!(Number(i.price)>0))'),'Finalizar só fica habilitado com todos os preços definidos');
assert.ok(pdvFinal.includes("return[...rows,{productId:p.id")&&pdvFinal.includes("pricePending:!(Number(p.price)>0)"),'Preço pendente deve entrar no carrinho sem salvar cotação');
assert.ok(pdvFinal.includes("disabled={!session||!cart.length}")&&!pdvFinal.includes("disabled={!session||!cart.length||cart.some"),'Pagamento deve abrir mesmo com preço pendente');
assert.ok(pdvFinal.includes("if(availableFor(p)<=0&&!p.madeToOrder)return toast"),'Produto sem estoque segue bloqueado');
assert.ok(!pdvFinal.includes('pdv-quick-pay')&&!pdvFinal.includes('pdv-payment-methods'),'Não pode haver dois seletores de pagamento');
assert.ok(pdvFinal.includes('PAGAMENTO<small>F8')&&pdvFinal.includes('onClick={()=>openCheckout()}'),'Deve existir um único botão Pagamento no PDV');
assert.ok(pdvFinal.includes('<b>Forma de pagamento</b>')&&pdvFinal.includes('paymentRows.map((p,i)'), 'A forma e o valor de pagamento devem ser preenchidos em um único modal');
const stockScreen=read('src/pages/Stock.jsx');
assert.ok(!stockScreen.includes('lux-stock-import-bar')&&!stockScreen.includes('importInventory')&&!stockScreen.includes('importConfirm'),'A faixa e o importador legado de 54 cadastros não devem aparecer no estoque');
assert.ok(read('src/pages/InventoryHub.jsx').includes('<Stock embedded')&&read('src/pages/InventoryHub.jsx').includes('<Products embedded'),'Catálogo e estoque compartilham a mesma lista de produtos');
assert.ok(stockScreen.includes('groupInventory=items=>')&&stockScreen.includes('groupedStock.map(group=>'),'Estoque deve agrupar por fábrica e modelo');
assert.ok(stockScreen.includes('moduleLabel=p=>')&&stockScreen.includes("(Number(raw)/100).toLocaleString('pt-BR'"),'Módulos numéricos devem aparecer em metros');
assert.ok(stockScreen.includes('moduleOrder=p=>')&&stockScreen.includes('sort((a,b)=>moduleOrder(a)-moduleOrder(b)'),'Módulos devem ser exibidos em ordem crescente');
assert.ok(stockScreen.includes('p.color')&&stockScreen.includes('p.inventoryPending'),'Cor e quantidade pendente devem permanecer visíveis');
assert.ok(stockScreen.includes("chooseAction(p,'in')")&&stockScreen.includes("chooseAction(p,'out')"),'Entrada e saída de estoque devem continuar acessíveis');
const cashierWithPermuta=read('src/pages/Cashier.jsx');
assert.ok(cashierWithPermuta.includes("'Permuta','Boleto'")&&cashierWithPermuta.includes("'Permuta':ArrowLeftRight"),'Permuta deve aparecer no seletor de pagamento');
assert.ok(cashierWithPermuta.includes("nonCash:p.type==='Permuta'")&&cashierWithPermuta.includes("category:p.type==='Permuta'?'Permuta':'Vendas'"),'Permuta deve ser registrada como recebimento não monetário');
assert.ok(cashierWithPermuta.includes('exchangeDescription')&&cashierWithPermuta.includes('Bem ou serviço recebido na permuta'),'Permuta deve permitir descrever o bem recebido');
assert.ok(cashierWithPermuta.includes("newClient,setNewClient]=useState({name:'',address:'',email:'',doc:'',phone:''})"),'Cadastro rápido deve ter nome, endereço, e-mail, CPF e telefone');
assert.ok(cashierWithPermuta.includes('address:newClient.address.trim()')&&cashierWithPermuta.includes('email:newClient.email.trim()'),'Cadastro rápido deve salvar os dados no cliente');
assert.ok(cashierWithPermuta.includes('clientAddress:selectedCustomer?.address')&&cashierWithPermuta.includes('clientPhone:selectedCustomer?.phone'),'Pedido de entrega deve receber endereço e telefone do cliente');
const addressUtil=read('src/utils/customerAddress.js');
assert.ok(addressUtil.includes("export const formatCustomerAddress=")&&addressUtil.includes("export const customerAddressFields="),'Endereço estruturado deve ter formatador único');
assert.ok(addressUtil.includes("String(customer.address||'').trim()"),'Endereço antigo deve continuar legível');
const pdvAddress=read('src/pages/Cashier.jsx');
for(const field of ['street','number','neighborhood','cep','complement','city','state'])assert.ok(pdvAddress.includes('newClient.'+field),'Campo obrigatório no cadastro rápido: '+field);
assert.ok(pdvAddress.includes('address:formatCustomerAddress(selectedCustomer)')&&pdvAddress.includes('clientAddressFields:customerAddressFields(selectedCustomer)'),'Entrega e pedido devem receber endereço completo e campos separados');
const clientAddress=read('src/pages/SimpleRegistry.jsx');
assert.ok(clientAddress.includes('lux-customer-address-fields')&&clientAddress.includes('...customerAddressFields(form)'),'Cadastro geral de clientes deve preservar campos de entrega');
console.log('OK: regressões de login, usuários, estoque, movimentações e PDV.');

