import React,{useMemo,useState}from'react';
import{ClipboardCheck,Search,Truck,PackageCheck,Clock3,CheckCircle2,Eye,ArrowRight,MapPin,UserRound,Printer,Save}from'lucide-react';
import PageHeader from'../components/PageHeader';import Modal from'../components/Modal';import{safeReadArray,safeWrite}from'../utils/storage';import{toast}from'../components/ToastHost';import{addAudit}from'../utils/audit';import{money,isoToday}from'../utils/erpEngine';import{uid}from'../utils/ids';

const ORDER_KEY='luxdecor-orders-v217';
const STAGES=['Aguardando separação','Em separação','Pronto','Em rota','Concluído','Cancelado'];
const nextStage=s=>({
 'Aguardando separação':'Em separação','Em separação':'Pronto','Pronto':'Em rota','Em rota':'Concluído'
}[s]||s);
export default function Orders({sales=[]}){
 const[orders,setOrders]=useState(()=>safeReadArray(ORDER_KEY,[]));
 const[q,setQ]=useState(''),[filter,setFilter]=useState('all'),[detail,setDetail]=useState(null),[deliveryForm,setDeliveryForm]=useState(null);
 const deliveries=safeReadArray('luxdecor-deliveries-v29',[]);
 const list=useMemo(()=>orders.filter(o=>`${o.client||''} ${o.saleId||''} ${o.seller||''} ${(o.items||[]).map(i=>i.name).join(' ')}`.toLowerCase().includes(q.toLowerCase())).filter(o=>filter==='all'||o.status===filter),[orders,q,filter]);
 const stats=useMemo(()=>({open:orders.filter(o=>!['Concluído','Cancelado'].includes(o.status)).length,separating:orders.filter(o=>o.status==='Em separação').length,ready:orders.filter(o=>o.status==='Pronto').length,delivery:orders.filter(o=>o.fulfillment==='Entrega'&&!['Concluído','Cancelado'].includes(o.status)).length}),[orders]);
 const persist=next=>{setOrders(next);safeWrite(ORDER_KEY,next)};
 const advance=o=>{const status=nextStage(o.status);if(status===o.status)return;const now=new Date().toISOString();const next=orders.map(x=>x.id===o.id?{...x,status,updatedAt:now}:x);persist(next);const ds=safeReadArray('luxdecor-deliveries-v29',[]);if(o.fulfillment==='Entrega'){const map={'Em separação':'Em separação','Pronto':'Agendada','Em rota':'Em rota','Concluído':'Entregue'};if(map[status])safeWrite('luxdecor-deliveries-v29',ds.map(d=>String(d.saleId)===String(o.saleId)?{...d,status:map[status]}:d))}addAudit('Etapa do pedido alterada','Pedidos',`Venda #${o.saleId} · ${o.status} → ${status}`);toast(`Pedido movido para ${status}.`,'success','Pedidos')};

 const saleFor=o=>sales.find(s=>String(s.id)===String(o.saleId));
 const deliveryFor=o=>safeReadArray('luxdecor-deliveries-v29',[]).find(d=>String(d.saleId)===String(o.saleId));
 const openDetails=o=>{setDetail(o);const d=deliveryFor(o)||{};setDeliveryForm({date:d.date||'',window:d.window||'08:00–12:00',address:d.address||o.clientAddress||'',phone:d.phone||o.clientPhone||'',driver:d.driver||'',team:d.team||'',region:d.region||'',occurrence:d.occurrence||''})};
 const saveDelivery=()=>{
  if(!detail||detail.fulfillment!=='Entrega'||!deliveryForm)return;
  if(!deliveryForm.date||!deliveryForm.address.trim())return toast('Informe a data e o endereço da entrega.','warning','Pedidos');
  const current=safeReadArray('luxdecor-deliveries-v29',[]);
  const index=current.findIndex(d=>String(d.saleId)===String(detail.saleId));
  const now=new Date().toISOString();
  const base=index>=0?current[index]:{id:uid('del'),saleId:detail.saleId,client:detail.client,items:detail.items||[],createdAt:now,status:'Agendada'};
  const record={...base,...deliveryForm,updatedAt:now};
  const updated=index>=0?current.map((d,i)=>i===index?record:d):[record,...current];
  safeWrite('luxdecor-deliveries-v29',updated);
  const next=orders.map(o=>o.id===detail.id?{...o,clientAddress:deliveryForm.address,clientPhone:deliveryForm.phone,updatedAt:now}:o);
  persist(next);setDetail(next.find(o=>o.id===detail.id));
  addAudit('Entrega programada','Pedidos','Venda #'+detail.saleId+' · '+deliveryForm.date);
  toast('Programação salva com sucesso.','success','Pedidos');
 };
 const printOrder=o=>{
  const d=deliveryFor(o)||{};
  const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const rows=(o.items||[]).map(i=>'<tr><td>'+escapeHtml(i.name)+'</td><td>'+escapeHtml(i.qty||1)+'</td><td>'+escapeHtml(money(i.price||0))+'</td></tr>').join('');
  const html='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Ordem '+escapeHtml(o.saleId)+'</title><style>body{font:14px Arial,sans-serif;padding:28px;max-width:780px;margin:auto;color:#222}header{border-bottom:2px solid #222;padding-bottom:12px}h1{font-size:22px}h2{font-size:16px;margin-top:24px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:12px}small{color:#555}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #ddd;padding:9px;text-align:left}.sign{margin-top:65px;border-top:1px solid #444;width:300px;text-align:center;padding:8px}@media print{button{display:none}}<\/style></head><body><header><h1>LUX DECOR · ORDEM DE '+(o.fulfillment==='Entrega'?'ENTREGA':'RETIRADA')+'</h1><b>Venda #'+escapeHtml(o.saleId)+'</b> · '+escapeHtml(o.date||'')+'</header><h2>Cliente e atendimento</h2><div class="meta"><div><small>Cliente</small><p>'+escapeHtml(o.client||'Consumidor final')+'</p></div><div><small>Telefone</small><p>'+escapeHtml(d.phone||o.clientPhone||'Não informado')+'</p></div><div><small>Vendedor</small><p>'+escapeHtml(o.seller||'—')+'</p></div><div><small>Status</small><p>'+escapeHtml(o.status||'—')+'</p></div></div><h2>Programação</h2><p><b>Endereço:</b> '+escapeHtml(d.address||o.clientAddress||'Não informado')+'</p><p><b>Data:</b> '+escapeHtml(d.date||'A definir')+' · <b>Horário:</b> '+escapeHtml(d.window||'A definir')+'</p><p><b>Motorista:</b> '+escapeHtml(d.driver||d.team||'A definir')+'</p><p><b>Observações:</b> '+escapeHtml(d.occurrence||'—')+'</p><h2>Produtos</h2><table><thead><tr><th>Produto</th><th>Qtd.</th><th>Valor unit.</th></tr></thead><tbody>'+rows+'</tbody></table><p><b>Total da venda: '+escapeHtml(money(o.total||0))+'</b></p><div class="sign">Assinatura de recebimento</div><button onclick="window.print()">Imprimir</button></body></html>';
  const w=window.open('','_blank','width=850,height=850');if(!w)return toast('Permita a janela de impressão no navegador.','warning','Pedidos');
  w.document.open();w.document.write(html);w.document.close();w.focus();
 };

 return <section className="page"><PageHeader title="Pedidos" subtitle="Acompanhe a operação depois da venda: separação, retirada, entrega e conclusão."/>
  <div className="order-kpis"><div><small>Em aberto</small><b>{stats.open}</b></div><div><small>Em separação</small><b>{stats.separating}</b></div><div><small>Prontos</small><b>{stats.ready}</b></div><div><small>Com entrega</small><b>{stats.delivery}</b></div></div>
  <div className="orders-intro"><ClipboardCheck size={18}/><div><b>Venda acontece somente no Caixa.</b><p>Depois da finalização, o pedido aparece aqui automaticamente para a equipe acompanhar separação, retirada ou entrega.</p></div></div>
  <div className="orders-toolbar"><div className="orders-search"><Search size={15}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar cliente, venda, vendedora ou produto..."/></div><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Todos os status</option>{STAGES.map(s=><option key={s}>{s}</option>)}</select></div>
  <div className="orders-list"><div className="orders-row orders-head"><span>Pedido</span><span>Cliente</span><span>Atendimento</span><span>Itens</span><span>Total</span><span>Status</span><span>Ações</span></div>{list.map(o=>{const sale=saleFor(o);return <div className="orders-row" key={o.id}><span><b>#{o.saleId}</b><small>{o.date||'—'}</small></span><span><b>{o.client||'Consumidor final'}</b><small>{o.seller||'Sem vendedora'}</small></span><span><b>{o.fulfillment||'Retirada'}</b><small>{o.fulfillment==='Entrega'?'Entrega programada':'Retirada na loja'}</small></span><span><b>{(o.items||[]).reduce((a,i)=>a+(Number(i.qty)||0),0)} un.</b><small>{(o.items||[]).length} produto(s)</small></span><span><b>{money(Number(o.total)||Number(sale?.total)||0)}</b><small>{sale?.payment||'—'}</small></span><span><em className={`order-status ${o.status==='Concluído'?'done':o.status==='Cancelado'?'cancelled':''}`}>{o.status}</em></span><span className="order-actions"><button className="secondary" onClick={()=>openDetails(o)} title="Detalhes"><Eye size={14}/></button>{!['Concluído','Cancelado'].includes(o.status)&&<button className="primary compact" onClick={()=>advance(o)}><ArrowRight size={14}/>{nextStage(o.status)}</button>}</span></div>})}{!list.length&&<p className="empty-list">Nenhum pedido encontrado.</p>}</div>
  {detail&&<Modal title={'Pedido da venda #'+detail.saleId} onClose={()=>{setDetail(null);setDeliveryForm(null)}} wide>
   <div className="order-detail">
    <div className="order-detail-grid">
     <div><small>Cliente</small><b>{detail.client||'Consumidor final'}</b></div>
     <div><small>Vendedor</small><b>{detail.seller||'—'}</b></div>
     <div><small>Operador</small><b>{detail.operator||'—'}</b></div>
     <div><small>Atendimento</small><b>{detail.fulfillment||'Retirada'}</b></div>
     <div><small>Status</small><b>{orders.find(o=>o.id===detail.id)?.status||detail.status}</b></div>
     <div><small>Total</small><b>{money(detail.total||0)}</b></div>
    </div>
    <div className="order-items">{(detail.items||[]).map((i,idx)=><div key={String(i.productId||i.name)+'-'+idx}><PackageCheck size={15}/><span><b>{i.name}</b><small>{i.qty} × {money(i.price||0)}</small></span></div>)}</div>
    {detail.fulfillment==='Entrega'&&deliveryForm&&<div className="order-schedule">
      <h3><Truck size={17}/> Programação da entrega</h3>
      <div className="form-grid">
       <label className="form-field"><span>Data prevista</span><input type="date" value={deliveryForm.date} onChange={e=>setDeliveryForm(f=>({...f,date:e.target.value}))}/></label>
       <label className="form-field"><span>Horário</span><select value={deliveryForm.window} onChange={e=>setDeliveryForm(f=>({...f,window:e.target.value}))}><option>08:00–12:00</option><option>12:00–16:00</option><option>16:00–20:00</option><option>Horário combinado</option></select></label>
       <label className="form-field wide"><span>Endereço completo</span><input value={deliveryForm.address} onChange={e=>setDeliveryForm(f=>({...f,address:e.target.value}))} placeholder="Rua, número, bairro, cidade e CEP"/></label>
       <label className="form-field"><span>Telefone</span><input value={deliveryForm.phone} onChange={e=>setDeliveryForm(f=>({...f,phone:e.target.value}))}/></label>
       <label className="form-field"><span>Bairro / região</span><input value={deliveryForm.region} onChange={e=>setDeliveryForm(f=>({...f,region:e.target.value}))}/></label>
       <label className="form-field"><span>Motorista</span><input value={deliveryForm.driver} onChange={e=>setDeliveryForm(f=>({...f,driver:e.target.value}))}/></label>
       <label className="form-field"><span>Equipe</span><input value={deliveryForm.team} onChange={e=>setDeliveryForm(f=>({...f,team:e.target.value}))}/></label>
       <label className="form-field wide"><span>Observações / instruções</span><textarea rows={2} value={deliveryForm.occurrence} onChange={e=>setDeliveryForm(f=>({...f,occurrence:e.target.value}))}/></label>
      </div>
      <button className="primary" onClick={saveDelivery}><Save size={15}/> Salvar programação</button>
    </div>}
    <div className="modal-actions"><button className="secondary" onClick={()=>printOrder(orders.find(o=>o.id===detail.id)||detail)}><Printer size={15}/> Imprimir ordem</button></div>
   </div>
  </Modal>}
 </section>
}
