import{erpStorage}from'../utils/storage';
import React,{useEffect,useMemo,useRef,useState}from'react';
import{
  Search,Plus,Minus,Trash2,ShoppingBag,WalletCards,Banknote,ReceiptText,LockKeyhole,UnlockKeyhole,
  ArrowDownToLine,ArrowUpFromLine,UserRound,CheckCircle2,PauseCircle,PlayCircle,History,UserPlus,
  Printer,Eye,ShieldCheck,Clock3,CircleDollarSign,Barcode,Percent,Tag,Layers3,ChevronRight,RefreshCcw,
  CreditCard,Landmark,ScanLine,X,PackageCheck,Calculator,NotebookText,ArrowLeftRight
}from'lucide-react';
import PageHeader from'../components/PageHeader';
import Modal from'../components/Modal';
import ConfirmDialog from'../components/ConfirmDialog';
import SidePanel from'../components/SidePanel';
import{toast}from'../components/ToastHost';
import{money,isoToday}from'../utils/erpEngine';
import{addAudit}from'../utils/audit';
import{safeRead,safeWrite,createLocalSnapshot,commitLocalTransaction,STORAGE_KEYS}from'../utils/storage';
import{uid,nextSequence}from'../utils/ids';
import{can,currentRole}from'../utils/permissions';
import{getCloudSession}from'../utils/cloudAuth';import{activeSalespeople,sellerByName,sellerCommission,sellerDiscountLimit,verifySellerPin}from'../utils/commercial';import{checkManagerPin}from'../utils/managerPin';
import{formatCustomerAddress,customerAddressFields,isValidCep}from'../utils/customerAddress';

const paymentOptions=['Dinheiro','Pix','Cartão de crédito','Cartão de débito','Transferência','Permuta','Boleto','Crediário','Crédito da loja'];
const immediate=['Dinheiro','Pix','Cartão de crédito','Cartão de débito','Transferência','Permuta'];
const paymentIcon={
  'Dinheiro':Banknote,'Pix':ScanLine,'Cartão de crédito':CreditCard,'Cartão de débito':CreditCard,
  'Transferência':Landmark,'Permuta':ArrowLeftRight,'Boleto':ReceiptText,'Crediário':NotebookText,'Crédito da loja':WalletCards
};
const normalizePdvSearch=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').replace(/\s+/g,' ').trim();
const getCommissionRate=()=>Number(erpStorage.getItem('luxdecor-commission-rate')||2);
const useLocal=(key,seed)=>{
  const[state,setState]=useState(()=>safeRead(key,seed));
  const first=useRef(true);
  useEffect(()=>{if(first.current){first.current=false;return}safeWrite(key,state)},[key,state]);
  return[state,setState];
};
const newId=()=>uid('cash');
const BRAZIL_TZ='America/Sao_Paulo';
const localDateCode=()=>new Intl.DateTimeFormat('en-CA',{timeZone:BRAZIL_TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()).replaceAll('-','');
const formatLocalDateTime=(value=new Date())=>new Intl.DateTimeFormat('pt-BR',{timeZone:BRAZIL_TZ,dateStyle:'short',timeStyle:'medium'}).format(value instanceof Date?value:new Date(value));
const receiptSettings=()=>({name:erpStorage.getItem('luxdecor-company-name')||'Lux Decor',cnpj:erpStorage.getItem('luxdecor-company-cnpj')||'',address:erpStorage.getItem('luxdecor-company-address')||'',phone:erpStorage.getItem('luxdecor-company-phone')||'',width:erpStorage.getItem('luxdecor-receipt-width')||'80'});

export default function Cashier({sales,setSales,products,setProducts,clients,setClients,setFinance,setMovements,setInvoices}){
  const[session,setSession]=useLocal(STORAGE_KEYS.cashSession,null);
  const[cashLog,setCashLog]=useLocal(STORAGE_KEYS.cashLog,[]);
  const[held,setHeld]=useLocal(STORAGE_KEYS.held,[]);

  const[q,setQ]=useState('');
  const[orderTarget,setOrderTarget]=useState(null);
  const[category,setCategory]=useState('Todos');
  const[seller,setSeller]=useState('');
  const sellerOptions=activeSalespeople();
  const authSession=getCloudSession()?.member;
  const operator=authSession?.name||authSession?.username||currentRole();
  // PDV de loja de móveis: um registro técnico contínuo, sem abertura/fechamento manual.
  // A migração não altera vendas, saldos, movimentos ou sessões antigas.
  useEffect(()=>{
    if(session)return;
    const now=new Date().toISOString();
    const autoSession={
      id:uid('cash'),sessionCode:'PDV-'+localDateCode(),opening:0,
      openedAt:now,status:'open',terminal:'PDV Lux Decor',openedBy:operator,automatic:true,
    };
    setSession(autoSession);
  },[session,operator]);

  const[client,setClient]=useState('Consumidor final');
  const[discountType,setDiscountType]=useState('value');
  const[discountInput,setDiscountInput]=useState(0);
  const[discountReason,setDiscountReason]=useState('');
  const[sellerPinOpen,setSellerPinOpen]=useState(false);
  const[pendingSeller,setPendingSeller]=useState('');
  const[sellerPin,setSellerPin]=useState('');
  const[managerPinValue,setManagerPinValue]=useState('');
  const[moveParty,setMoveParty]=useState('');
  const[deliveryRequired,setDeliveryRequired]=useState(false);
  const[notes,setNotes]=useState('');
  const[cart,setCart]=useState([]);
  const[tab,setTab]=useState('sale');
  const[openModal,setOpenModal]=useState(false);
  const[closeModal,setCloseModal]=useState(false);
  const[cashMove,setCashMove]=useState(null);
  const[openValue,setOpenValue]=useState('');
  const[showOptionalFloat,setShowOptionalFloat]=useState(false);
  const[terminal,setTerminal]=useState(()=>erpStorage.getItem('luxdecor-cash-terminal')||'Caixa 01');
  const[closeValue,setCloseValue]=useState('');
  const[blindCloseRevealed,setBlindCloseRevealed]=useState(false);
  const[moveValue,setMoveValue]=useState('');
  const[moveNote,setMoveNote]=useState('');
  const[clientOpen,setClientOpen]=useState(false);
  const[newClient,setNewClient]=useState({name:'',address:'',email:'',doc:'',phone:'',street:'',number:'',neighborhood:'',cep:'',complement:'',city:'',state:''});
  const[checkoutOpen,setCheckoutOpen]=useState(false);
  const[paymentRows,setPaymentRows]=useState([{type:'Dinheiro',amount:'',acquirer:'',nsu:'',installments:1}]);
  const[cashReceived,setCashReceived]=useState('');
  const[finalizing,setFinalizing]=useState(false);
  const[detailSale,setDetailSale]=useState(null);
  const[confirmHold,setConfirmHold]=useState(false);
  const[confirmClear,setConfirmClear]=useState(false);
  const[closeReport,setCloseReport]=useState(null);
  const[returnSale,setReturnSale]=useState(null);
  const[returnQty,setReturnQty]=useState({});
  const[returnReason,setReturnReason]=useState('');
  const[reopenOpen,setReopenOpen]=useState(false);
  const[reopenPin,setReopenPin]=useState('');
  const[reopenReason,setReopenReason]=useState('');
  const searchRef=useRef(null);

  const categories=useMemo(()=>['Todos',...Array.from(new Set(products.filter(p=>p.active!==false).map(p=>p.category).filter(Boolean))).sort()], [products]);
  const filtered=useMemo(()=>{
    const terms=normalizePdvSearch(q).split(' ').filter(Boolean);
    return products.filter(p=>{
      if(p.active===false)return false;
      if(category!=='Todos'&&p.category!==category)return false;
      if(!terms.length)return true;
      const searchable=normalizePdvSearch(`${p.name||''} ${p.sku||''} ${p.reference||''} ${p.category||''} ${p.brand||''} ${p.supplier||''} ${p.variant||''} ${p.color||''} ${p.sizeLabel||''}`);
      return terms.every(term=>searchable.includes(term));
    }).slice(0,60);
  },[products,q,category]);

  const units=cart.reduce((s,i)=>s+i.qty,0);
  const gross=cart.reduce((s,i)=>s+(Number(i.price)||0)*i.qty,0);
  const discount=discountType==='percent'?Math.min(gross,gross*(Math.max(0,Math.min(100,Number(discountInput)||0))/100)):Math.min(gross,Math.max(0,Number(discountInput)||0));
  const discountPct=gross>0?discount/gross*100:0;
  const sellerLimit=seller?sellerDiscountLimit(seller,currentRole()):sellerDiscountLimit('',currentRole());
  const reasonThreshold=Number(erpStorage.getItem('luxdecor-discount-reason-threshold')||5);
  const total=Math.max(0,gross-discount);
  const maxCreditInstallments=Math.max(1,Math.min(24,Number(erpStorage.getItem('luxdecor-card-max-installments')||12)));
  const minCreditInstallment=Math.max(0,Number(erpStorage.getItem('luxdecor-card-min-installment')||0));
  const paymentPreview=p=>{
    const amount=Number(p?.amount)||0;
    const installments=p?.type==='Cartão de crédito'?Math.max(1,Math.min(maxCreditInstallments,Number(p?.installments)||1)):p?.type==='Crediário'?Math.max(1,Math.min(24,Number(p?.installments)||1)):1;
    const isCredit=p?.type==='Cartão de crédito',isDebit=p?.type==='Cartão de débito';
    const feeRate=isCredit?Number(erpStorage.getItem('luxdecor-card-fee-credit')||3.19):isDebit?Number(erpStorage.getItem('luxdecor-card-fee-debit')||1.49):0;
    const fee=Number((amount*feeRate/100).toFixed(2));
    return{amount,installments,installmentValue:installments?Number((amount/installments).toFixed(2)):amount,feeRate,fee,net:Number((amount-fee).toFixed(2))};
  };

  const sessionLogs=cashLog.filter(x=>session&&x.sessionId===session.id);
  const sessionSales=sessionLogs.filter(x=>x.kind==='sale'&&!x.cancelled);
  const cashSales=sessionSales.reduce((s,x)=>s+(Number(x.cashAmount)||0),0);
  const cashIn=sessionLogs.filter(x=>x.kind==='in').reduce((s,x)=>s+(Number(x.amount)||0),0);
  const cashOut=sessionLogs.filter(x=>x.kind==='out').reduce((s,x)=>s+(Number(x.amount)||0),0);
  const expected=(Number(session?.opening)||0)+cashSales+cashIn-cashOut;
  const sessionRevenue=sessionSales.reduce((s,x)=>s+(Number(x.amount)||0),0);
  const averageTicket=sessionSales.length?sessionRevenue/sessionSales.length:0;
  const sellerSummary=useMemo(()=>{
    const map={};
    for(const x of sessionSales){const name=x.seller||'Sem vendedora';map[name]=(map[name]||0)+(Number(x.amount)||0)}
    return Object.entries(map).sort((a,b)=>b[1]-a[1]);
  },[sessionSales]);
  const paymentSummary=useMemo(()=>{
    const map={};
    for(const x of sessionSales){
      const rows=x.paymentDetails?.length?x.paymentDetails:[{type:x.payment||'Outros',amount:x.amount}];
      for(const p of rows)map[p.type]=(map[p.type]||0)+(Number(p.amount)||0);
    }
    return Object.entries(map).sort((a,b)=>b[1]-a[1]);
  },[sessionSales]);
  const acquirerSummary=useMemo(()=>{const map={};for(const x of sessionSales){for(const p of (x.paymentDetails||[])){if(!p.acquirer)continue;map[p.acquirer]=(map[p.acquirer]||0)+(Number(p.amount)||0)}}return Object.entries(map).sort((a,b)=>b[1]-a[1])},[sessionSales]);
  const cardInstallmentSummary=useMemo(()=>{const map={};for(const x of sessionSales){for(const p of (x.paymentDetails||[])){if(p.type!=='Cartão de crédito')continue;const key=`${Math.max(1,Number(p.installments)||1)}x`;map[key]=(map[key]||0)+(Number(p.amount)||0)}}return Object.entries(map).sort((a,b)=>Number(a[0].replace('x',''))-Number(b[0].replace('x','')))},[sessionSales]);
  const sessionFees=useMemo(()=>Number(sessionSales.reduce((sum,x)=>sum+(Number(x.paymentFees)||0),0).toFixed(2)),[sessionSales]);
  const sessionNet=Number((sessionRevenue-sessionFees).toFixed(2));
  const todayCashSales=useMemo(()=>sales.filter(s=>s.channel==='Caixa'&&s.date===isoToday()&&s.status!=='Cancelada'),[sales]);

  useEffect(()=>{
    const fn=e=>{
      if(e.key==='F4'){e.preventDefault();searchRef.current?.focus()}
      if(e.key==='F8'){e.preventDefault();if(cart.length)openCheckout()}
      if(e.key==='F9'){e.preventDefault();if(cart.length)setConfirmHold(true)}
      if(e.key==='F6'){e.preventDefault();setClientOpen(true)}
    };
    addEventListener('keydown',fn);
    return()=>removeEventListener('keydown',fn);
  },[cart,total,session]);

  const availableFor=p=>Math.max(0,(Number(p?.stock)||0)-(Number(p?.reserved)||0));
  const orderNeeded=p=>p?.inventoryPending===true&&availableFor(p)>0&&!p?.madeToOrder;
  const isOrderItem=i=>Boolean(i?.pendingOrder);

  const add=(p,confirmedOrder=false)=>{
    if(!session)return toast('Abra o caixa antes de iniciar uma venda.','warning','Caixa fechado');
    if(p.active===false)return toast('Este produto está arquivado.','warning','Produto indisponível');
    if(availableFor(p)<=0&&!p.madeToOrder)return toast('Produto sem estoque disponível.','warning','Estoque');
    // Itens sem preço podem ser selecionados, com valor informado na etapa de pagamento.
    const order=confirmedOrder||Boolean(p.madeToOrder);
    if(orderNeeded(p)&&!order){setOrderTarget(p);return}
    const available=availableFor(p);
    setCart(rows=>{
      const hit=rows.find(x=>String(x.productId)===String(p.id));
      if(hit){
        const orderLine=isOrderItem(hit)||order;
        if(!orderLine&&hit.qty>=available){toast('Quantidade máxima disponível atingida.','warning','Estoque');return rows}
        return rows.map(x=>String(x.productId)===String(p.id)?{...x,qty:x.qty+1,pendingOrder:orderLine}:x);
      }
      return[...rows,{productId:p.id,name:p.name,sku:p.sku,price:Number(p.price)||0,pricePending:!(Number(p.price)>0),cost:Number(p.cost)||0,qty:1,category:p.category||'',pendingOrder:order}];
    });
  };

  const setQty=(id,value)=>{
    const p=products.find(x=>String(x.id)===String(id));
    const cartLine=cart.find(x=>String(x.productId)===String(id));
    const max=(p?.madeToOrder||isOrderItem(cartLine))?999:availableFor(p);
    const next=Math.max(1,Math.min(max,Number(value)||1));
    setCart(a=>a.map(i=>String(i.productId)===String(id)?{...i,qty:next}:i));
  };
  const bumpQty=(id,delta)=>{
    const item=cart.find(i=>String(i.productId)===String(id));
    if(!item)return;
    setQty(id,item.qty+delta);
  };

  const writeCashState=async (label,{session:nextSession=session,log:nextLog=cashLog,held:nextHeld=held}={})=>{
    const tx=await commitLocalTransaction(label,{
      [STORAGE_KEYS.cashSession]:nextSession,
      [STORAGE_KEYS.cashLog]:nextLog,
      [STORAGE_KEYS.held]:nextHeld
    });
    if(!tx.ok){toast('A operação do caixa foi revertida para proteger os dados.','warning','Proteção local');return false}
    setSession(nextSession);setCashLog(nextLog);setHeld(nextHeld);return true;
  };

  const openCash=async ()=>{
    if(!can('cash.open'))return toast(`O perfil ${currentRole()} não pode abrir caixa.`,'warning','Permissão');
    if(session)return toast('Já existe um caixa aberto.','warning','Caixa');
    const opening=Math.max(0,Number(openValue)||0);
    const now=new Date().toISOString();
    const day=localDateCode();
    const sequence=cashLog.filter(x=>x.kind==='open'&&String(x.sessionCode||'').startsWith(`CX-${day}-`)).length+1;
    const sessionCode=`CX-${day}-${String(sequence).padStart(3,'0')}`;
    erpStorage.setItem('luxdecor-cash-terminal',terminal);const nextSession={id:newId(),sessionCode,opening,openedAt:now,status:'open',terminal,openedBy:operator};
    const nextLog=[{id:newId(),sessionId:nextSession.id,sessionCode,kind:'open',amount:opening,at:now,operator},...cashLog];
    createLocalSnapshot('before-open-cash');
    if(!await writeCashState('open-cash',{session:nextSession,log:nextLog,held}))return;
    setOpenModal(false);setSeller('');setOpenValue('');setShowOptionalFloat(false);
    addAudit('Caixa aberto','Caixa',`${operator} · abertura ${money(opening)}`);
    toast('Caixa aberto. PDV pronto para venda.','success','Caixa');
    setTimeout(()=>searchRef.current?.focus(),50);
  };

  const resetSale=()=>{
    setCart([]);setDiscountInput(0);setDiscountType('value');setDiscountReason('');setQ('');setCategory('Todos');
    setClient('Consumidor final');setSeller('');setNotes('');setPaymentRows([{type:'Dinheiro',amount:'',acquirer:'',nsu:'',installments:1}]);setCashReceived('');setDeliveryRequired(false);
  };

  const holdSale=async ()=>{
    if(!cart.length)return;
    const h={id:newId(),cart,client,discountType,discountInput,discount,total,notes,createdAt:new Date().toISOString(),seller,operator,sessionCode:session?.sessionCode};
    const nextHeld=[h,...held];
    if(!await writeCashState('hold-sale',{session,log:cashLog,held:nextHeld}))return;
    resetSale();setTab('held');setConfirmHold(false);
    addAudit('Venda suspensa','Caixa',`${money(total)} · ${units} unidade(s)`);
    toast('Venda suspensa e salva localmente.','info','Caixa');
  };

  const resume=async h=>{
    setCart(h.cart||[]);setClient(h.client||'Consumidor final');setSeller(h.seller||'');setDiscountType(h.discountType||'value');
    setDiscountInput(h.discountInput??h.discount??0);setNotes(h.notes||'');
    const nextHeld=held.filter(x=>x.id!==h.id);
    await writeCashState('resume-held-sale',{session,log:cashLog,held:nextHeld});
    setTab('sale');toast('Venda retomada.','info','Caixa');
  };

  const deleteHeld=async id=>{
    const nextHeld=held.filter(x=>x.id!==id);
    if(await writeCashState('delete-held-sale',{session,log:cashLog,held:nextHeld}))toast('Venda suspensa removida.','info','Caixa');
  };

  const saveClient=async ()=>{
    if(!newClient.name.trim())return toast('Informe o nome do cliente.','warning','Cliente');
    if(newClient.email.trim()&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newClient.email.trim()))return toast('Informe um e-mail válido.','warning','Cliente');
    const cpfDigits=newClient.doc.replace(/\D/g,'');
    if(cpfDigits.length>0&&cpfDigits.length!==11)return toast('Informe um CPF com 11 números.','warning','Cliente');
    if(!isValidCep(newClient.cep))return toast('Informe um CEP com 8 números.','warning','Cliente');
    const id=uid('client');
    const fields=customerAddressFields(newClient);
    const c={id,name:newClient.name.trim(),...fields,address:formatCustomerAddress(newClient),email:newClient.email.trim(),doc:newClient.doc.trim(),phone:newClient.phone.trim(),total:0};
    const nextClients=[c,...clients];
    const tx=await commitLocalTransaction('cash-quick-client',{[STORAGE_KEYS.clients]:nextClients});
    if(!tx.ok)return toast('Não foi possível salvar o cliente.','warning','Cliente');
    setClients?.(nextClients);setClient(c.name);setNewClient({name:'',address:'',email:'',doc:'',phone:'',street:'',number:'',neighborhood:'',cep:'',complement:'',city:'',state:''});setClientOpen(false);
    addAudit('Cliente rápido criado','Caixa',c.name);toast('Cliente cadastrado e selecionado.','success','Cliente');
  };

  const openCheckout=(preferredPayment='Dinheiro')=>{
    if(!session)return toast('Abra o caixa antes de vender.','warning','Caixa fechado');
    if(!cart.length)return toast('Adicione ao menos um produto.','warning','Venda');
    if(!seller)return toast('Selecione a vendedora responsável por esta venda.','warning','Vendedora');
    if(discountPct>sellerLimit+.001&&!checkManagerPin(managerPinValue))return toast(`Desconto acima de ${sellerLimit.toFixed(1)}% exige PIN gerencial.`,`warning`,'Desconto');
    if(discountPct>=reasonThreshold&&!discountReason.trim())return toast(`Informe a justificativa do desconto.`,`warning`,'Desconto');
    if(total<=0&&!cart.some(i=>!(Number(i.price)>0)))return toast('O total da venda precisa ser maior que zero.','warning','Venda');
    const type=typeof preferredPayment==='string'&&paymentOptions.includes(preferredPayment)?preferredPayment:'Dinheiro';
    const initialAmount=cart.some(i=>!(Number(i.price)>0))?'':total.toFixed(2);
    setPaymentRows([{type,amount:initialAmount,acquirer:'',nsu:'',installments:1}]);setCashReceived(type==='Dinheiro'?initialAmount:'');setCheckoutOpen(true);
  };

  // O preço definido aqui vale apenas para esta venda; não altera o cadastro mestre.
  const setLinePrice=(id,raw)=>{
    const parsed=Number(String(raw).replace(',','.'));
    const price=Number.isFinite(parsed)&&parsed>0?Math.round(parsed*100)/100:0;
    const nextCart=cart.map(i=>String(i.productId)===String(id)?{...i,price,pricePending:!(price>0),manualPrice:true}:i);
    setCart(nextCart);
    const unfinished=nextCart.some(i=>!(Number(i.price)>0));
    const nextGross=nextCart.reduce((sum,i)=>sum+(Number(i.price)||0)*(Number(i.qty)||0),0);
    const nextDiscount=discountType==='percent'?Math.min(nextGross,nextGross*Math.max(0,Math.min(100,Number(discountInput)||0))/100):Math.min(nextGross,Math.max(0,Number(discountInput)||0));
    const nextTotal=Math.max(0,nextGross-nextDiscount);
    const amount=unfinished?'':nextTotal.toFixed(2);
    // Reajuste automático só quando há uma forma de pagamento; pagamentos mistos seguem editáveis.
    setPaymentRows(prev=>prev.length===1?[{...prev[0],amount}]:prev);
    if(paymentRows.length===1&&paymentRows[0]?.type==='Dinheiro')setCashReceived(amount);
  };

  const paymentTotal=paymentRows.reduce((s,x)=>s+(Number(x.amount)||0),0);
  const cashPart=paymentRows.filter(x=>x.type==='Dinheiro').reduce((s,x)=>s+(Number(x.amount)||0),0);
  const storeCreditPart=paymentRows.filter(x=>x.type==='Crédito da loja').reduce((s,x)=>s+(Number(x.amount)||0),0);
  const creditPlanPart=paymentRows.filter(x=>x.type==='Crediário').reduce((s,x)=>s+(Number(x.amount)||0),0);
  const change=Math.max(0,(Number(cashReceived)||0)-cashPart);
  const remaining=Math.max(0,total-paymentTotal);
  const updatePayment=(idx,patch)=>setPaymentRows(a=>a.map((x,i)=>i===idx?{...x,...patch}:x));
  const addPaymentRow=()=>{
    if(paymentRows.length>=4)return toast('Limite de 4 formas de pagamento por venda.','info','Pagamento');
    setPaymentRows(a=>[...a,{type:'Pix',amount:remaining?remaining.toFixed(2):'',acquirer:'',nsu:'',installments:1}]);
  };

  const finalize=async ()=>{
    if(finalizing)return;
    if(!can('sales.create'))return toast(`O perfil ${currentRole()} não pode concluir vendas.`,'warning','Permissão');
    if(!session)return toast('Abra o caixa primeiro.','warning','Caixa');
    if(!cart.length)return toast('Venda sem itens.','warning','Venda');
    if(!seller)return toast('Selecione a vendedora responsável por esta venda.','warning','Vendedora');

    const invalidPrice=cart.find(i=>!(Number(i.price)>0));
    if(invalidPrice)return toast(`Informe o preço de ${invalidPrice.name} na tela de pagamento antes de concluir a venda.`,'warning','Preço pendente');
    const lacking=cart.find(i=>{
      const p=products.find(x=>String(x.id)===String(i.productId));
      return !p||p.active===false||(!(p.madeToOrder||isOrderItem(i))&&(p.inventoryPending||availableFor(p)<i.qty));
    });
    if(lacking)return toast(`Estoque insuficiente para ${lacking.name}.`,'warning','Venda bloqueada');
    if(Math.abs(paymentTotal-total)>.01)return toast('A soma dos pagamentos precisa fechar exatamente o total da venda.','warning','Pagamento');
    if(paymentRows.some(p=>(Number(p.amount)||0)<=0))return toast('Há uma forma de pagamento sem valor válido.','warning','Pagamento');
    const invalidCredit=paymentRows.find(p=>p.type==='Cartão de crédito'&&((Number(p.installments)||1)>maxCreditInstallments||(Number(p.installments)||1)<1||(minCreditInstallment>0&&(Number(p.amount)||0)/(Number(p.installments)||1)<minCreditInstallment)));
    if(invalidCredit)return toast(`Revise as parcelas do cartão. Máximo ${maxCreditInstallments}x${minCreditInstallment>0?` e parcela mínima ${money(minCreditInstallment)}`:''}.`,'warning','Cartão de crédito');
    if(cashPart>0&&(Number(cashReceived)||0)<cashPart)return toast('O dinheiro recebido é menor que a parcela em dinheiro.','warning','Pagamento');if(storeCreditPart>0){const cRow=clients.find(x=>x.name===client);if(!cRow||client==='Consumidor final')return toast('Selecione um cliente para usar crédito da loja.','warning','Crédito');if((Number(cRow.credit)||0)+.001<storeCreditPart)return toast(`Crédito insuficiente. Disponível: ${money(cRow.credit||0)}.`,'warning','Crédito')} if(creditPlanPart>0){const cRow=clients.find(x=>x.name===client);if(!cRow||client==='Consumidor final')return toast('Selecione um cliente para usar crediário.','warning','Crediário');const openDebt=safeRead(STORAGE_KEYS.finance,[]).filter(f=>f.type==='receive'&&!['paid','cancelled'].includes(f.status)&&(f.client===client||String(f.desc||'').includes(client))).reduce((a,f)=>a+Math.max(0,(Number(f.amount)||0)-(Number(f.paidAmount)||0)),0);const limit=Number(cRow.creditLimit)||0;if(limit>0&&openDebt+creditPlanPart>limit+.001)return toast(`Limite de crediário excedido. Disponível: ${money(Math.max(0,limit-openDebt))}.`,'warning','Crediário')} 

    setFinalizing(true);createLocalSnapshot('before-cash-sale');
    try{
      const id=nextSequence(sales,1000),now=new Date().toISOString(),c=client||'Consumidor final';
      const normalizedPayments=paymentRows.map(x=>{const preview=paymentPreview(x);const isCredit=x.type==='Cartão de crédito',isDebit=x.type==='Cartão de débito';const installments=isCredit?Math.min(maxCreditInstallments,preview.installments):x.type==='Crediário'?preview.installments:1;const days=isCredit?30*installments:isDebit?1:0;const expectedAt=days?new Date(Date.now()+days*86400000).toISOString():null;return{...x,amount:preview.amount,feeRate:preview.feeRate,fee:preview.fee,net:preview.net,installments,installmentValue:Number((preview.amount/installments).toFixed(2)),expectedAt,nonCash:x.type==='Permuta',exchangeDescription:x.type==='Permuta'?(x.exchangeDescription||'').trim():''}});
      const paymentLabel=normalizedPayments.length>1?'Misto':normalizedPayments[0].type;
      const commissionRate=sellerCommission(seller),commission=Number((total*commissionRate/100).toFixed(2));
      const paymentFees=Number(normalizedPayments.reduce((a,p)=>a+(Number(p.fee)||0),0).toFixed(2));
      const saleCost=Number(cart.reduce((a,i)=>a+(Number(i.cost)||0)*(Number(i.qty)||0),0).toFixed(2));
      const realMargin=Number((total-saleCost-commission-paymentFees).toFixed(2));
      const sale={id,client:c,total,gross,discount:Number(discount)||0,discountPct:Number(discountPct.toFixed(2)),discountReason:discountReason.trim(),discountType,discountInput:Number(discountInput)||0,status:'Concluída',payment:paymentLabel,paymentDetails:normalizedPayments,change,date:isoToday(),items:cart,notes,seller,operator,commissionRate,commission,paymentFees,saleCost,realMargin,deliveryRequired,channel:'Caixa',cashSessionId:session.id,sessionCode:session.sessionCode,terminal:session.terminal,createdAt:now};

      const currentFinance=safeRead(STORAGE_KEYS.finance,[]),currentMov=safeRead(STORAGE_KEYS.movements,[]),currentInv=safeRead(STORAGE_KEYS.invoices,[]);
      const nextSales=[sale,...sales];
      const nextProducts=products.map(p=>{
        const i=cart.find(x=>String(x.productId)===String(p.id));
        const ordered=i&&(p.madeToOrder||isOrderItem(i));
        return i?{...p,stock:ordered?(Number(p.stock)||0):Math.max(0,(Number(p.stock)||0)-i.qty),lastSaleAt:now,pendingOrderQty:ordered?(Number(p.pendingOrderQty)||0)+i.qty:(Number(p.pendingOrderQty)||0)}:p;
      });
      const nextMov=[...cart.filter(i=>!isOrderItem(i)&&!products.find(p=>String(p.id)===String(i.productId))?.madeToOrder).map(i=>({id:uid('mov'),type:'out',product:i.name,productId:i.productId,qty:i.qty,at:now,origin:`Caixa · Venda #${id} · ${seller}`})),...currentMov];
      const entries=normalizedPayments.flatMap(p=>{const cardCredit=p.type==='Cartão de crédito',cardDebit=p.type==='Cartão de débito',creditPlan=p.type==='Crediário';const count=(cardCredit||creditPlan)?Math.max(1,Number(p.installments)||1):1;const base=Math.floor((p.amount/count)*100)/100;const feeBase=Math.floor(((Number(p.fee)||0)/count)*100)/100;return Array.from({length:count},(_,idx)=>{const d=new Date(`${isoToday()}T12:00:00`);if(cardCredit||creditPlan)d.setMonth(d.getMonth()+idx+1);else if(cardDebit)d.setDate(d.getDate()+1);const amount=idx===count-1?Number((p.amount-base*(count-1)).toFixed(2)):Number(base.toFixed(2));const feePart=idx===count-1?Number(((Number(p.fee)||0)-feeBase*(count-1)).toFixed(2)):Number(feeBase.toFixed(2));const delayed=cardCredit||cardDebit||creditPlan;const due=new Intl.DateTimeFormat('en-CA',{timeZone:BRAZIL_TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(d);return{id:uid('fin'),type:'receive',client:c,desc:`Caixa · Venda #${id} - ${c}${count>1?` · ${p.type} ${idx+1}/${count}`:normalizedPayments.length>1?` · ${p.type}`:''}`,amount,due,status:delayed?'open':immediate.includes(p.type)?'paid':'open',paidAmount:delayed?0:immediate.includes(p.type)?amount:0,paidAt:delayed?null:immediate.includes(p.type)?now:null,nonCash:p.type==='Permuta',exchangeDescription:p.type==='Permuta'?p.exchangeDescription||'':'',category:p.type==='Permuta'?'Permuta':'Vendas',costCenter:'Comercial',origin:`cash-sale:${id}`,sourceType:'sale',sourceId:id,payment:p.type,paymentFee:feePart,netAmount:Number((amount-feePart).toFixed(2)),expectedAt:delayed?new Date(`${due}T12:00:00`).toISOString():p.expectedAt||null,acquirer:p.acquirer||'',nsu:p.nsu||'',installment:idx+1,installments:count}})});
      const nextFinance=[...entries,...currentFinance];
      const nextClients=c!=='Consumidor final'?clients.map(x=>x.name===c?{...x,total:(Number(x.total)||0)+total,credit:Math.max(0,(Number(x.credit)||0)-storeCreditPart),lastPurchaseAt:now}:x):clients;
      const nextInv=[{id:uid('nf'),number:'',saleId:id,client:c,status:'Rascunho',amount:total,createdAt:now,items:cart,origin:'Caixa'},...currentInv];
      const selectedCustomer=clients.find(x=>x.name===c);
      const deliveries=deliveryRequired?safeRead('luxdecor-deliveries-v29',[]):[];
      const nextDeliveries=deliveryRequired?[{id:uid('del'),saleId:id,client:c,date:isoToday(),window:'Horário a definir',address:formatCustomerAddress(selectedCustomer),...customerAddressFields(selectedCustomer),phone:selectedCustomer?.phone||'',email:selectedCustomer?.email||'',cpf:selectedCustomer?.doc||'',status:'Agendada',items:cart,createdAt:now,autoCreated:true},...(Array.isArray(deliveries)?deliveries:[])]:null;
      const currentOrders=safeRead('luxdecor-orders-v217',[]);const nextOrders=[{id:uid('ord'),saleId:id,client:c,clientAddress:formatCustomerAddress(selectedCustomer),clientAddressFields:customerAddressFields(selectedCustomer),clientPhone:selectedCustomer?.phone||'',clientEmail:selectedCustomer?.email||'',clientCpf:selectedCustomer?.doc||'',seller,operator,date:isoToday(),createdAt:now,updatedAt:now,items:cart,total,fulfillment:deliveryRequired?'Entrega':'Retirada',status:'Aguardando separação',source:'cashier'},...(Array.isArray(currentOrders)?currentOrders:[])];
      const nextCashLog=[{id:uid('cashlog'),sessionId:session.id,sessionCode:session.sessionCode,kind:'sale',saleId:id,amount:total,cashAmount:cashPart,payment:paymentLabel,paymentDetails:normalizedPayments,change,at:now,seller,operator},...cashLog];

      const tx=await commitLocalTransaction(`cash-sale-${id}`,{
        [STORAGE_KEYS.sales]:nextSales,[STORAGE_KEYS.products]:nextProducts,[STORAGE_KEYS.finance]:nextFinance,
        [STORAGE_KEYS.clients]:nextClients,[STORAGE_KEYS.movements]:nextMov,[STORAGE_KEYS.invoices]:nextInv,
        [STORAGE_KEYS.cashLog]:nextCashLog,[STORAGE_KEYS.orders]:nextOrders,
        ...(deliveryRequired?{'luxdecor-deliveries-v29':nextDeliveries}:{})
      });
      if(!tx.ok)return toast('A venda foi revertida. Nenhum módulo ficou parcialmente atualizado.','warning','Transação protegida');

      setSales(nextSales);setProducts(nextProducts);setFinance?.(nextFinance);setClients?.(nextClients);setMovements?.(nextMov);setInvoices?.(nextInv);setCashLog(nextCashLog);
      addAudit('Venda no caixa','Caixa',`#${id} · ${seller} · ${paymentLabel} · ${money(total)}`);
      resetSale();setCheckoutOpen(false);setDetailSale(sale);
      toast(`Venda #${id} concluída. Estoque e financeiro atualizados.`,'success','Venda finalizada');
    }finally{setFinalizing(false)}
  };

  const saveMove=async ()=>{
    if(!session)return toast('Não há caixa aberto.','warning','Caixa');
    if(!can('cash.move'))return toast(`O perfil ${currentRole()} não pode fazer sangria/suprimento.`,'warning','Permissão');
    const value=Number(moveValue)||0;if(value<=0)return toast('Informe um valor válido.','warning','Caixa');
    if(!moveParty.trim())return toast(cashMove==='out'?'Informe o destino da sangria.':'Informe a origem do suprimento.','warning','Caixa');
    const highLimit=Number(erpStorage.getItem('luxdecor-high-withdrawal-limit')||1000);if(cashMove==='out'&&value>=highLimit&&!checkManagerPin(managerPinValue))return toast(`Sangria a partir de ${money(highLimit)} exige PIN gerencial.`,'warning','Autorização');
    if(cashMove==='out'&&value>expected)return toast('A sangria não pode ser maior que o dinheiro esperado no caixa.','warning','Sangria bloqueada');
    const now=new Date().toISOString();
    const nextLog=[{id:newId(),sessionId:session.id,sessionCode:session.sessionCode,terminal:session.terminal,kind:cashMove,amount:value,note:moveNote.trim(),party:moveParty.trim(),at:now,operator},...cashLog];
    if(!await writeCashState(cashMove==='in'?'cash-supply':'cash-withdraw',{session,log:nextLog,held}))return;
    addAudit(cashMove==='in'?'Suprimento de caixa':'Sangria de caixa','Caixa',`${money(value)} · ${moveNote||'sem observação'}`);
    setCashMove(null);setMoveValue('');setMoveNote('');setMoveParty('');setManagerPinValue('');
    toast(cashMove==='in'?'Suprimento registrado.':'Sangria registrada.','success','Caixa');
  };

  const closeCash=async ()=>{
    if(!session)return;
    if(!can('cash.close'))return toast(`O perfil ${currentRole()} não pode fechar o caixa.`,'warning','Permissão');
    if(closeValue==='')return toast('Informe o valor contado no caixa.','warning','Fechamento');
    const actual=Number(closeValue);if(Number.isNaN(actual)||actual<0)return toast('Valor contado inválido.','warning','Fechamento');
    createLocalSnapshot('before-close-cash');
    const now=new Date().toISOString(),diff=actual-expected;
    const report={id:uid('closing'),sessionId:session.id,sessionCode:session.sessionCode,terminal:session.terminal,operator:session.openedBy||operator,openedAt:session.openedAt,closedAt:now,opening:Number(session.opening)||0,sessionRevenue,cashSales,cashIn,cashOut,expected,actual,difference:diff,paymentSummary,acquirerSummary,cardInstallmentSummary,sellerSummary,paymentFees:sessionFees,netExpected:sessionNet,transactions:sessionLogs.length};
    const nextLog=[{id:newId(),sessionId:session.id,sessionCode:session.sessionCode,kind:'close',amount:actual,expected,difference:diff,at:now,operator:session.openedBy||operator,sessionRevenue,report},...cashLog];
    if(!await writeCashState('close-cash',{session:null,log:nextLog,held}))return;
    addAudit('Caixa fechado','Caixa',`${session.openedBy||operator} · esperado ${money(expected)} · contado ${money(actual)} · diferença ${money(diff)}`);
    setCloseReport(report);setCloseModal(false);setCloseValue('');setBlindCloseRevealed(false);resetSale();setOpenModal(true);
    toast(`Caixa fechado. Diferença: ${money(diff)}.`,'info','Fechamento');
  };

  const reopenLastCash=async ()=>{const lastClose=cashLog.find(x=>x.kind==='close'&&x.report);if(!lastClose)return toast('Nenhum fechamento disponível para reabrir.','warning','Caixa');if(!checkManagerPin(reopenPin))return toast('PIN gerencial inválido.','warning','Autorização');if(!reopenReason.trim())return toast('Informe a justificativa da reabertura.','warning','Caixa');const r=lastClose.report,now=new Date().toISOString();const restored={id:r.sessionId||newId(),sessionCode:r.sessionCode||`REAB-${localDateCode()}`,opening:Number(r.opening)||0,openedAt:r.openedAt||now,status:'open',terminal:r.terminal||terminal,openedBy:r.operator||operator,reopenedAt:now,reopenReason:reopenReason.trim()};const nextLog=[{id:newId(),sessionId:restored.id,sessionCode:restored.sessionCode,kind:'reopen',amount:0,at:now,operator,reason:reopenReason.trim()},...cashLog];if(!await writeCashState('reopen-cash',{session:restored,log:nextLog,held}))return;addAudit('Caixa reaberto','Caixa',`${restored.sessionCode} · ${reopenReason.trim()}`);setReopenOpen(false);setReopenPin('');setReopenReason('');setOpenModal(false);toast('Caixa reaberto com auditoria.','success','Caixa')};

  // Evita interpretar nomes de clientes, produtos ou observações como HTML na impressão.
  const escapeReceipt=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const printReceipt=sale=>{
    if(!sale)return;
    const cfg=receiptSettings(),width=cfg.width==='58'?58:80;
    const w=window.open('','_blank',`width=${width===58?360:460},height=820`);
    if(!w)return toast('Permita pop-ups no navegador para imprimir.','warning','Impressão bloqueada');
    const payments=(sale.paymentDetails||[]).map(p=>`<div class="line"><span>${escapeReceipt(p.type)}${p.type==='Cartão de crédito'?` · ${p.installments||1}x de ${money((Number(p.amount)||0)/(Number(p.installments)||1))}`:''}${p.acquirer?` · ${escapeReceipt(p.acquirer)}`:''}</span><b>${money(p.amount)}</b></div>`).join('');
    const items=(sale.items||[]).map(i=>`<div class="item"><div><b>${escapeReceipt(i.name)}</b>${i.sku?`<small>${escapeReceipt(i.sku)}</small>`:''}</div><div class="item-values"><span>${Number(i.qty)||0} x ${money(i.price)}</span><b>${money(i.price*i.qty)}</b></div></div>`).join('');
    const companyMeta=[cfg.cnpj?`CNPJ ${cfg.cnpj}`:'',cfg.address,cfg.phone].filter(Boolean).map(x=>`<div>${escapeReceipt(x)}</div>`).join('');
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Cupom #${escapeReceipt(sale.id)}</title><style>@page{size:${width}mm auto;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#000}body{font-family:Arial,sans-serif;width:${width}mm;padding:5mm 4mm;font-size:${width===58?10:11}px}.center{text-align:center}.store{font-size:${width===58?17:20}px;font-weight:800;letter-spacing:.04em}.meta{font-size:9px;line-height:1.45;margin-top:3px}.sep{border-top:1px dashed #000;margin:8px 0}.line{display:flex;justify-content:space-between;gap:8px;padding:2px 0}.item{padding:5px 0;border-bottom:1px dotted #777}.item small{display:block;font-size:8px;margin-top:2px}.item-values{display:flex;justify-content:space-between;gap:10px;margin-top:3px}.total{font-size:${width===58?15:18}px;font-weight:800;padding:5px 0}.footer{font-size:8px;line-height:1.45;margin-top:8px}.no-print{margin-top:12px;width:100%;padding:9px;background:#111;color:#fff;border:0}@media print{.no-print{display:none}}</style></head><body><div class="center"><div class="store">${escapeReceipt(cfg.name)}</div><div class="meta">${companyMeta||'<div>Dados da loja não preenchidos</div>'}</div></div><div class="sep"></div><div class="line"><span>VENDA</span><b>#${escapeReceipt(sale.id)}</b></div><div class="line"><span>DATA / HORA</span><b>${formatLocalDateTime(sale.createdAt||new Date())}</b></div><div class="line"><span>VENDEDORA</span><b>${escapeReceipt(sale.seller||'—')}</b></div><div class="line"><span>OPERADOR</span><b>${escapeReceipt(sale.operator||'—')}</b></div><div class="line"><span>CLIENTE</span><b>${escapeReceipt(sale.client||'Consumidor final')}</b></div>${sale.cashSessionId?`<div class="line"><span>SESSÃO</span><b>${escapeReceipt(session?.sessionCode||sale.sessionCode||'—')}</b></div>`:''}<div class="sep"></div>${items}<div class="sep"></div><div class="line"><span>SUBTOTAL</span><b>${money(sale.gross??sale.total)}</b></div>${sale.discount?`<div class="line"><span>DESCONTO</span><b>- ${money(sale.discount)}</b></div>`:''}<div class="line total"><span>TOTAL</span><b>${money(sale.total)}</b></div><div class="sep"></div>${payments||`<div class="line"><span>${escapeReceipt(sale.payment||'Pagamento')}</span><b>${money(sale.total)}</b></div>`}${sale.change?`<div class="line"><span>TROCO</span><b>${money(sale.change)}</b></div>`:''}${sale.notes?`<div class="sep"></div><div class="meta">OBS.: ${escapeReceipt(sale.notes)}</div>`:''}<div class="sep"></div><div class="center footer">Comprovante interno de venda. Não substitui documento fiscal.<br>${escapeReceipt(cfg.name)} · Sete Lagoas - MG</div><button class="no-print" onclick="window.print()">IMPRIMIR CUPOM</button><script>setTimeout(()=>window.print(),250)</script></body></html>`);
    w.document.close();
  };

  const printCloseReport=report=>{
    if(!report)return;
    const cfg=receiptSettings(),width=cfg.width==='58'?58:80;
    const w=window.open('','_blank',`width=${width===58?360:460},height=820`);
    if(!w)return toast('Permita pop-ups no navegador para imprimir.','warning','Impressão bloqueada');
    const pay=(report.paymentSummary||[]).map(([type,value])=>`<div class="line"><span>${escapeReceipt(type)}</span><b>${money(value)}</b></div>`).join('');
    const bySeller=(report.sellerSummary||[]).map(([name,value])=>`<div class="line"><span>${escapeReceipt(name)}</span><b>${money(value)}</b></div>`).join('');
    const cardInstallments=(report.cardInstallmentSummary||[]).map(([parc,value])=>`<div class="line"><span>Crédito ${escapeReceipt(parc)}</span><b>${money(value)}</b></div>`).join('');
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Fechamento ${escapeReceipt(report.sessionCode||'')}</title><style>@page{size:${width}mm auto;margin:0}*{box-sizing:border-box}body{font-family:Arial,sans-serif;width:${width}mm;margin:0;padding:5mm 4mm;font-size:${width===58?10:11}px;color:#000}.center{text-align:center}.store{font-size:18px;font-weight:800}.sep{border-top:1px dashed #000;margin:8px 0}.line{display:flex;justify-content:space-between;gap:8px;padding:3px 0}.total{font-size:15px;font-weight:800}.muted{font-size:8px}.no-print{margin-top:12px;width:100%;padding:9px;background:#111;color:#fff;border:0}@media print{.no-print{display:none}}</style></head><body><div class="center"><div class="store">${escapeReceipt(cfg.name)}</div><div class="muted">FECHAMENTO DE CAIXA</div></div><div class="sep"></div><div class="line"><span>SESSÃO</span><b>${escapeReceipt(report.sessionCode||report.sessionId)}</b></div><div class="line"><span>OPERADOR</span><b>${escapeReceipt(report.operator||'—')}</b></div><div class="line"><span>ABERTURA</span><b>${formatLocalDateTime(report.openedAt)}</b></div><div class="line"><span>FECHAMENTO</span><b>${formatLocalDateTime(report.closedAt)}</b></div><div class="sep"></div><div class="line"><span>FUNDO INICIAL</span><b>${money(report.opening)}</b></div><div class="line"><span>VENDAS</span><b>${money(report.sessionRevenue)}</b></div><div class="line"><span>SUPRIMENTOS</span><b>${money(report.cashIn)}</b></div><div class="line"><span>SANGRIAS</span><b>- ${money(report.cashOut)}</b></div><div class="sep"></div><div class="muted">VENDAS POR VENDEDORA</div>${bySeller||'<div class="line"><span>Sem vendas</span><b>R$ 0,00</b></div>'}<div class="sep"></div><div class="muted">FORMAS DE PAGAMENTO</div>${pay}${cardInstallments?`<div class="sep"></div><div class="muted">CRÉDITO POR PARCELAS</div>${cardInstallments}`:''}<div class="sep"></div><div class="line"><span>TAXAS PREVISTAS</span><b>- ${money(report.paymentFees||0)}</b></div><div class="line"><span>LÍQUIDO PREVISTO</span><b>${money(report.netExpected??report.sessionRevenue)}</b></div><div class="sep"></div><div class="line"><span>DINHEIRO ESPERADO</span><b>${money(report.expected)}</b></div><div class="line"><span>DINHEIRO CONTADO</span><b>${money(report.actual)}</b></div><div class="line total"><span>DIFERENÇA</span><b>${money(report.difference)}</b></div><div class="sep"></div><div class="center muted">${escapeReceipt(cfg.name)} · Sete Lagoas - MG</div><button class="no-print" onclick="window.print()">IMPRIMIR FECHAMENTO</button><script>setTimeout(()=>window.print(),250)</script></body></html>`);
    w.document.close();
  };

  const openReturn=sale=>{
    if(!can('sales.cancel'))return toast(`O perfil ${currentRole()} precisa de autorização para devolução.`, 'warning', 'Permissão');
    const qty={};(sale.items||[]).forEach(i=>qty[i.productId]=0);
    setReturnQty(qty);setReturnReason('');setReturnSale(sale);
  };

  const confirmReturn=async ()=>{
    if(!returnSale)return;
    const selected=(returnSale.items||[]).map(i=>({...i,returnQty:Math.max(0,Math.min(Number(i.qty)||0,Number(returnQty[i.productId])||0))})).filter(i=>i.returnQty>0);
    if(!selected.length)return toast('Selecione ao menos uma quantidade para devolver.','warning','Devolução');
    if(!returnReason.trim())return toast('Informe o motivo da devolução.','warning','Devolução');
    const already=(returnSale.returns||[]).flatMap(r=>r.items||[]).reduce((m,i)=>{m[String(i.productId)]=(m[String(i.productId)]||0)+(Number(i.qty)||0);return m},{});
    const over=selected.find(i=>(already[String(i.productId)]||0)+i.returnQty>Number(i.qty||0));
    if(over)return toast(`A quantidade devolvida de ${over.name} ultrapassa a quantidade vendida.`,'warning','Devolução');
    const ratio=Number(returnSale.gross)>0?Number(returnSale.total)/Number(returnSale.gross):1;
    const refund=selected.reduce((sum,i)=>sum+(Number(i.price)||0)*i.returnQty,0)*ratio;
    const now=new Date().toISOString(),returnId=uid('return');
    const currentFinance=safeRead(STORAGE_KEYS.finance,[]),currentMov=safeRead(STORAGE_KEYS.movements,[]);
    const returnedItems=selected.map(i=>({productId:i.productId,name:i.name,sku:i.sku,qty:i.returnQty,price:i.price}));
    const nextProducts=products.map(p=>{const r=selected.find(i=>String(i.productId)===String(p.id));return r?{...p,stock:(Number(p.stock)||0)+r.returnQty,lastReturnAt:now}:p});
    const currentReturns=returnSale.returns||[];
    const nextReturns=[...currentReturns,{id:returnId,at:now,reason:returnReason.trim(),amount:Number(refund.toFixed(2)),items:returnedItems,seller:returnSale?.seller||seller||'Sem vendedora'}];
    const totalReturned=[...nextReturns].flatMap(r=>r.items||[]).reduce((m,i)=>{m[String(i.productId)]=(m[String(i.productId)]||0)+(Number(i.qty)||0);return m},{});
    const fullyReturned=(returnSale.items||[]).every(i=>(totalReturned[String(i.productId)]||0)>=Number(i.qty||0));
    const nextSales=sales.map(x=>x.id===returnSale.id?{...x,returns:nextReturns,returnedAmount:Number((Number(x.returnedAmount||0)+refund).toFixed(2)),status:fullyReturned?'Devolvida':'Parcialmente devolvida'}:x);
    const nextMov=[...returnedItems.map(i=>({id:uid('mov'),type:'in',product:i.name,productId:i.productId,qty:i.qty,at:now,origin:`Devolução · Venda #${returnSale.id} · ${returnReason.trim()}`})),...currentMov];
    const nextFinance=[{id:uid('fin'),type:'pay',desc:`Devolução venda #${returnSale.id} - ${returnSale.client}`,amount:Number(refund.toFixed(2)),due:isoToday(),status:'paid',paidAmount:Number(refund.toFixed(2)),paidAt:now,category:'Estornos',costCenter:'Comercial',origin:`return:${returnSale.id}:${returnId}`,payment:returnSale.payment},...currentFinance];
    const creditPaid=(returnSale.paymentDetails||[]).filter(p=>p.type==='Crédito da loja').reduce((a,p)=>a+(Number(p.amount)||0),0);const creditRestore=returnSale.total?refund*(creditPaid/Number(returnSale.total)):0;const nextClients=returnSale.client!=='Consumidor final'?clients.map(c=>c.name===returnSale.client?{...c,total:Math.max(0,(Number(c.total)||0)-refund),credit:(Number(c.credit)||0)+creditRestore,lastReturnAt:now}:c):clients;
    const tx=await commitLocalTransaction(`return-${returnSale.id}-${returnId}`,{[STORAGE_KEYS.sales]:nextSales,[STORAGE_KEYS.products]:nextProducts,[STORAGE_KEYS.finance]:nextFinance,[STORAGE_KEYS.movements]:nextMov,[STORAGE_KEYS.clients]:nextClients});
    if(!tx.ok)return toast('A devolução foi revertida para preservar a consistência dos dados.','warning','Proteção local');
    setSales(nextSales);setProducts(nextProducts);setFinance?.(nextFinance);setMovements?.(nextMov);setClients?.(nextClients);
    addAudit('Devolução registrada','Caixa',`Venda #${returnSale.id} · ${money(refund)} · ${returnReason.trim()}`);
    setDetailSale(nextSales.find(x=>x.id===returnSale.id)||null);setReturnSale(null);setReturnQty({});setReturnReason('');
    toast(`Devolução registrada: ${money(refund)}. Estoque e financeiro atualizados.`,'success','Devolução');
  };

  const clearSale=()=>{resetSale();setConfirmClear(false);toast('Venda atual limpa.','info','Caixa')};

  return <section className="page cashier-page cashier-v26">
    <PageHeader title="Vendas / PDV" subtitle="Registre vendas de móveis diretamente, sem abrir ou fechar caixa. Histórico e recebimentos permanecem registrados."/>

    <div className="pdv-topline">
      <div className="pdv-session-card is-open"><span className="pdv-led"/><div><small>PRONTO PARA VENDER</small><b>PDV Lux Decor</b></div></div>
      <div className="pdv-metric"><UserRound/><span><small>Operador</small><b>{operator}</b></span></div>
      <div className="pdv-metric"><CircleDollarSign/><span><small>Vendas de hoje</small><b>{money(todayCashSales.reduce((sum,s)=>sum+(Number(s.total)||0),0))}</b></span></div>
      <div className="pdv-metric"><ReceiptText/><span><small>Vendas de hoje</small><b>{todayCashSales.length}</b></span></div>
      <div className="pdv-metric"><Calculator/><span><small>Ticket médio de hoje</small><b>{money(todayCashSales.length?todayCashSales.reduce((sum,s)=>sum+(Number(s.total)||0),0)/todayCashSales.length:0)}</b></span></div>
    </div>

    <div className="pdv-simple-guide"><span><b>1</b> Escolha os produtos</span><ChevronRight size={14}/><span><b>2</b> Informe vendedora e cliente</span><ChevronRight size={14}/><span><b>3</b> Receba e finalize</span></div>
    <div className="pdv-toolbar">
      <div className="cash-tabs pdv-tabs">
        <button className={tab==='sale'?'active':''} onClick={()=>setTab('sale')}><ShoppingBag size={16}/>Venda</button>
        <button className={tab==='held'?'active':''} onClick={()=>setTab('held')}><PauseCircle size={16}/>Suspensas <em>{held.length}</em></button>
        <button className={tab==='history'?'active':''} onClick={()=>setTab('history')}><History size={16}/>Histórico</button>
      </div>
      <div className="pdv-shortcuts"><span><kbd>F4</kbd> Buscar</span><span><kbd>F6</kbd> Cliente</span><span><kbd>F8</kbd> Pagamento</span><span><kbd>F9</kbd> Suspender</span></div>
    </div>

    {tab==='sale'&&<div className="pdv-workspace">
      <div className="pdv-left">
        <div className="panel pdv-search-panel">
          <div className="pdv-search"><Barcode size={20}/><input ref={searchRef} value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar por nome, modelo, cor, medida ou código (F4)" onKeyDown={e=>{if(e.key==='Enter'){const term=q.trim().toLowerCase();const exact=products.find(p=>p.active!==false&&((p.sku||'').toLowerCase()===term||(p.name||'').toLowerCase()===term));if(exact){add(exact);setQ('')}}}}/><button onClick={()=>{setQ('');searchRef.current?.focus()}} title="Limpar busca"><X size={16}/></button></div>
          <div className="pdv-categories">{categories.map(c=><button key={c} className={category===c?'active':''} onClick={()=>setCategory(c)}>{c}</button>)}</div>
        </div>
        <div className="panel pdv-products-panel">
          <div className="pdv-section-head"><div><b>Produtos</b><small>{filtered.length} resultado(s)</small></div><span>Toque no produto para vender ou solicitar sob encomenda</span></div>
          <div className="pdv-product-list">{filtered.map(p=>{const available=availableFor(p),low=available<=Number(p.minStock||0);return <button className="pdv-product-row" key={p.id} onClick={()=>add(p)} disabled={!session||(available<=0&&!p.madeToOrder)}><span className="pdv-product-code">{(p.name||'P').slice(0,2).toUpperCase()}</span><span className="pdv-product-main"><b>{p.name}</b><small>{p.sku} · {[p.variant,p.color,p.category||'Sem categoria'].filter(Boolean).join(' · ')}</small></span><span className={`pdv-stock ${low?'low':''}`}><small>{available<=0&&!p.madeToOrder?'Sem estoque':p.madeToOrder||orderNeeded(p)?'Sob encomenda':'Disponível'}</small><b>{available<=0&&!p.madeToOrder?'Indisponível':p.inventoryPending?'Conferir estoque':p.madeToOrder?'Sob pedido':`${available} ${p.unit||'UN'}`}</b></span><strong>{Number(p.price)>0?money(p.price):'Preço pendente'}</strong><Plus size={17}/></button>})}{!filtered.length&&<div className="cash-empty"><Search size={28}/><b>Nenhum produto encontrado</b><span>Revise a busca ou escolha outra categoria.</span></div>}</div>
        </div>
      </div>

      <div className="panel pdv-cart-panel">
        <div className="pdv-cart-header"><div><ShoppingBag size={20}/><span><b>Venda atual</b><small>{units} unidade(s) · {cart.length} item(ns)</small></span></div><div><button title="Limpar venda" onClick={()=>cart.length&&setConfirmClear(true)} disabled={!cart.length}><RefreshCcw size={15}/></button><button title="Suspender venda" onClick={()=>cart.length&&setConfirmHold(true)} disabled={!cart.length}><PauseCircle size={15}/></button></div></div>
        <div className="pdv-cart-scroll">{cart.length?cart.map(i=><div className="pdv-cart-item" key={i.productId}><div className="pdv-cart-info"><b>{i.name}</b><small>{i.sku} · {Number(i.price)>0?money(i.price)+' / un.':'Preço pendente'} {(i.pendingOrder||products.find(p=>String(p.id)===String(i.productId))?.madeToOrder)&&<span className="lux-pdv-order-chip">Sob encomenda</span>}</small></div><div className="pdv-qty-control"><button onClick={()=>bumpQty(i.productId,-1)}><Minus size={14}/></button><input value={i.qty} onChange={e=>setQty(i.productId,e.target.value)}/><button onClick={()=>bumpQty(i.productId,1)}><Plus size={14}/></button></div><strong>{Number(i.price)>0?money(i.price*i.qty):'A cotar'}</strong><button className="pdv-remove" onClick={()=>setCart(a=>a.filter(x=>String(x.productId)!==String(i.productId)))}><Trash2 size={15}/></button></div>):<div className="pdv-empty-cart"><ShoppingBag size={34}/><b>Venda vazia</b><span>Pesquise um produto e clique para adicionar.</span></div>}</div>

        <div className="pdv-sale-data">
          <label className="pdv-seller-select"><span>Vendedora responsável *</span><select value={seller} onChange={e=>{const name=e.target.value;if(!name){setSeller('');return}const row=sellerByName(name);if(row?.pin){setPendingSeller(name);setSellerPin('');setSellerPinOpen(true)}else setSeller(name)}}><option value="">Selecione a vendedora</option>{sellerOptions.map(x=><option key={x.id||x.name} value={x.name}>{x.name}</option>)}</select><small>Cada venda fica no nome da vendedora, mas o saldo físico continua em um único caixa.</small></label>
          <div className="pdv-customer"><label><span>Cliente</span><select value={client} onChange={e=>setClient(e.target.value)}><option>Consumidor final</option>{clients.map(c=><option key={c.id}>{c.name}</option>)}</select></label><button onClick={()=>setClientOpen(true)} title="Cadastrar cliente"><UserPlus size={17}/></button></div>
          <label className="pdv-notes"><span>Observação da venda</span><input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Entrega, referência, observação interna..."/></label>
          <div className="pdv-discount-row"><div className="pdv-discount-switch"><button className={discountType==='value'?'active':''} onClick={()=>setDiscountType('value')}><Tag size={14}/>R$</button><button className={discountType==='percent'?'active':''} onClick={()=>setDiscountType('percent')}><Percent size={14}/>%</button></div><label><span>Desconto</span><input type="number" min="0" max={discountType==='percent'?100:gross} value={discountInput} onChange={e=>setDiscountInput(e.target.value)}/></label></div>{discountPct>=reasonThreshold&&<label className="pdv-inline-field"><span>Justificativa do desconto *</span><input value={discountReason} onChange={e=>setDiscountReason(e.target.value)} placeholder="Motivo do desconto"/></label>}{discountPct>sellerLimit&&<label className="pdv-inline-field"><span>PIN gerencial · acima de {sellerLimit.toFixed(1)}%</span><input type="password" inputMode="numeric" value={managerPinValue} onChange={e=>setManagerPinValue(e.target.value.replace(/\D/g,''))}/></label>}<label className="pdv-delivery-check"><input type="checkbox" checked={deliveryRequired} onChange={e=>setDeliveryRequired(e.target.checked)}/>Gerar ordem de entrega automaticamente</label>
        </div>

        <div className="pdv-total-box">{cart.some(i=>!(Number(i.price)>0))&&<p className="lux-pdv-quote-pending">Produto com preço pendente: informe o valor na próxima etapa para concluir.</p>}<div><span>Subtotal</span><b>{money(gross)}</b></div><div className="discount"><span>Desconto</span><b>- {money(discount)}</b></div><div className="grand"><span>TOTAL</span><b>{money(total)}</b></div></div>
        <button className="pdv-pay-button" onClick={()=>openCheckout()} disabled={!session||!cart.length}><WalletCards size={20}/><span>PAGAMENTO<small>F8</small></span><ChevronRight size={20}/></button>
      </div>
    </div>}

    {tab==='held'&&<div className="panel pdv-table-panel"><div className="pdv-section-head"><div><b>Vendas suspensas</b><small>Retome sem perder os itens.</small></div></div><div className="pdv-held-list">{held.map(h=><div className="pdv-held-row" key={h.id}><span><small>Horário</small><b>{new Date(h.createdAt).toLocaleString('pt-BR')}</b></span><span><small>Cliente</small><b>{h.client}</b></span><span><small>Vendedora</small><b>{h.seller||'—'}</b></span><span><small>Itens</small><b>{(h.cart||[]).reduce((s,x)=>s+x.qty,0)}</b></span><span><small>Total</small><b>{money(h.total)}</b></span><div><button className="primary" onClick={()=>resume(h)}><PlayCircle size={14}/>Retomar</button><button className="secondary" onClick={()=>deleteHeld(h.id)}><Trash2 size={14}/></button></div></div>)}{!held.length&&<p className="empty">Nenhuma venda suspensa.</p>}</div></div>}

    {tab==='history'&&<div className="pdv-history-grid">
      <div className="pdv-history-main">
        <div className="pdv-payment-grid">
          {paymentSummary.length?paymentSummary.map(([type,value])=>{const Icon=paymentIcon[type]||WalletCards;return <div key={type}><Icon size={17}/><span>{type}</span><b>{money(value)}</b></div>}):<div><WalletCards size={17}/><span>Sem movimento</span><b>{money(0)}</b></div>}
        </div>
        <div className="panel pdv-table-panel">
          <div className="pdv-section-head"><div><b>Vendas de hoje</b><small>{todayCashSales.length} venda(s) do caixa.</small></div></div>
          <div className="pdv-sale-history">{todayCashSales.slice(0,100).map(s=><button key={s.id} onClick={()=>setDetailSale(s)}><span><small>Venda</small><b>#{s.id}</b></span><span><small>Cliente</small><b>{s.client}</b></span><span><small>Pagamento</small><b>{s.payment}</b></span><span><small>Vendedora</small><b>{s.seller||'—'}</b></span><span><small>Total</small><b>{money(s.total)}</b></span><ChevronRight size={16}/></button>)}{!todayCashSales.length&&<p className="empty">Nenhuma venda do caixa hoje.</p>}</div>
        </div>
        <div className="panel pdv-timeline-panel">
          <div className="pdv-section-head"><div><b>Timeline da sessão</b><small>Abertura, vendas e movimentações do caixa.</small></div></div>
          <div className="pdv-timeline">{sessionLogs.slice(0,30).map(x=><div key={x.id}><i className={`timeline-dot ${x.kind}`}/><span><b>{x.kind==='sale'?`Venda #${x.saleId}`:x.kind==='in'?'Suprimento':x.kind==='out'?'Sangria':x.kind==='open'?'Abertura':'Fechamento'}</b><small>{formatLocalDateTime(x.at)} · {x.seller?`Vendedora: ${x.seller}`:`Operador: ${x.operator||session?.openedBy||operator}`}</small></span><strong>{x.kind==='out'?'- ':''}{money(x.amount||0)}</strong></div>)}</div>
        </div>
      </div>
      <div className="panel pdv-session-summary"><h3>Resumo da sessão</h3><div><span>Fundo inicial<b>{money(session?.opening||0)}</b></span><span>Vendas totais<b>{money(sessionRevenue)}</b></span><span>Vendas em dinheiro<b>{money(cashSales)}</b></span><span>Suprimentos<b>{money(cashIn)}</b></span><span>Sangrias<b>- {money(cashOut)}</b></span><strong>Dinheiro esperado<b>{money(expected)}</b></strong></div><h4>Vendas por vendedora</h4><div className="pdv-seller-summary">{sellerSummary.length?sellerSummary.map(([name,value])=><span key={name}>{name}<b>{money(value)}</b></span>):<small>Nenhuma venda na sessão.</small>}</div></div>
    </div>}

    {orderTarget&&<Modal title="Adicionar sob encomenda" subtitle={orderTarget.name} onClose={()=>setOrderTarget(null)}>
      <div className="lux-pdv-order-confirm">
        <p>{orderTarget.inventoryPending?'A quantidade física deste produto ainda não foi conferida.':'Não há quantidade disponível para pronta-entrega.'}</p>
        <p>Deseja incluir este item como <b>sob encomenda</b>? A venda gerará uma pendência de entrega, sem diminuir o estoque físico.</p>
        <div className="pdv-open-actions">
          <button type="button" className="secondary" onClick={()=>setOrderTarget(null)}>Cancelar</button>
          <button type="button" className="primary" onClick={()=>{const target=orderTarget;setOrderTarget(null);add(target,true)}}><PackageCheck size={16}/>Adicionar sob encomenda</button>
        </div>
      </div>
    </Modal>}
    {false&&openModal&&<Modal size="cash-open" title="Abrir caixa" subtitle="Confirme o terminal para começar a vender." onClose={()=>setOpenModal(false)}><div className="pdv-open-compact"><label className="form-field"><span>Operador</span><div className="pdv-operator-locked" aria-label={`Operador ${operator}, definido pelo login`}><b>{operator}</b><LockKeyhole size={16}/></div></label><label className="form-field"><span>Terminal</span><select value={terminal} onChange={e=>setTerminal(e.target.value)}><option>Caixa 01</option><option>Caixa 02</option><option>Caixa 03</option></select></label>{currentRole()==='Administrador'&&<div className="pdv-optional-opening"><button type="button" className="pdv-optional-opening-toggle" onClick={()=>{setShowOptionalFloat(v=>!v);setOpenValue("");}}>{showOptionalFloat?"Ocultar opções adicionais":"Opções adicionais"}</button>{showOptionalFloat&&<label className="form-field pdv-opening-field"><span>Valor na gaveta (opcional)</span><div className="pdv-money-input"><i>R$</i><input type="number" min="0" step="0.01" placeholder="0,00" value={openValue} onChange={e=>setOpenValue(e.target.value)}/></div><small>Deixe vazio quando não houver valor inicial. A abertura será registrada com R$ 0,00.</small></label>}</div>}<div className="pdv-open-audit"><Clock3 size={16}/><span>A abertura será registrada na auditoria · {formatLocalDateTime(new Date())}</span></div><div className="pdv-open-actions"><button className="secondary" type="button" onClick={()=>setOpenModal(false)}>Cancelar</button><button className="pdv-modal-primary" type="button" onClick={openCash}><UnlockKeyhole size={17}/>ABRIR CAIXA</button></div></div></Modal>}

    {false&&reopenOpen&&<Modal title="Reabrir último caixa" subtitle="Operação administrativa com registro obrigatório." onClose={()=>setReopenOpen(false)}><div className="form-grid"><label className="form-field wide"><span>Justificativa</span><input autoFocus value={reopenReason} onChange={e=>setReopenReason(e.target.value)} placeholder="Ex.: divergência identificada após fechamento"/></label><label className="form-field wide"><span>PIN gerencial</span><input type="password" inputMode="numeric" value={reopenPin} onChange={e=>setReopenPin(e.target.value.replace(/\D/g,''))}/></label></div><div className="modal-actions"><button className="primary" onClick={reopenLastCash}>Reabrir sessão</button></div></Modal>}

    {cashMove&&<Modal title={cashMove==='in'?'Suprimento de caixa':'Sangria de caixa'} subtitle="A movimentação será registrada no fechamento e na auditoria." onClose={()=>setCashMove(null)}><div className="form-grid"><label className="form-field"><span>Valor</span><input autoFocus type="number" min="0" value={moveValue} onChange={e=>setMoveValue(e.target.value)}/></label><label className="form-field"><span>{cashMove==='in'?'Origem':'Destino'}</span><select value={moveParty} onChange={e=>setMoveParty(e.target.value)}><option value="">Selecione</option>{(cashMove==='in'?['Troco inicial','Reforço de caixa','Devolução de sangria','Outro']:['Cofre','Banco','Retirada administrativa','Despesa','Outro']).map(x=><option key={x}>{x}</option>)}</select></label><label className="form-field wide"><span>Motivo / observação</span><input value={moveNote} onChange={e=>setMoveNote(e.target.value)} placeholder="Informe o motivo da movimentação"/></label>{cashMove==='out'&&Number(moveValue)>=Number(erpStorage.getItem('luxdecor-high-withdrawal-limit')||1000)&&<label className="form-field wide"><span>PIN gerencial</span><input type="password" inputMode="numeric" value={managerPinValue} onChange={e=>setManagerPinValue(e.target.value.replace(/\D/g,''))}/></label>}</div><div className="modal-actions"><button className="primary" onClick={saveMove}>Confirmar movimentação</button></div></Modal>}

    {false&&closeModal&&<Modal size="large" title="Fechamento de caixa" subtitle="Fechamento cego: conte primeiro, confira depois." onClose={()=>{setCloseModal(false);setBlindCloseRevealed(false)}}><div className="pdv-close-grid"><div className="pdv-close-summary">{!blindCloseRevealed?<div className="blind-close-note"><ShieldCheck size={22}/><b>Valores esperados ocultos</b><small>Informe o dinheiro contado para revelar a conferência.</small></div>:<><span>Fundo inicial <b>{money(session?.opening||0)}</b></span><span>Vendas da sessão <b>{money(sessionRevenue)}</b></span><span>Vendas em dinheiro <b>{money(cashSales)}</b></span><span>Suprimentos <b>{money(cashIn)}</b></span><span>Sangrias <b>- {money(cashOut)}</b></span><strong>Dinheiro esperado <em>{money(expected)}</em></strong><h4>Formas de pagamento</h4>{paymentSummary.map(([type,value])=><span key={type}>{type}<b>{money(value)}</b></span>)}</>}</div><div><label className="form-field"><span>Valor contado no caixa</span><input autoFocus type="number" min="0" value={closeValue} onChange={e=>setCloseValue(e.target.value)}/></label>{!blindCloseRevealed?<button className="pdv-modal-primary" onClick={()=>{if(closeValue==='')return toast('Informe o valor contado.','warning','Fechamento');setBlindCloseRevealed(true)}}><Eye size={17}/>CONFERIR VALORES</button>:<>{closeValue!==''&&<div className={`pdv-close-difference ${Number(closeValue)-expected===0?'ok':Number(closeValue)-expected>0?'positive':'negative'}`}><span>Diferença</span><b>{money(Number(closeValue)-expected)}</b></div>}<button className="pdv-modal-primary" onClick={closeCash}><LockKeyhole size={17}/>CONFIRMAR FECHAMENTO</button></>}</div></div></Modal>}

    {checkoutOpen&&<Modal size="large" title="Finalizar venda" subtitle={`${seller||'Sem vendedora'} · ${client||'Consumidor final'} · ${money(total)}`} onClose={()=>!finalizing&&setCheckoutOpen(false)} preventBackdropClose={finalizing}>
      <div className="pdv-checkout pdv-checkout-v2171">
        <div className="pdv-payment-side">
          {cart.some(i=>i.manualPrice||i.pricePending||!(Number(i.price)>0))&&
            <div className="lux-pdv-price-panel">
              <div><b>Valores dos produtos</b><small>Confira os valores antes de finalizar. Os preços informados aqui valem somente para esta venda.</small></div>
              {cart.filter(i=>i.manualPrice||i.pricePending||!(Number(i.price)>0)).map(i=>
                <label className="lux-pdv-price-line" key={i.productId}>
                  <span><b>{i.name}</b><small>{i.qty} unidade(s) · {i.sku}</small></span>
                  <span className="lux-pdv-price-control"><small>Preço unitário (R$)</small><input type="number" min="0.01" step="0.01" inputMode="decimal" aria-label={`Preço unitário de ${i.name}`} placeholder="Informe o preço" value={i.price>0?i.price:''} onChange={e=>setLinePrice(i.productId,e.target.value)}/></span>
                </label>)}
              {cart.some(i=>!(Number(i.price)>0))&&<p>Informe os preços pendentes para habilitar a finalização da venda.</p>}
            </div>}
          <div className="pdv-checkout-context"><span><small>Vendedora</small><b>{seller||'—'}</b></span><span><small>Cliente</small><b>{client||'Consumidor final'}</b></span><span><small>Operador</small><b>{operator||'—'}</b></span><span><small>Recebimento</small><b>{deliveryRequired?'Entrega':'Retirada'}</b></span></div>
          <div className="pdv-split-head"><div><b>Forma de pagamento</b><small>Escolha a forma e confira o valor. Para pagamento misto, adicione outra forma.</small></div><div><button className="secondary" onClick={()=>{setPaymentRows([{type:'Dinheiro',amount:'',acquirer:'',nsu:'',installments:1}]);setCashReceived('')}}>Limpar</button><button className="secondary" onClick={addPaymentRow} disabled={paymentRows.length>=4}><Plus size={14}/>Adicionar</button></div></div>
          <div className="pdv-payment-rows">{paymentRows.map((p,i)=>{const preview=paymentPreview(p);return <div className="pdv-payment-card" key={i}>
            <div className="pdv-payment-card-main"><label><span>Forma</span><select value={p.type} onChange={e=>{const type=e.target.value;updatePayment(i,{type,acquirer:'',nsu:'',installments:1});if(paymentRows.length===1&&type==='Dinheiro')setCashReceived(String(p.amount||total.toFixed(2)));else if(paymentRows.length===1)setCashReceived('')}}>{paymentOptions.map(x=><option key={x}>{x}</option>)}</select></label><label><span>Valor</span><input type="number" min="0" step="0.01" value={p.amount} onChange={e=>updatePayment(i,{amount:e.target.value})}/></label>{paymentRows.length>1&&<button className="pdv-payment-remove" title="Remover forma" onClick={()=>setPaymentRows(a=>a.filter((_,idx)=>idx!==i))}><Trash2 size={15}/></button>}</div>
            {(p.type==='Cartão de crédito'||p.type==='Crediário')&&<div className="pdv-payment-extra"><label><span>Parcelas</span><select value={Math.max(1,Number(p.installments)||1)} onChange={e=>updatePayment(i,{installments:Number(e.target.value)})}>{Array.from({length:p.type==='Cartão de crédito'?maxCreditInstallments:24},(_,idx)=>idx+1).map(n=><option key={n} value={n}>{n}x · {money((Number(p.amount)||0)/n)}</option>)}</select></label>{p.type==='Cartão de crédito'&&<div className="pdv-installment-preview"><b>{preview.installments}x de {money(preview.installmentValue)}</b><small>Taxa prevista {preview.feeRate.toFixed(2)}% · líquido {money(preview.net)}</small></div>}</div>}
            {p.type==='Cartão de débito'&&<div className="pdv-installment-preview single"><b>Débito · 1x</b><small>Taxa prevista {preview.feeRate.toFixed(2)}% · líquido {money(preview.net)}</small></div>}
            {(p.type==='Cartão de crédito'||p.type==='Cartão de débito')&&<div className="pdv-payment-extra"><label><span>Adquirente</span><select value={p.acquirer||''} onChange={e=>updatePayment(i,{acquirer:e.target.value})}><option value="">Não informado</option><option>Stone</option><option>Cielo</option><option>Rede</option><option>Getnet</option><option>PagBank</option><option>Mercado Pago</option><option>Outra</option></select></label><label><span>NSU</span><input value={p.nsu||''} onChange={e=>updatePayment(i,{nsu:e.target.value})} placeholder="Opcional"/></label></div>}
            {p.type==='Pix'&&<div className="pdv-payment-extra"><label><span>ID / EndToEnd</span><input value={p.nsu||''} onChange={e=>updatePayment(i,{nsu:e.target.value})} placeholder="Opcional"/></label></div>}
            {p.type==='Permuta'&&<div className="pdv-payment-extra"><label className="form-field"><span>Bem ou serviço recebido na permuta</span><input value={p.exchangeDescription||''} onChange={e=>updatePayment(i,{exchangeDescription:e.target.value})} placeholder="Descreva o que foi recebido (opcional)"/></label><small className="lux-permuta-notice">Permuta é pagamento não monetário. O valor negociado será registrado sem entrada de dinheiro no caixa.</small></div>}
          </div>})}</div>
          {cashPart>0&&<label className="form-field pdv-cash-received"><span>Valor recebido em dinheiro</span><input type="number" min="0" step="0.01" value={cashReceived} onChange={e=>setCashReceived(e.target.value)}/><small>Troco calculado automaticamente.</small></label>}
        </div>
        <div className="pdv-checkout-summary pdv-checkout-summary-v2171">
          <h4>Conferência final</h4>
          <span>Subtotal <b>{money(gross)}</b></span><span>Desconto <b>- {money(discount)}</b></span><strong>TOTAL <em>{money(total)}</em></strong>
          <div className="pdv-summary-payments">{paymentRows.map((p,i)=>{const preview=paymentPreview(p);return <div key={`${p.type}-${i}`}><span>{p.type}{p.type==='Cartão de crédito'?` · ${preview.installments}x`:''}</span><b>{money(preview.amount)}</b>{p.type==='Cartão de crédito'&&<small>{preview.installments}x de {money(preview.installmentValue)} · líquido {money(preview.net)}</small>}</div>})}</div>
          <span className={Math.abs(paymentTotal-total)<.01?'ok-line':'warn-line'}>Pagamentos <b>{money(paymentTotal)}</b></span>{remaining>0&&<span className="warn-line">Falta pagar <b>{money(remaining)}</b></span>}{paymentTotal>total+.01&&<span className="warn-line">Excedente <b>{money(paymentTotal-total)}</b></span>}{cashPart>0&&<span>Troco <b>{money(change)}</b></span>}
          <div className="pdv-checkout-protection"><ShieldCheck size={19}/><div><b>Operação protegida</b><small>Os registros são gravados neste navegador. Confira o pagamento e o estoque antes de confirmar.</small></div></div>
          <div className="pdv-checkout-actions"><button className="secondary" onClick={()=>setCheckoutOpen(false)} disabled={finalizing}>Voltar para venda</button><button className="pdv-confirm-sale" onClick={finalize} disabled={finalizing||total<=0||cart.some(i=>!(Number(i.price)>0))||Math.abs(paymentTotal-total)>.01}>{finalizing?'PROCESSANDO...':'FINALIZAR VENDA'}</button></div>
        </div>
      </div>
    </Modal>}

    {sellerPinOpen&&<Modal title="PIN da vendedora" subtitle={pendingSeller} onClose={()=>{setSellerPinOpen(false);setPendingSeller('');setSellerPin('')}}><label className="form-field"><span>PIN rápido</span><input autoFocus type="password" inputMode="numeric" maxLength="6" value={sellerPin} onChange={e=>setSellerPin(e.target.value.replace(/\D/g,''))} onKeyDown={e=>{if(e.key==='Enter'){if(verifySellerPin(pendingSeller,sellerPin)){setSeller(pendingSeller);setSellerPinOpen(false);setPendingSeller('');setSellerPin('')}else toast('PIN da vendedora inválido.','warning','Vendedora')}}}/></label><div className="modal-actions"><button className="primary" onClick={()=>{if(!verifySellerPin(pendingSeller,sellerPin))return toast('PIN da vendedora inválido.','warning','Vendedora');setSeller(pendingSeller);setSellerPinOpen(false);setPendingSeller('');setSellerPin('')}}>Confirmar vendedora</button></div></Modal>}

    {clientOpen&&<Modal title="Cadastrar cliente" subtitle="Informações para a venda e a entrega dos móveis." onClose={()=>setClientOpen(false)}>
      <div className="form-grid">
        <label className="form-field wide"><span>Nome completo</span><input autoFocus autoComplete="name" required value={newClient.name} onChange={e=>setNewClient({...newClient,name:e.target.value})} placeholder="Nome do cliente"/></label>
        <label className="form-field wide"><span>Rua / Avenida</span><input autoComplete="address-line1" value={newClient.street} onChange={e=>setNewClient({...newClient,street:e.target.value})} placeholder="Nome da rua ou avenida"/></label>
        <label className="form-field"><span>Número</span><input value={newClient.number} onChange={e=>setNewClient({...newClient,number:e.target.value})} placeholder="Número ou S/N"/></label>
        <label className="form-field"><span>Bairro</span><input autoComplete="address-level3" value={newClient.neighborhood} onChange={e=>setNewClient({...newClient,neighborhood:e.target.value})} placeholder="Bairro"/></label>
        <label className="form-field"><span>CEP</span><input inputMode="numeric" autoComplete="postal-code" maxLength={9} value={newClient.cep} onChange={e=>setNewClient({...newClient,cep:e.target.value})} placeholder="00000-000"/></label>
        <label className="form-field"><span>Complemento</span><input autoComplete="address-line2" value={newClient.complement} onChange={e=>setNewClient({...newClient,complement:e.target.value})} placeholder="Apartamento, bloco, referência"/></label>
        <label className="form-field"><span>Cidade</span><input autoComplete="address-level2" value={newClient.city} onChange={e=>setNewClient({...newClient,city:e.target.value})} placeholder="Cidade"/></label>
        <label className="form-field"><span>Estado (UF)</span><input maxLength={2} autoComplete="address-level1" value={newClient.state} onChange={e=>setNewClient({...newClient,state:e.target.value.toUpperCase()})} placeholder="MG"/></label>
        <label className="form-field"><span>E-mail</span><input type="email" autoComplete="email" value={newClient.email} onChange={e=>setNewClient({...newClient,email:e.target.value})} placeholder="cliente@exemplo.com"/></label>
        <label className="form-field"><span>CPF</span><input inputMode="numeric" autoComplete="off" maxLength={14} value={newClient.doc} onChange={e=>setNewClient({...newClient,doc:e.target.value})} placeholder="000.000.000-00"/></label>
        <label className="form-field wide"><span>Telefone / WhatsApp</span><input type="tel" autoComplete="tel" value={newClient.phone} onChange={e=>setNewClient({...newClient,phone:e.target.value})} placeholder="(31) 99999-9999"/></label>
      </div>
      <div className="modal-actions"><button className="primary" onClick={saveClient}><UserPlus size={15}/>Cadastrar e selecionar</button></div>
    </Modal>}

    {returnSale&&<Modal size="large" title={`Troca / devolução · Venda #${returnSale.id}`} subtitle="Selecione somente os itens e quantidades que retornaram." onClose={()=>setReturnSale(null)}><div className="return-modal-list">{(returnSale.items||[]).map(i=>{const previous=(returnSale.returns||[]).flatMap(r=>r.items||[]).filter(x=>String(x.productId)===String(i.productId)).reduce((s,x)=>s+(Number(x.qty)||0),0);const available=Math.max(0,(Number(i.qty)||0)-previous);return <div key={i.productId}><span><b>{i.name}</b><small>{i.sku||'Sem SKU'} · vendido {i.qty} · já devolvido {previous}</small></span><label>Qtd.<input type="number" min="0" max={available} value={returnQty[i.productId]||0} onChange={e=>setReturnQty({...returnQty,[i.productId]:Math.max(0,Math.min(available,Number(e.target.value)||0))})}/></label><strong>{money((Number(i.price)||0)*(Number(returnQty[i.productId])||0))}</strong></div>})}</div><label className="form-field wide"><span>Motivo da devolução</span><input value={returnReason} onChange={e=>setReturnReason(e.target.value)} placeholder="Ex.: troca por outro modelo, desistência, avaria..."/></label><div className="modal-actions"><button className="secondary" onClick={()=>setReturnSale(null)}>Cancelar</button><button className="primary" onClick={confirmReturn}><RefreshCcw size={15}/>Confirmar devolução</button></div></Modal>}

    <ConfirmDialog open={confirmHold} title="Suspender venda" message="A venda ficará salva para continuar depois, sem baixar o estoque." details={[`${units} unidade(s)`,money(total)]} confirmLabel="Suspender venda" onConfirm={holdSale} onCancel={()=>setConfirmHold(false)}/>
    <ConfirmDialog open={confirmClear} title="Limpar venda atual" message="Todos os itens, cliente, desconto e observação serão removidos da venda atual." details={[`${units} unidade(s)`,money(total)]} confirmLabel="Limpar venda" onConfirm={clearSale} onCancel={()=>setConfirmClear(false)}/>

    <SidePanel open={!!closeReport} title="Fechamento concluído" subtitle={closeReport?.sessionCode||'Resumo da sessão'} onClose={()=>setCloseReport(null)}>{closeReport&&<div className="sale-detail-panel"><div className="detail-status"><CheckCircle2 size={18}/><span><b>Caixa encerrado</b><small>{formatLocalDateTime(closeReport.closedAt)} · {closeReport.operator||'—'}</small></span></div><div className="detail-block"><span>Vendas <b>{money(closeReport.sessionRevenue)}</b></span><span>Esperado <b>{money(closeReport.expected)}</b></span><span>Contado <b>{money(closeReport.actual)}</b></span><span>Diferença <b>{money(closeReport.difference)}</b></span></div><h4>Vendas por vendedora</h4>{(closeReport.sellerSummary||[]).map(([name,value])=><div className="detail-item" key={name}><span>{name}</span><b>{money(value)}</b></div>)}<h4>Formas de pagamento</h4>{(closeReport.paymentSummary||[]).map(([type,value])=><div className="detail-item" key={type}><span>{type}</span><b>{money(value)}</b></div>)}{(closeReport.acquirerSummary||[]).length>0&&<><h4>Adquirentes</h4>{closeReport.acquirerSummary.map(([name,value])=><div className="detail-item" key={name}><span>{name}</span><b>{money(value)}</b></div>)}</>}{(closeReport.cardInstallmentSummary||[]).length>0&&<><h4>Crédito por parcelas</h4>{closeReport.cardInstallmentSummary.map(([name,value])=><div className="detail-item" key={name}><span>{name}</span><b>{money(value)}</b></div>)}</>}<div className="detail-block"><span>Taxas previstas <b>- {money(closeReport.paymentFees||0)}</b></span><span>Líquido previsto <b>{money(closeReport.netExpected??closeReport.sessionRevenue)}</b></span></div><button className="primary full" onClick={()=>printCloseReport(closeReport)}><Printer size={14}/>Imprimir fechamento térmico</button></div>}</SidePanel>

    <SidePanel open={!!detailSale} title={detailSale?`Venda #${detailSale.id}`:''} subtitle="Resumo completo da operação" onClose={()=>setDetailSale(null)}>{detailSale&&<div className="sale-detail-panel"><div className="detail-status"><CheckCircle2 size={18}/><span><b>{detailSale.status}</b><small>{detailSale.date} · {detailSale.seller}</small></span></div><div className="detail-block"><span>Cliente <b>{detailSale.client}</b></span><span>Pagamento <b>{detailSale.payment}</b></span><span>Total <b>{money(detailSale.total)}</b></span><span>Comissão <b>{money(detailSale.commission||0)}</b></span></div><h4>Pagamentos</h4>{(detailSale.paymentDetails||[]).map((p,i)=><div className="detail-item" key={`${p.type}-${i}`}><span>{p.type}<small>{p.type==='Cartão de crédito'?`${p.installments||1}x de ${money((Number(p.amount)||0)/(Number(p.installments)||1))}${p.acquirer?` · ${p.acquirer}`:''}`:p.acquirer||p.nsu||''}</small></span><b>{money(p.amount)}</b></div>)}<h4>Itens</h4>{(detailSale.items||[]).map(i=><div className="detail-item" key={i.productId}><span>{i.qty}x {i.name}<small>{i.sku}</small></span><b>{money(i.price*i.qty)}</b></div>)}<div className="detail-actions-stack"><button className="secondary full" onClick={()=>openReturn(detailSale)} disabled={detailSale.status==='Devolvida'}><RefreshCcw size={14}/>Troca / devolução</button><button className="primary full" onClick={()=>printReceipt(detailSale)}><Printer size={14}/>Imprimir cupom térmico</button></div></div>}</SidePanel>
  </section>;
}
