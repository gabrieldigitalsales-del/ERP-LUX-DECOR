import React,{useEffect,useState}from'react';
import{MonitorDown}from'lucide-react';
import{installPwa,isStandalone,subscribePwaInstall}from'../utils/pwaInstall';
import{toast}from'./ToastHost';
export default function PWAInstallButton({className='secondary',compact=false,hideWhenInstalled=true}){
 const[state,setState]=useState(()=>({available:false,installed:isStandalone()}));
 useEffect(()=>subscribePwaInstall(setState),[]);
 if(state.installed&&hideWhenInstalled)return null;
 const run=async()=>{const result=await installPwa();if(result.ok)toast(result.alreadyInstalled?'O LUX DECOR ERP já está instalado.':'LUX DECOR ERP instalado. Abra pelo ícone do Windows.','success','Aplicativo');else if(result.reason==='unavailable')toast('Publique em HTTPS (ex.: Vercel) e use Chrome/Edge. Depois escolha Instalar LUX DECOR ERP no menu do navegador.','info','Aplicativo')};
 return <button className={className} type="button" onClick={run}><MonitorDown size={compact?14:16}/>{state.installed?'Aplicativo instalado':state.available?'Instalar no computador':'Instalar aplicativo'}</button>
}
