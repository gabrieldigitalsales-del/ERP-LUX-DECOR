import ncmPayload from '../data/ncmTable.json';

const OFFICIAL_SEARCH='https://portalunico.siscomex.gov.br/classif/#/nomenclatura/avancada?perfil=publico';
let cache=null;
let metadata=null;

function stripHtml(s=''){
  return String(s).replace(/<[^>]*>/g,' ').replace(/&nbsp;/gi,' ').replace(/\s+/g,' ').trim();
}
function norm(s=''){
  return stripHtml(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
}
function digits(code=''){return String(code).replace(/\D/g,'')}

const FURNITURE_TERMS=new Set(['cadeira','cadeiras','poltrona','poltronas','sofa','sofas','banco','bancos','banqueta','banquetas','assento','assentos','mesa','mesas','aparador','aparadores','comoda','comodas','criado','criados','guarda','roupa','roupeiro','roupeiros','rack','racks','painel','paineis','armario','armarios','estante','estantes','buffet','buffets','movel','moveis','cabeceira','cabeceiras']);
const TERM_ALIASES={
  cadeira:['assento'],cadeiras:['assento'],poltrona:['assento','estofado'],poltronas:['assento','estofado'],sofa:['assento','estofado'],sofas:['assento','estofado'],
  banqueta:['assento'],banquetas:['assento'],banco:['assento'],bancos:['assento'],
  mesa:['moveis'],mesas:['moveis'],aparador:['moveis'],aparadores:['moveis'],comoda:['moveis','quartos'],comodas:['moveis','quartos'],
  criado:['moveis','quartos'],criados:['moveis','quartos'],roupeiro:['moveis','quartos'],roupeiros:['moveis','quartos'],armario:['moveis'],armarios:['moveis'],
  rack:['moveis'],racks:['moveis'],painel:['moveis'],paineis:['moveis'],estante:['moveis'],estantes:['moveis'],buffet:['moveis'],buffets:['moveis'],cabeceira:['moveis','quartos'],cabeceiras:['moveis','quartos'],
  madeira:['madeira'],metal:['metal'],aco:['metal'],ferro:['metal'],aluminio:['metal'],plastico:['plastico'],vidro:['vidro'],bambu:['bambu'],rotim:['rotim'],rattan:['rotim'],vime:['vime'],
  estofado:['estofado'],estofada:['estofado'],estofados:['estofado'],estofadas:['estofado']
};

function buildIndex(payload){
  const raw=Array.isArray(payload)?payload:(payload?.Nomenclaturas||payload?.nomenclaturas||payload?.items||payload?.data||[]);
  metadata={updated:payload?.Data_Ultima_Atualizacao_NCM||'',act:payload?.Ato||'',total:raw.length};
  const byDigits=new Map();
  for(const x of raw){
    const d=digits(x.Codigo||x.codigo||x.code||x.NCM||x.ncm||'');
    if(d && !byDigits.has(d))byDigits.set(d,stripHtml(x.Descricao||x.descricao||x.description||x.texto||''));
  }
  const out=[];
  for(const x of raw){
    const codeRaw=String(x.Codigo||x.codigo||x.code||x.NCM||x.ncm||'');
    const code=digits(codeRaw);
    const description=stripHtml(x.Descricao||x.descricao||x.description||x.texto||'');
    if(code.length!==8 || !description)continue;
    const hierarchy=[];
    for(let len=2;len<8;len++){
      const parent=byDigits.get(code.slice(0,len));
      if(parent && !hierarchy.includes(parent) && parent!==description)hierarchy.push(parent);
    }
    const context=[...hierarchy,description].join(' · ');
    out.push({code,formatted:codeRaw,description,context,search:norm(context)});
  }
  return out;
}

function ensureIndex(){
  if(cache?.length)return cache;
  cache=buildIndex(ncmPayload);
  if(!cache.length)throw new Error('Tabela NCM embutida sem códigos finais válidos.');
  return cache;
}

export async function loadOfficialNCM(){
  return ensureIndex();
}

function expandedWords(query){
  const base=norm(query).split(' ').filter(w=>w.length>2);
  const expanded=[...base];
  for(const w of base){
    for(const a of TERM_ALIASES[w]||[])if(!expanded.includes(a))expanded.push(a);
  }
  return expanded;
}

export async function searchOfficialNCM(query,limit=8){
  const q=norm(query);if(!q)return[];
  const codeQuery=digits(query);
  const baseWords=q.split(' ').filter(w=>w.length>2);
  const words=expandedWords(query);
  const furniture=baseWords.some(w=>FURNITURE_TERMS.has(w));
  const items=ensureIndex();

  // Busca direta por código quando o usuário digita NCM parcial/completo.
  if(codeQuery.length>=4 && /^\s*[\d.]+\s*$/.test(String(query))){
    return items.filter(x=>x.code.startsWith(codeQuery)).slice(0,limit).map(x=>({code:x.code,description:x.description,context:x.context,score:999}));
  }

  return items.map(x=>{
    let score=0;
    for(const w of words){
      if(x.search.includes(w))score+=Math.max(3,w.length);
      if(norm(x.description).includes(w))score+=Math.max(2,Math.round(w.length*.8));
    }
    if(furniture && (x.code.startsWith('9401')||x.code.startsWith('9403')))score+=18;
    if(furniture && !x.code.startsWith('94'))score-=12;
    const seating=baseWords.some(w=>['cadeira','cadeiras','poltrona','poltronas','sofa','sofas','banco','bancos','banqueta','banquetas','assento','assentos'].includes(w));
    const upholstered=baseWords.some(w=>['estofado','estofada','estofados','estofadas','sofa','sofas','poltrona','poltronas'].includes(w));
    const wood=baseWords.includes('madeira');
    const metal=baseWords.some(w=>['metal','aco','ferro','aluminio'].includes(w));
    if(seating){
      if(x.code.startsWith('9401'))score+=8;
      if(x.code.startsWith('94013') && !baseWords.some(w=>['giratoria','giratorio','ajustavel'].includes(w)))score-=26;
      if(x.code.startsWith('94014') && !baseWords.some(w=>['cama','camas','sofa-cama','sofá-cama'].includes(w)))score-=26;
      if(x.code.startsWith('94019'))score-=30;
      if(wood && upholstered && x.code==='94016100')score+=34;
      if(wood && !upholstered && x.code==='94016900')score+=34;
      if(metal && upholstered && x.code==='94017100')score+=34;
      if(metal && !upholstered && x.code==='94017900')score+=34;
      if(!wood && !metal && upholstered && ['94016100','94017100'].includes(x.code))score+=12;
    }
    const nonSeatFurniture=baseWords.some(w=>['mesa','mesas','aparador','aparadores','comoda','comodas','criado','criados','roupeiro','roupeiros','armario','armarios','rack','racks','painel','paineis','estante','estantes','buffet','buffets','cabeceira','cabeceiras'].includes(w));
    if(nonSeatFurniture && x.code.startsWith('9403'))score+=12;
    if(baseWords.some(w=>['mesa','mesas','aparador','aparadores','rack','racks','painel','paineis','estante','estantes','buffet','buffets'].includes(w)) && wood && x.code==='94036000')score+=30;
    if(baseWords.some(w=>['comoda','comodas','criado','criados','roupeiro','roupeiros','cabeceira','cabeceiras'].includes(w)) && wood && x.code==='94035000')score+=32;
    if(baseWords.some(w=>['cozinha','cozinhas'].includes(w)) && wood && x.code==='94034000')score+=32;
    if(baseWords.some(w=>['escritorio','escritorios'].includes(w)) && wood && x.code==='94033000')score+=32;
    if(!baseWords.some(w=>['escritorio','escritorios'].includes(w)) && x.search.includes('escritorio'))score-=14;
    if(!baseWords.some(w=>['cozinha','cozinhas'].includes(w)) && x.search.includes('cozinhas'))score-=14;
    if(!baseWords.some(w=>['quarto','quartos','comoda','comodas','criado','criados','roupeiro','roupeiros','cabeceira','cabeceiras'].includes(w)) && x.search.includes('quartos de dormir'))score-=14;
    if(wood && x.search.includes('madeira'))score+=12;
    if(metal && x.search.includes('metal'))score+=12;
    if(upholstered && x.search.includes('estofado'))score+=10;
    return{code:x.code,description:x.description,context:x.context,score};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.code.localeCompare(b.code)).slice(0,limit);
}

// Inicializa os metadados imediatamente: não depende de fetch, rede, Vite, Vercel ou service worker.
try{ensureIndex()}catch{}

export function getNCMCacheStatus(){
  return metadata?{available:true,at:null,age:0,count:cache?.length||0,stale:false,updated:metadata.updated,act:metadata.act,source:'embedded'}:{available:false,at:null,age:null,count:0,stale:false,updated:'',act:'',source:'embedded'};
}
export function getNCMMetadata(){return metadata}
export function officialNcmUrl(){return OFFICIAL_SEARCH}
export function localNcmPath(){return 'embedded:src/data/ncmTable.json'}
