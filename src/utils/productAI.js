const CATEGORY_RULES=[
 ['sofá-cama','Sofás-cama','SOC'],['sofa cama','Sofás-cama','SOC'],['sofá','Sofás','SOF'],['sofa','Sofás','SOF'],
 ['poltrona','Poltronas','POL'],['cadeira','Cadeiras','CAD'],['banqueta','Banquetas','BAN'],['banco','Bancos','BAN'],
 ['mesa lateral','Mesas Laterais','MLA'],['mesa de centro','Mesas de Centro','MCE'],['mesa de jantar','Mesas de Jantar','MES'],['mesa','Mesas de Jantar','MES'],
 ['buffet','Buffets','BUF'],['aparador','Aparadores','APA'],['rack','Racks','RAC'],['painel','Painéis','PAI'],
 ['criado','Criados-mudos','CRI'],['cabeceira','Cabeceiras','CAB'],['cama','Camas','CAM'],['colchão','Colchões','COL'],['colchao','Colchões','COL'],
 ['estante','Estantes','EST'],['armário','Armários','ARM'],['armario','Armários','ARM'],['cômoda','Cômodas','COM'],['comoda','Cômodas','COM'],
 ['tapete','Tapetes','TAP'],['quadro','Quadros','QUA'],['espelho','Espelhos','ESP'],['luminária','Iluminação','LUM'],['luminaria','Iluminação','LUM'],
 ['puff','Puffs','PUF'],['recamier','Recamiers','REC'],['chaise','Chaises','CHA'],['escrivaninha','Escrivaninhas','ESC'],['bar','Móveis para Bar','BAR']
];
const clean=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const cap=s=>String(s||'').replace(/\b\w/g,m=>m.toUpperCase());
const num=s=>Number(String(s||'').replace(/\./g,'').replace(',','.'))||0;
const COLOR_WORDS=['off white','off-white','preto','preta','branco','branca','bege','cinza','chumbo','marrom','verde','azul','vermelho','vermelha','freijó','freijo','nogueira','caramelo','fendi','grafite','dourado','dourada','natural','terracota','areia','creme','taupe','rosé','rose','café','cafe','conhaque'];
const MATERIALS=[
 ['madeira de eucalipto','Madeira de eucalipto'],['eucalipto','Madeira de eucalipto'],['madeira maciça','Madeira maciça'],['madeira macica','Madeira maciça'],['jequitibá','Madeira jequitibá'],['jequitiba','Madeira jequitibá'],['tauari','Madeira tauari'],['freijó','Madeira freijó'],['freijo','Madeira freijó'],['imbuia','Madeira imbuia'],['nogueira','Madeira nogueira'],['pinus','Madeira pinus'],['mdf','MDF'],['mdp','MDP'],['compensado','Compensado'],['multilaminado','Madeira multilaminada'],
 ['aço inox','Aço inox'],['aco inox','Aço inox'],['aço carbono','Aço carbono'],['aco carbono','Aço carbono'],['aço','Aço'],['aco','Aço'],['alumínio','Alumínio'],['aluminio','Alumínio'],['ferro','Ferro'],['metal','Metal'],
 ['couro legítimo','Couro legítimo'],['couro legitimo','Couro legítimo'],['couro natural','Couro natural'],['couro sintético','Couro sintético'],['couro sintetico','Couro sintético'],['courino','Courino'],['couro','Couro'],['bouclé','Bouclé'],['boucle','Bouclé'],['linho','Linho'],['veludo','Veludo'],['suede','Suede'],['chenille','Chenille'],['sarja','Sarja'],['jacquard','Jacquard'],['algodão','Algodão'],['algodao','Algodão'],['poliéster','Poliéster'],['poliester','Poliéster'],['tecido impermeável','Tecido impermeável'],['tecido impermeavel','Tecido impermeável'],['tecido','Tecido'],
 ['palha natural','Palha natural'],['palha sintética','Palha sintética'],['palha sintetica','Palha sintética'],['palha','Palha'],['corda náutica','Corda náutica'],['corda nautica','Corda náutica'],['fibra sintética','Fibra sintética'],['fibra sintetica','Fibra sintética'],['fibra natural','Fibra natural'],['rattan','Rattan'],
 ['mármore','Mármore'],['marmore','Mármore'],['granito','Granito'],['quartzo','Quartzo'],['sinterizado','Pedra sinterizada'],['travertino','Travertino'],['cerâmica','Cerâmica'],['ceramica','Cerâmica'],['vidro temperado','Vidro temperado'],['vidro','Vidro'],['espelho','Espelho'],
 ['espuma d45','Espuma D45'],['espuma d33','Espuma D33'],['espuma d28','Espuma D28'],['espuma d26','Espuma D26'],['espuma d23','Espuma D23'],['espuma','Espuma'],['fibra siliconada','Fibra siliconada'],['mola ensacada','Molas ensacadas'],['molas ensacadas','Molas ensacadas'],['mola bonnel','Molas Bonnel'],['percinta elástica','Percinta elástica'],['percinta elastica','Percinta elástica']
];
const FINISHES=[['laca fosca','Laca fosca'],['laca brilho','Laca brilho'],['laqueado','Laqueado'],['fosco','Fosco'],['brilhante','Brilhante'],['amadeirado','Amadeirado'],['acetinado','Acetinado'],['pintura eletrostática','Pintura eletrostática'],['pintura eletrostatica','Pintura eletrostática'],['verniz','Verniz'],['tingido','Tingido']];
const DEFAULTS={
 'Sofás':['Madeira de eucalipto','Espuma D33','Percinta elástica','Tecido'],
 'Sofás-cama':['Madeira de eucalipto','Espuma D33','Percinta elástica','Tecido','Mecanismo metálico'],
 'Poltronas':['Madeira de eucalipto','Espuma D28','Percinta elástica','Tecido'],
 'Chaises':['Madeira de eucalipto','Espuma D28','Percinta elástica','Tecido'],
 'Recamiers':['Madeira de eucalipto','Espuma D28','Tecido'],
 'Puffs':['Madeira de eucalipto','Espuma D28','Tecido'],
 'Cadeiras':['Madeira maciça','Espuma D28','Tecido'],
 'Banquetas':['Madeira maciça','Espuma D28','Tecido'],
 'Bancos':['Madeira maciça'],
 'Mesas de Jantar':['Madeira maciça'],
 'Mesas Laterais':['Madeira maciça'],
 'Mesas de Centro':['Madeira maciça'],
 'Buffets':['MDF','Madeira maciça'],
 'Aparadores':['Madeira maciça'],
 'Racks':['MDF','Madeira maciça'],
 'Painéis':['MDF'],
 'Cabeceiras':['Madeira de eucalipto','Espuma D28','Tecido'],
 'Camas':['Madeira maciça'],
 'Criados-mudos':['MDF'],
 'Cômodas':['MDF'],
 'Armários':['MDF'],
 'Estantes':['Madeira maciça'],
 'Escrivaninhas':['Madeira maciça']
};
export function uniqueSku(base,products=[]){const used=new Set(products.map(p=>p.sku));if(!used.has(base))return base;let i=2;while(used.has(`${base}-${String(i).padStart(2,'0')}`))i++;return`${base}-${String(i).padStart(2,'0')}`}
function has(low,word){return clean(low).toLowerCase().includes(clean(word).toLowerCase())}
function collect(low,items){const base=clean(low).toLowerCase(),found=[];for(const[needle,label]of items){const idx=base.indexOf(clean(needle).toLowerCase());if(idx>=0&&!found.some(x=>x.label===label))found.push({idx,label})}return found.sort((a,b)=>a.idx-b.idx).map(x=>x.label)}
function pickColor(low){const hit=COLOR_WORDS.find(x=>has(low,x))||'';return hit.replace(/^preta$/,'preto').replace(/^branca$/,'branco').replace(/^vermelha$/,'vermelho').replace(/^dourada$/,'dourado')}
function parseDimensions(text){const low=String(text||'').toLowerCase();const metricNum=v=>Number(String(v||'').replace(',','.'))||0;const triple=low.match(/(\d+(?:[,.]\d+)?)\s*[xX×]\s*(\d+(?:[,.]\d+)?)\s*[xX×]\s*(\d+(?:[,.]\d+)?)\s*(m|cm)?/i);if(triple){const u=(triple[4]||'cm').toLowerCase();const conv=v=>u==='m'?Number((metricNum(v)*100).toFixed(2)):metricNum(v);return{width:conv(triple[1]),height:conv(triple[2]),depth:conv(triple[3]),sizeLabel:`${triple[1]} x ${triple[2]} x ${triple[3]} ${u}`}}const pair=low.match(/(\d+(?:[,.]\d+)?)\s*[xX×]\s*(\d+(?:[,.]\d+)?)\s*(m|cm)?/i);if(pair){const u=(pair[3]||'cm').toLowerCase();const conv=v=>u==='m'?Number((metricNum(v)*100).toFixed(2)):metricNum(v);return{width:conv(pair[1]),height:'',depth:conv(pair[2]),sizeLabel:`${pair[1]} x ${pair[2]} ${u}`}}const one=low.match(/(\d+(?:[,.]\d+)?)\s*(m|cm)\b/i);if(one){const val=one[2].toLowerCase()==='m'?Number((metricNum(one[1])*100).toFixed(2)):metricNum(one[1]);return{width:val,height:'',depth:'',sizeLabel:`${one[1]} ${one[2].toLowerCase()}`}}return{width:'',height:'',depth:'',sizeLabel:''}}
function materialFamily(label=''){
 const v=clean(label).toLowerCase();
 if(!v)return'';
 if(/madeira|eucalipto|jequitiba|tauari|freijo|imbuia|nogueira|pinus|mdf|mdp|compensado|multilaminado/.test(v))return'Madeira';
 if(/couro|courino/.test(v))return'Couro';
 if(/linho|boucle|veludo|suede|chenille|sarja|jacquard|algodao|poliester|tecido/.test(v))return'Tecido';
 if(/aco|ferro|metal/.test(v))return'Metal';
 if(/aluminio/.test(v))return'Alumínio';
 if(/vidro/.test(v))return'Vidro';
 if(/marmore|granito|quartzo|sinterizado|travertino|ceramica/.test(v))return'Pedra';
 if(/palha/.test(v))return'Palha';
 if(/rattan/.test(v))return'Rattan';
 if(/fibra/.test(v))return'Fibra';
 if(/corda/.test(v))return'Corda náutica';
 if(/espuma/.test(v))return'Espuma';
 return label;
}
function inferMaterials(category,explicit){
 // Cadastro rápido mostra somente o material principal.
 // A biblioteca continua reconhecendo materiais específicos, mas a saída é simplificada.
 const first=explicit[0] || (DEFAULTS[category]||[])[0] || '';
 const value=materialFamily(first);
 return{values:value?[value]:[],inferred:!explicit.length&&Boolean(value)}
}
export function smartProduct(text,products=[]){
 const source=String(text||'').trim(),low=source.toLowerCase();
 const hit=CATEGORY_RULES.find(([k])=>has(low,k))||['produto','Outros','PRO'];
 const cost=num(low.match(/(?:custo|custa)\s*(?:r\$\s*)?([\d.,]+)/i)?.[1]);
 const statedPrice=num(low.match(/(?:valor|pre[cç]o|venda)\s*(?:r\$\s*)?([\d.,]+)/i)?.[1]);
 const supplier=(source.match(/fornecedor\s+([^,;]+)/i)?.[1]||'').trim();
 const dims=parseDimensions(source),color=pickColor(low);
 const explicitMaterials=collect(low,MATERIALS);const materialInfo=inferMaterials(hit[1],explicitMaterials);
 const finishes=collect(low,FINISHES);const materials=materialInfo.values;
 const material=materials.join(', '),finish=finishes.join(', ');
 const sizeSku=dims.sizeLabel?clean(dims.sizeLabel).replace(/\s+/g,'').slice(0,6).toUpperCase():'001';
 const matSku=materials[0]?clean(materials[0]).slice(0,3).toUpperCase():(color?clean(color).slice(0,3).toUpperCase():'PAD');
 const sku=uniqueSku([hit[2],sizeSku,matSku].join('-'),products);
 const price=statedPrice||(cost?Math.ceil((cost*1.75)/10)*10:0),margin=price?((price-cost)/price)*100:0;
 const nameBase=source.split(/[,;]/)[0].replace(/\b(?:valor|pre[cç]o|custo)\s*(?:r\$\s*)?[\d.,]+.*$/i,'').trim();
 return{id:(globalThis.crypto?.randomUUID?.()||`prod-${Date.now()}-${Math.random().toString(36).slice(2,8)}`),name:cap(nameBase||source),category:hit[1],subcategory:'',sku,cost,price,promotionalPrice:0,margin,supplier,brand:'',unit:'UN',stock:0,reserved:0,minStock:5,location:'',reference:'',ean:'',collection:'',image:'',material,materialInferred:materialInfo.inferred,finish,color:cap(color),width:dims.width,height:dims.height,depth:dims.depth,weight:'',sizeLabel:dims.sizeLabel,warrantyMonths:0,warrantyType:'',warrantyStart:'',warrantyNotes:'',tags:[hit[1].toLowerCase(),color,...materials,...finishes,dims.sizeLabel].filter(Boolean),ncm:'',ncmDescription:'',ncmVerified:false,cest:'',cfop:'',origin:'0',description:'',notes:'',active:true,autoGenerated:true};
}
