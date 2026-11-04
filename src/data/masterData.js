import masterRows from './homeProductsMaster.json';

const text=v=>String(v??'').trim();
const keyPart=v=>text(v).toLocaleLowerCase('pt-BR');
const nullable=v=>{const t=text(v);return t?t:null};
const money2=v=>{if(v===null||v===undefined||text(v)==='')return null;const n=Number(v);return Number.isFinite(n)?Number(n.toFixed(2)):null};

export function productImportKey(p={}){
  return [
    p.fornecedor??p.supplier??'',
    p.sku_ref??p.sku??p.reference??'',
    p.nome_produto??p.name??'',
    p.cor_acabamento??p.color??'',
    p.tamanho_medida??p.sizeLabel??p.size??'',
    p.variante??p.variant??''
  ].map(keyPart).join('¦');
}

export function isPlaceholderProduct(p={}){
  const name=text(p.nome_produto??p.name),sku=text(p.sku_ref??p.sku);
  const knownDemo=new Set([
    'Mesa de Jantar Aura 1,80m Freijó','Poltrona Luna Linho Bege','Buffet Elegance 1,80m',
    'Cadeira Maré Linho','Sofá Milano 2,40m','Aparador Torino'
  ]);
  return knownDemo.has(name)||/^produto\s+\d+$/i.test(name)||/\b(teste|test|placeholder|exemplo)\b/i.test(`${name} ${sku}`);
}

export function hydrateProduct(p={}){
  return {
    ...p,
    name:p.name??p.nome_produto??'',
    sku:p.sku??p.sku_ref??'',
    reference:p.reference??p.sku_ref??'',
    category:p.category??p.categoria??'',
    supplier:p.supplier??p.fornecedor??'',
    color:p.color??p.cor_acabamento??'',
    sizeLabel:p.sizeLabel??p.tamanho_medida??'',
    variant:p.variant??p.variante??'',
    price:Number(p.price??p.preco_final??0)||0,
    notes:p.notes??p.observacoes??'',
    sourceTable:p.sourceTable??p.origem_tabela??''
  };
}

export function compactProduct(p={}){
  const {
    name,sku,reference,category,supplier,color,sizeLabel,variant,price,notes,sourceTable,
    importKey,imported,importSource,...rest
  }=p;
  return {
    ...rest,
    fornecedor:nullable(p.fornecedor??supplier),
    categoria:nullable(p.categoria??category),
    nome_produto:nullable(p.nome_produto??name),
    sku_ref:nullable(p.sku_ref??sku??reference),
    cor_acabamento:nullable(p.cor_acabamento??color),
    tamanho_medida:nullable(p.tamanho_medida??sizeLabel),
    variante:nullable(p.variante??variant),
    preco_final:money2(p.preco_final??price),
    observacoes:nullable(p.observacoes??notes),
    origem_tabela:nullable(p.origem_tabela??sourceTable)
  };
}

export function toAppProduct(r,index=0){
  return hydrateProduct({
    id:`imp-${r.id_importacao||String(index+1).padStart(5,'0')}`,
    fornecedor:r.fornecedor??null,categoria:r.categoria??null,nome_produto:r.nome_produto??null,
    sku_ref:r.sku_ref??null,cor_acabamento:r.cor_acabamento??null,tamanho_medida:r.tamanho_medida??null,
    variante:r.variante??null,preco_final:money2(r.preco_final),observacoes:r.observacoes??null,
    origem_tabela:r.origem_tabela??null,
    stock:Math.max(1,Number(r.quantidade)||1),reserved:0,minStock:0,cost:0,unit:'UN',active:true,
    ncm:'',ncmDescription:'',ncmVerified:false
  });
}

export const masterProducts=masterRows.map(toAppProduct);
export const masterSuppliers=[...new Set(masterRows.map(r=>r.fornecedor).filter(Boolean))]
  .sort((a,b)=>a.localeCompare(b,'pt-BR'))
  .map((name,i)=>({id:`sup-master-${String(i+1).padStart(2,'0')}`,name,doc:'',cnpj:'',phone:'',email:'',leadTime:0}));

export function upsertMasterProducts(existing=[],options={}){
  const source=Array.isArray(existing)?existing.map(hydrateProduct):[];
  const withoutOldMaster=options.replaceMaster===true?source.filter(p=>!String(p?.id||'').startsWith('imp-')):source;
  const cleaned=withoutOldMaster.filter(p=>p&&!isPlaceholderProduct(p));
  const removedPlaceholders=withoutOldMaster.length-cleaned.length;
  const removedOldMaster=source.length-withoutOldMaster.length;
  const byKey=new Map(cleaned.map((p,i)=>[productImportKey(p),i]));
  let inserted=0,updated=0;
  for(const incoming of masterProducts){
    const key=productImportKey(incoming),idx=byKey.get(key);
    if(idx===undefined){byKey.set(key,cleaned.length);cleaned.push(incoming);inserted++;continue}
    const old=cleaned[idx];
    cleaned[idx]=hydrateProduct({
      ...old,
      // Existing records: update ONLY the three requested spreadsheet fields.
      preco_final:incoming.preco_final,
      observacoes:incoming.observacoes,
      origem_tabela:incoming.origem_tabela,
      price:incoming.preco_final??0,
      notes:incoming.observacoes||'',
      sourceTable:incoming.origem_tabela||''
    });
    updated++;
  }
  return {products:cleaned,inserted,updated,removedPlaceholders,removedOldMaster};
}
