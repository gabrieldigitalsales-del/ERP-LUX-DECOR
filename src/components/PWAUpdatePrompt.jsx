import React,{useEffect,useState}from'react';
import{RefreshCw}from'lucide-react';
import{applyPwaUpdate,subscribePwaUpdate}from'../utils/pwaInstall';
export default function PWAUpdatePrompt(){const[ready,setReady]=useState(false);useEffect(()=>subscribePwaUpdate(setReady),[]);if(!ready)return null;return <div className="pwa-update-banner" role="status"><span><b>Nova versão disponível</b><small>Atualize para usar a versão mais recente do LUX DECOR ERP.</small></span><button type="button" onClick={()=>applyPwaUpdate()}><RefreshCw size={14}/>Atualizar</button></div>}
