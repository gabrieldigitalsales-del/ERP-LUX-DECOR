import React,{useEffect,useState}from'react';
import{AlertTriangle,CheckCircle2,Cloud,RefreshCw}from'lucide-react';
import{subscribeCloud}from'../services/cloudStore';
export default function CloudStatus(){
 const[state,setState]=useState({status:'ready',message:''});
 useEffect(()=>subscribeCloud(setState),[]);
 if(state.status==='ready'||state.status==='saved')return null;
 return <div className={'erp-cloud-status erp-cloud-status-'+state.status} role="status">
  {state.status==='error'?<AlertTriangle size={15}/>:<Cloud size={15}/>}
  <span>{state.status==='error'?'Falha ao salvar no Supabase: '+state.message:state.status==='saving'?'Salvando no Supabase...':'Conexão com banco indisponível'}</span>
  {state.status==='error'&&<button type="button" onClick={()=>location.reload()}><RefreshCw size={14}/> Recarregar dados</button>}
 </div>;
}
