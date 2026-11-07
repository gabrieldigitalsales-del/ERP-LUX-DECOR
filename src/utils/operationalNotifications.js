import{isoToday}from'./erpEngine';

// Avisos operacionais do ERP familiar. Sem NCM, notas ou alertas fiscais.
export function deriveOperationalNotifications({products=[],finance=[],sales=[]}={}){
 const today=isoToday();
 const low=(Array.isArray(products)?products:[]).filter(p=>p.active!==false&&Number(p.stock||0)<=Number(p.minStock||0));
 const overdue=(Array.isArray(finance)?finance:[]).filter(x=>!['paid','cancelled'].includes(x.status)&&x.due&&x.due<today);
 const now=Date.now(),tomorrow=now+86400000;
 const expiring=(Array.isArray(sales)?sales:[]).filter(s=>s.status==='Orçamento'&&s.reservationActive&&s.reservationExpiresAt&&new Date(s.reservationExpiresAt).getTime()>now&&new Date(s.reservationExpiresAt).getTime()<=tomorrow);
 return [
  low.length?{id:'auto-low',title:'Estoque abaixo do mínimo',text:`${low.length} produto(s) precisam de reposição.`,page:'stock',kind:'warn'}:null,
  overdue.length?{id:'auto-overdue',title:'Contas vencidas',text:`${overdue.length} lançamento(s) financeiros estão vencidos.`,page:'finance',kind:'warn'}:null,
  expiring.length?{id:'auto-reservation',title:'Reservas próximas do vencimento',text:`${expiring.length} orçamento(s) vencem nas próximas 24 horas.`,page:'sales',kind:'warn'}:null
 ].filter(Boolean);
}
export function cleanOperationalNotifications(items){
 return (Array.isArray(items)?items:[]).filter(n=>n&&typeof n==='object'&&
  !/ncm|classifica(ção|cao) fiscal|rascunhos fiscais|nota fiscal|documentos? fiscais|compras atrasadas/i.test(String(n.title||'')+' '+String(n.text||''))&&
  !['auto-ncm','auto-nf','auto-purchase'].includes(String(n.id||'')));
}
