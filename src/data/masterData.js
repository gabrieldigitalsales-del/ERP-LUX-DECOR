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

