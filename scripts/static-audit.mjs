import fs from 'fs';
import path from 'path';
const root=process.cwd(),src=path.join(root,'src');
const files=[];
const walk=d=>{for(const n of fs.readdirSync(d)){const p=path.join(d,n),st=fs.statSync(p);if(st.isDirectory())walk(p);else if(/\.(js|jsx)$/.test(n))files.push(p)}};
walk(src);
const issues=[];
for(const file of files){
  const text=fs.readFileSync(file,'utf8'), rel=path.relative(root,file);
  for(const m of text.matchAll(/from\s*['"](\.\.?\/[^'"]+)['"]/g)){
    let target=path.resolve(path.dirname(file),m[1]);
    if(!path.extname(target)){
      if(fs.existsSync(target+'.js'))target+='.js';
      else if(fs.existsSync(target+'.jsx'))target+='.jsx';
    }
    if(!fs.existsSync(target))issues.push(`${rel}: import local ausente ${m[1]}`);
  }
  if(/\b(alert|confirm|prompt)\s*\(/.test(text))issues.push(`${rel}: diálogo nativo encontrado`);
  if(/safeBankRows|bankRowsView/.test(text))issues.push(`${rel}: identificador financeiro legado encontrado`);
  if(/document\.getElementById\(['"]homeerp-settle-value/.test(text))issues.push(`${rel}: baixa financeira ainda usa DOM direto`);
  if(/\bid\s*:\s*Date\.now\(\)/.test(text))issues.push(`${rel}: ID baseado apenas em Date.now()`);
  if(/new Date\(\)\.toISOString\(\)\.slice\(0\s*,\s*10\)/.test(text))issues.push(`${rel}: data de negócio em UTC detectada`);
}

try{
  const {smartProduct}=await import('../src/utils/productAI.js');
  const chair=smartProduct('Cadeira madeira maciça 2.3m',[]);
  const sofa=smartProduct('Sofá couro 2,40m valor 8900',[]);
  if(chair.category!=='Cadeiras'||chair.material!=='Madeira'||chair.sizeLabel!=='2.3 m')issues.push('productAI: interpretação de cadeira/madeira/medida divergente');
  if(sofa.category!=='Sofás'||sofa.material!=='Couro'||Number(sofa.price)!==8900)issues.push('productAI: interpretação de sofá/couro/preço divergente');
}catch(err){issues.push(`productAI: teste não executou (${err.message})`)}

const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
for(const [name,v] of Object.entries({...pkg.dependencies,...pkg.devDependencies})) if(v==='latest'||v==='*')issues.push(`package.json: dependência não fixada ${name}@${v}`);
const storage=fs.readFileSync(path.join(src,'utils/storage.js'),'utf8');
if(!storage.includes(`APP_SCHEMA_VERSION='${pkg.version}'`))issues.push(`storage.js: versão de schema diferente de ${pkg.version}`);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
if(!html.includes(`HOME ERP ${pkg.version}`))issues.push(`index.html: título não está na versão ${pkg.version}`);
const sw=fs.readFileSync(path.join(root,'public/sw.js'),'utf8');
if(!sw.includes(`home-erp-v${pkg.version}`))issues.push(`sw.js: cache não está na versão ${pkg.version}`);
if(!sw.includes("url.pathname.startsWith('/api/')"))issues.push('sw.js: rotas /api não estão excluídas do cache');
const settings=fs.readFileSync(path.join(src,'pages/Settings.jsx'),'utf8');
if(!settings.includes(`version:'${pkg.version}'`))issues.push(`Settings.jsx: backup não está na versão ${pkg.version}`);
console.log(`Arquivos JS/JSX: ${files.length}`);
console.log(`Problemas estáticos: ${issues.length}`);
for(const x of issues)console.log('- '+x);
if(issues.length)process.exitCode=1;
