const onlyDigits=v=>String(v||'').replace(/\D/g,'');
const parseMoneyBR=v=>{const raw=String(v||'').trim().replace(/R\$\s*/gi,'');if(!raw)return 0;const normalized=raw.includes(',')?raw.replace(/\./g,'').replace(',','.') : raw;const n=Number(normalized.replace(/[^\d.-]/g,''));return Number.isFinite(n)?n:0};
const dateISOFromBR=v=>{const m=String(v||'').match(/\b(0[1-9]|[12]\d|3[01])[\/.-](0[1-9]|1[0-2])[\/.-](20\d{2})\b/);return m?`${m[3]}-${m[2]}-${m[1]}`:''};
const addDaysISO=(iso,days)=>{const [y,m,d]=iso.split('-').map(Number);const dt=new Date(Date.UTC(y,m-1,d));dt.setUTCDate(dt.getUTCDate()+days);return dt.toISOString().slice(0,10)};
const mod10=data=>{let sum=0,weight=2;for(let i=data.length-1;i>=0;i--){let product=Number(data[i])*weight;sum+=product>9?Math.floor(product/10)+(product%10):product;weight=weight===2?1:2}return(10-(sum%10))%10};
const mod11BankBarcode=barcode=>{let sum=0,weight=2;for(let i=barcode.length-1;i>=0;i--){if(i===4)continue;sum+=Number(barcode[i])*weight;weight=weight===9?2:weight+1}const result=11-(sum%11);return[0,10,11].includes(result)?1:result};
const mod11Arrecadacao=data=>{let sum=0,weight=2;for(let i=data.length-1;i>=0;i--){sum+=Number(data[i])*weight;weight=weight===9?2:weight+1}const r=sum%11;if(r===0||r===1)return 0;if(r===10)return 1;return 11-r};
const line47ToBarcode=d=>`${d.slice(0,4)}${d[32]}${d.slice(33,47)}${d.slice(4,9)}${d.slice(10,20)}${d.slice(21,31)}`;
const line48ToBarcode=d=>d.match(/.{12}/g)?.map(block=>block.slice(0,11)).join('')||'';
const barcode44ToLine47=b=>{const f1=b.slice(0,4)+b.slice(19,24),f2=b.slice(24,34),f3=b.slice(34,44),f5=b.slice(5,19);return`${f1}${mod10(f1)}${f2}${mod10(f2)}${f3}${mod10(f3)}${b[4]}${f5}`};
export const formatLinha=d=>{const x=onlyDigits(d);if(x.length===47)return`${x.slice(0,5)}.${x.slice(5,10)} ${x.slice(10,15)}.${x.slice(15,21)} ${x.slice(21,26)}.${x.slice(26,32)} ${x[32]} ${x.slice(33)}`;if(x.length===48)return x.match(/.{12}/g)?.join(' ')||x;return x};
export const validateBoletoCode=value=>{const d=onlyDigits(value);if(d.length===47){const fieldsOk=mod10(d.slice(0,9))===Number(d[9])&&mod10(d.slice(10,20))===Number(d[20])&&mod10(d.slice(21,31))===Number(d[31]);const barcode=line47ToBarcode(d);const generalOk=mod11BankBarcode(barcode)===Number(barcode[4]);return{valid:fieldsOk&&generalOk,type:'bank_line',digits:d,barcode,line:formatLinha(d),fieldsOk,generalOk}}if(d.length===44&&!d.startsWith('8')){const generalOk=mod11BankBarcode(d)===Number(d[4]);return{valid:generalOk,type:'bank_barcode',digits:d,barcode:d,line:formatLinha(barcode44ToLine47(d)),generalOk}}if(d.length===48&&d.startsWith('8')){const module=[6,7].includes(Number(d[2]))?'mod10':'mod11';const blocks=d.match(/.{12}/g)||[];const fieldsOk=blocks.length===4&&blocks.every(block=>(module==='mod10'?mod10(block.slice(0,11)):mod11Arrecadacao(block.slice(0,11)))===Number(block[11]));const barcode=line48ToBarcode(d);return{valid:fieldsOk,type:'utility_line',digits:d,barcode,line:formatLinha(d),fieldsOk,module}}if(d.length===44&&d.startsWith('8')){const module=[6,7].includes(Number(d[2]))?'mod10':'mod11';const payload=d.slice(0,3)+d.slice(4);const expected=module==='mod10'?mod10(payload):mod11Arrecadacao(payload);const generalOk=expected===Number(d[3]);return{valid:generalOk,type:'utility_barcode',digits:d,barcode:d,line:d,generalOk,module}}return{valid:false,type:'unknown',digits:d,barcode:'',line:''}};
export const amountFromValidated=info=>{const b=info?.barcode||'';if(info?.type?.startsWith('bank'))return Number(b.slice(9,19)||0)/100;if(info?.type?.startsWith('utility')&&['6','8'].includes(b[2]))return Number(b.slice(4,15)||0)/100;return 0};
export const dueFromValidated=info=>{if(!info?.type?.startsWith('bank')||!info.barcode)return'';const factor=Number(info.barcode.slice(5,9));if(!factor)return'';return factor>=1000?addDaysISO('2025-02-22',factor-1000):addDaysISO('1997-10-07',factor)};
const normalizeOCRText=text=>String(text||'').replace(/[Oo]/g,'0').replace(/[Il|]/g,'1');
const candidatesFromText=text=>{const src=normalizeOCRText(text);const found=[];const patterns=[/(?:\d[\s.\-]?){47,60}/g,/(?:\d[\s.\-]?){44,56}/g,/(?:\d[\s.\-]?){48,62}/g];for(const pattern of patterns){for(const match of src.matchAll(pattern)){const digits=onlyDigits(match[0]);for(const size of [47,48,44]){if(digits.length===size)found.push(digits);else if(digits.length>size){for(let i=0;i<=digits.length-size;i++)found.push(digits.slice(i,i+size))}}}}return[...new Set(found)]};
const bestBoletoFromText=text=>{const valid=candidatesFromText(text).map(validateBoletoCode).filter(x=>x.valid);return valid.sort((a,b)=>{const score=x=>(x.type==='bank_line'?4:x.type==='utility_line'?3:x.type==='bank_barcode'?2:1);return score(b)-score(a)})[0]||null};
const extractLabelValue=(text,labels,pattern)=>{const src=String(text||'').replace(/\s+/g,' ');for(const label of labels){const re=new RegExp(`${label}\\s*[:\\-]?\\s*(${pattern})`,'i');const m=src.match(re);if(m)return m[1].trim()}return''};
const extractBoletoMetadata=(text,info)=>{const src=String(text||'').replace(/\s+/g,' ');const beneficiary=((src.match(/Benefici[aá]rio\s*:\s*(.{2,100}?)(?=\s+(?:CNPJ|Av\.|Avenida|Rua|R\.|Ag[eê]ncia|Vencimento|Pagador|Nosso N[uú]mero|Data))/i)||src.match(/Benefici[aá]rio\s+(?!CNPJ)(.{2,80}?)(?=\s+CNPJ)/i)||[])[1]||'').trim();const cnpj=extractLabelValue(src,['CNPJ(?: do)? Benefici[aá]rio'],'\\d{2}\\.?\\d{3}\\.?\\d{3}\\/?\\d{4}-?\\d{2}');const documentNumber=extractLabelValue(src,['N[ºo.]?\\s*Documento','No\\. Documento'],'[A-Z0-9.-]{3,30}');const nossoNumero=extractLabelValue(src,['Nosso N[uú]mero'],'[A-Z0-9.-]{3,30}');const dueLabel=extractLabelValue(src,['Data de Vencimento','Vencimento'],'(?:0[1-9]|[12]\\d|3[01])\\/(?:0[1-9]|1[0-2])\\/20\\d{2}');const amountLabel=extractLabelValue(src,['Valor do Documento','\\(=\\)Valor do Documento','Valor'],'(?:R\\$\\s*)?\\d{1,3}(?:\\.\\d{3})*,\\d{2}');return{beneficiary,cnpj,documentNumber,nossoNumero,due:dateISOFromBR(dueLabel)||dueFromValidated(info),value:parseMoneyBR(amountLabel)||amountFromValidated(info)}};
async function detectBarcodeFromImage(source){
  try{
    if(typeof window!=='undefined'&&'BarcodeDetector'in window){
      const formats=['itf','code_128','codabar'];
      const detector=new window.BarcodeDetector({formats});
      const bitmap=source instanceof ImageBitmap?source:await createImageBitmap(source);
      const found=await detector.detect(bitmap);
      if(!(source instanceof ImageBitmap))bitmap.close?.();
      for(const item of found||[]){
        const info=validateBoletoCode(item.rawValue||'');
        if(info.valid)return info;
      }
    }
  }catch{}
  return null;
}
const boletoResult=(info,text,extra={})=>{
  const meta=extractBoletoMetadata(text,info);
  return{barcode:info?.line||'',barcode44:info?.barcode||'',valid:Boolean(info?.valid),text,value:meta.value,due:meta.due,beneficiary:meta.beneficiary,cnpj:meta.cnpj,documentNumber:meta.documentNumber,nossoNumero:meta.nossoNumero,confidence:info?.valid?'alta':'manual',origin:extra.origin||'',...extra};
};
export async function readBoletoFile(file,onProgress=()=>{}){
  if(!file)throw new Error('Arquivo não informado.');
  const url=URL.createObjectURL(file);
  onProgress(10);
  const isImage=String(file.type||'').startsWith('image/');
  if(isImage){
    const info=await detectBarcodeFromImage(file);
    onProgress(100);
    if(info)return boletoResult(info,'',{url,kind:'image',name:file.name,origin:'codigo_imagem_validado'});
    return boletoResult(null,'',{url,kind:'image',name:file.name,origin:'imagem_anexada_manual'});
  }
  onProgress(100);
  return boletoResult(null,'',{url,kind:'file',name:file.name,origin:'arquivo_anexado_manual'});
}
