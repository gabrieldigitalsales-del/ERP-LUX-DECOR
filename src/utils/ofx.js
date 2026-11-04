const txt=(block,tag)=>{const m=block.match(new RegExp(`<${tag}>([^<\\r\\n]+)`,'i'));return m?m[1].trim():''};
const isoDate=v=>{const s=String(v||'').slice(0,8);return s.length===8?`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`:''};
export function parseOFX(text=''){
 const rows=[];const blocks=String(text).match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi)||String(text).match(/<STMTTRN>[\s\S]*?(?=<STMTTRN>|<\/BANKTRANLIST>|$)/gi)||[];
 for(const b of blocks){const amount=Number(String(txt(b,'TRNAMT')).replace(',','.'));if(!Number.isFinite(amount))continue;rows.push({id:txt(b,'FITID')||`${txt(b,'DTPOSTED')}-${amount}-${rows.length}`,date:isoDate(txt(b,'DTPOSTED')),amount,desc:txt(b,'MEMO')||txt(b,'NAME')||'Movimentação bancária',type:amount>=0?'credit':'debit',matched:false})}
 return rows;
}
export function suggestMatches(bankRows,finance){
 return bankRows.map(r=>{let best=null,score=-1;for(const f of finance){if(['cancelled'].includes(f.status))continue;const target=f.type==='receive'?Number(f.amount||0):-Number(f.amount||0);let s=0;if(Math.abs(target-r.amount)<0.01)s+=4;if(f.due===r.date)s+=3;else if(f.due&&r.date){const d=Math.abs((new Date(f.due)-new Date(r.date))/86400000);if(d<=3)s+=1}if(String(r.desc).toLowerCase().includes(String(f.desc||'').toLowerCase().slice(0,8)))s+=1;if(s>score){score=s;best=f}}return{...r,suggestion:score>=4?best:null,score}})
}
