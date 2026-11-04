import React,{useMemo,useState}from'react';
import{ArrowDownToLine,ArrowUpFromLine,ArrowLeftRight,Search,Download,CalendarDays,History,Info,Package,RotateCcw,Trash2}from'lucide-react';
import PageHeader from'../components/PageHeader';
import Modal from'../components/Modal';
const dateFormat=d=>{if(!d)return'—';const x=new Date(d);return Number.isNaN(+x)?'—':x.toLocaleString('pt-BR')};
const detailType=x=>x==='in'?'Entrada':x==='out'?'Saída':x==='transfer'?'Transferência':x==='archive'?'Arquivamento':x==='restore'?'Restauração':x==='adjust'?'Ajuste':x||'Movimento';
const iconFor=x=>x==='in'?ArrowDownToLine:x==='out'?ArrowUpFromLine:x==='transfer'?ArrowLeftRight:x==='archive'?Trash2:x==='restore'?RotateCcw:History;
const toDay=d=>{const x=new Date(d||0);if(!Number.isFinite(+x))return '';return [x.getFullYear(),String(x.getMonth()+1).padStart(2,'0'),String(x.getDate()).padStart(2,'0')].join('-')};
const isOut=x=>x.type==='out'||x.type==='archive';
export default function Movements({movements=[]}){
 const[q,setQ]=useState(''),[kind,setKind]=useState('all'),[origin,setOrigin]=useState('all'),[start,setStart]=useState(''),[end,setEnd]=useState(''),[selected,setSelected]=useState(null);
 const origins=useMemo(()=>['all',...[...new Set(movements.map(x=>x.origin||'Sem origem'))].sort()], [movements]);
 const rows=useMemo(()=>movements.filter(x=>{
  const text=[x.product,x.productId,x.sku,x.type,x.origin,x.beforeLocation,x.afterLocation].join(' ').toLowerCase();
  const day=toDay(x.at);
  return text.includes(q.trim().toLowerCase())&&(kind==='all'||x.type===kind)&&(origin==='all'||(x.origin||'Sem origem')===origin)&&(!start||day>=start)&&(!end||day<=end);
 }).sort((a,b)=>(new Date(b.at||0))-(new Date(a.at||0))),[movements,q,kind,origin,start,end]);
 const metrics=useMemo(()=>({entries:rows.filter(x=>x.type==='in').reduce((sum,x)=>sum+(Number(x.qty)||0),0),exits:rows.filter(x=>x.type==='out').reduce((sum,x)=>sum+(Number(x.qty)||0),0),transfers:rows.filter(x=>x.type==='transfer').length,records:rows.length}),[rows]);
 const exportCsv=()=>{
  const data=rows.map(x=>({Tipo:detailType(x.type),Produto:x.product||'',SKU:x.sku||'',Quantidade:x.qty??'',Antes:x.before??'',Depois:x.after??'',LocalAnterior:x.beforeLocation||'',LocalNovo:x.afterLocation||'',Origem:x.origin||'',Data:x.at||''}));
  if(!data.length)return;
  const keys=Object.keys(data[0]),escape=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
  const csv='\ufeff'+[keys.map(escape).join(';'),...data.map(x=>keys.map(k=>escape(x[k])).join(';'))].join('\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='luxdecor-movimentacoes.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
 };
 return <section className="page lux-movements-page">
  <PageHeader title="Movimentações" subtitle="Consulte entradas, saídas, transferências, inventários e alterações do estoque em um único histórico."
   action={<button className="secondary" disabled={!rows.length} onClick={exportCsv}><Download size={15}/>Exportar CSV</button>}/>
  <div className="lux-movement-summary">
   <div><small>Movimentações</small><strong>{metrics.records}</strong></div>
   <div><small>Unidades recebidas</small><strong className="positive">+{metrics.entries}</strong></div>
   <div><small>Unidades retiradas</small><strong className="danger">-{metrics.exits}</strong></div>
   <div><small>Transferências</small><strong>{metrics.transfers}</strong></div>
  </div>
  <div className="lux-movement-toolbar">
   <label className="search"><Search size={17}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Produto, código, origem ou localização..."/></label>
   <select className="period-input" aria-label="Tipo de movimento" value={kind} onChange={e=>setKind(e.target.value)}>
    <option value="all">Todos os movimentos</option><option value="in">Entradas</option><option value="out">Saídas</option><option value="transfer">Transferências</option><option value="archive">Arquivados</option><option value="restore">Restaurados</option><option value="adjust">Ajustes</option>
   </select>
   <select className="period-input" aria-label="Origem" value={origin} onChange={e=>setOrigin(e.target.value)}>
    {origins.map(x=><option value={x} key={x}>{x==='all'?'Todas as origens':x}</option>)}
   </select>
   <label className="lux-movement-date"><CalendarDays size={14}/><span>De</span><input type="date" value={start} max={end||undefined} onChange={e=>setStart(e.target.value)}/></label>
   <label className="lux-movement-date"><CalendarDays size={14}/><span>Até</span><input type="date" value={end} min={start||undefined} onChange={e=>setEnd(e.target.value)}/></label>
   {(q||start||end||kind!=='all'||origin!=='all')&&<button className="secondary" onClick={()=>{setQ('');setStart('');setEnd('');setKind('all');setOrigin('all')}}>Limpar filtros</button>}
  </div>
  <div className="list-panel">
   <div className="list-head lux-movement-columns"><span>Movimento</span><span>Produto e referência</span><span>Quantidade</span><span>Origem / local</span><span>Data / hora</span><span></span></div>
   {rows.length?rows.slice(0,1000).map(x=>{
    const Icon=iconFor(x.type);
    return <div className="list-row lux-movement-columns" key={x.id||x.at+x.product}>
     <span className={'lux-movement-type '+(x.type||'')}><Icon size={15}/>{detailType(x.type)}</span>
     <span><b>{x.product||'Produto'}</b><small>{x.sku||'Sem código'}</small></span>
     <span><b>{x.type==='transfer'?'—':(x.type==='in'?'+':x.type==='out'?'-':'')+(x.qty??0)+' un.'}</b>{x.before!=null&&x.after!=null&&<small>{x.before} → {x.after}</small>}</span>
     <span><b>{x.origin||'Sistema'}</b>{x.type==='transfer'&&<small>{x.beforeLocation||'—'} → {x.afterLocation||'—'}</small>}</span>
     <span>{dateFormat(x.at)}</span>
     <button className="secondary tiny" aria-label={'Detalhes de '+(x.product||'movimento')} onClick={()=>setSelected(x)}><Info size={14}/>Detalhes</button>
    </div>
   }):<div className="empty-list">Nenhum movimento para esses filtros.</div>}
   {rows.length>1000&&<p className="notice">Exibindo 1.000 de {rows.length} registros. Refine os filtros ou exporte o CSV completo.</p>}
  </div>
  {selected&&<Modal title="Detalhes da movimentação" subtitle={selected.product||'Histórico do estoque'} onClose={()=>setSelected(null)}>
   <div className="lux-movement-details">
    <div><small>Tipo</small><b>{detailType(selected.type)}</b></div>
    <div><small>SKU</small><b>{selected.sku||'—'}</b></div>
    <div><small>Quantidade</small><b>{selected.qty??'—'}</b></div>
    <div><small>Data e hora</small><b>{dateFormat(selected.at)}</b></div>
    <div><small>Origem</small><b>{selected.origin||'Sistema'}</b></div>
    <div><small>Estoque antes → depois</small><b>{selected.before??'—'} → {selected.after??'—'}</b></div>
    {selected.type==='transfer'&&<div className="wide"><small>Localização</small><b>{selected.beforeLocation||'—'} → {selected.afterLocation||'—'}</b></div>}
   </div>
   <p className="lux-movement-hint">Registros históricos são preservados. Correções de quantidade devem ser feitas pelo Inventário ou pela entrada/saída de estoque.</p>
  </Modal>}
 </section>;
}
