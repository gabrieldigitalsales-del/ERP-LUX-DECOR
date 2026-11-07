import React,{useEffect,useState}from'react';
import App from'./App';
import CloudLogin from'./components/CloudLogin';
import LoadingScreen from'./components/LoadingScreen';
import{cloudConfigured,restoreCloudSession,signOutCloud,getCloudSession}from'./utils/cloudAuth';
import{loadCloudDocuments,clearCloudDocuments,erpCloudStorage,importLegacyDocuments,availableLegacyKeys,commitCloudDocuments,cloudError,flushCloudWrites}from'./services/cloudStore';
import{seedProducts,seedSuppliers}from'./data/seed';
import{compactProduct}from'./data/masterData';
import{listLegacyLocalAttachments,listAttachments,putAttachment}from'./utils/attachments';

export default function CloudGate(){
 const[stage,setStage]=useState('checking'),[session,setSession]=useState(null),
 [error,setError]=useState(''),[legacyKeys,setLegacyKeys]=useState([]),[legacyFiles,setLegacyFiles]=useState([]),[busy,setBusy]=useState(false);
 const[intro,setIntro]=useState(true);
 useEffect(()=>{const timer=setTimeout(()=>setIntro(false),1550);return()=>clearTimeout(timer)},[]);
 const init=async s=>{
  setSession(s);
  if(!s?.member){setStage('login');return}
  setStage('loading');setError('');
  try{
   await loadCloudDocuments();
   const keys=availableLegacyKeys().filter(k=>
     !/password|senha|pin|auth|session|__|csc|cert|token|secret/i.test(k)
     &&!k.includes('app-schema-version'));
   setLegacyKeys(keys);
   const oldFiles=s.member.role==='Administrador'?await listLegacyLocalAttachments():[];
   setLegacyFiles(oldFiles);
   if(s.member.role==='Administrador'&&((erpCloudStorage.getItem('luxdecor-products-v12')===null&&keys.length)||oldFiles.length)){
    setStage('migrate');return;
   }
   if(s.member.role==='Administrador'&&erpCloudStorage.getItem('luxdecor-products-v12')===null){
    await seedCatalog();
   }
   setStage('ready');
  }catch(e){setError(e.message||'Erro ao carregar o banco');setStage('error')}
 };
 useEffect(()=>{if(!cloudConfigured()){setStage('unconfigured');return}restoreCloudSession().then(s=>s?.member?init(s):setStage('login')).catch(e=>{setError(e.message);setStage('error')})},[]);
 const seedCatalog=async()=>{
  if(erpCloudStorage.getItem('luxdecor-products-v12')!==null)return;
  await commitCloudDocuments({
   'luxdecor-products-v12':JSON.stringify(seedProducts.map(compactProduct)),
   'luxdecor-suppliers-v12':JSON.stringify(seedSuppliers)
  });
 };
 const finishMigration=async importOld=>{
  if(busy)return;setBusy(true);setError('');
  try{
   if(importOld){
    await importLegacyDocuments(legacyKeys);
    const exists=new Set((await listAttachments()).map(a=>a.id));
    for(const row of legacyFiles){if(!exists.has(row.id)){await putAttachment(row);exists.add(row.id)}}
   }
   await seedCatalog();
   await loadCloudDocuments();
   setStage('ready');
  }catch(e){setError(e.message||'Falha ao importar cadastros')}finally{setBusy(false)}
 };
 const backupLegacy=()=>{
  const copy={};
  for(const k of legacyKeys){const v=window.localStorage.getItem(k);if(v!==null)copy[k]=v}
  const a=document.createElement('a'),blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),data:copy},null,2)],{type:'application/json'});
  a.href=URL.createObjectURL(blob);a.download='luxdecor-backup-antes-do-supabase.json';a.click();URL.revokeObjectURL(a.href);
 };
 useEffect(()=>{
  if(stage!=='ready')return;
  let busy=false;
  const refresh=async()=>{
   if(busy||document.hidden)return;busy=true;
   try{await flushCloudWrites();await loadCloudDocuments()}catch(error){console.warn('Atualização Supabase:',error.message)}
   finally{busy=false}
  };
  const timer=setInterval(refresh,30000);
  window.addEventListener('focus',refresh);
  return()=>{clearInterval(timer);window.removeEventListener('focus',refresh)}
 },[stage]);
 const logout=async()=>{await signOutCloud();clearCloudDocuments();setSession(null);setStage('login')};
 if(intro||stage==='checking'||stage==='loading')return <LoadingScreen persist/>;
 if(stage==='ready'&&session?.member)return <App cloudSession={session} onCloudLogout={logout}/>;
 if(stage==='login')return <CloudLogin onAuthenticated={init}/>;
 return <div className="erp-cloud-gate">
  <div className="erp-cloud-gate-card">
   <h2>{stage==='migrate'?'Migrar cadastros para o Supabase':stage==='loading'?'Carregando dados da Lux Decor':stage==='unconfigured'?'Conexão Supabase ausente':'Conectando ao ERP LUX DECOR'}</h2>
   {stage==='migrate'?
    <><p>Encontrei {legacyKeys.length} registros e {legacyFiles.length} anexos deste navegador. Eles ainda não estão no servidor. Faça uma cópia e importe para não perder os dados. O sistema não apagará os registros antigos automaticamente.</p>
    <button className="secondary" onClick={backupLegacy} disabled={busy}>Baixar cópia antes de migrar</button>
    <button className="primary" onClick={()=>finishMigration(true)} disabled={busy}>{busy?'Importando...':'Importar dados existentes para o Supabase'}</button>
    <button className="secondary" onClick={()=>finishMigration(false)} disabled={busy}>Começar somente com o catálogo padrão de 54 produtos</button></>:
    <p>{stage==='loading'||stage==='checking'?'Verificando sua sessão e buscando os dados no servidor...':stage==='unconfigured'?'Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY na Vercel.':error}</p>}
   {error&&stage==='migrate'&&<p role="alert" className="login-error">{error}</p>}
   {stage==='error'&&<button onClick={logout}>Voltar para entrar</button>}
  </div>
 </div>;
}
