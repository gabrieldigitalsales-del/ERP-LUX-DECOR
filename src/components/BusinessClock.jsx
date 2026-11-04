import React,{useEffect,useMemo,useState}from'react';
import{MapPin}from'lucide-react';

const TZ='America/Sao_Paulo';
const fmtDate=new Intl.DateTimeFormat('pt-BR',{timeZone:TZ,day:'2-digit',month:'short',year:'numeric'});
const fmtTime=new Intl.DateTimeFormat('pt-BR',{timeZone:TZ,hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});

export function zonedNow(){return new Date()}
export function formatBusinessDateTime(date=new Date()){
  return `${fmtDate.format(date).replace('.','')} · ${fmtTime.format(date)}`;
}

export default function BusinessClock(){
 const[now,setNow]=useState(()=>new Date());
 useEffect(()=>{const t=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(t)},[]);
 const date=useMemo(()=>fmtDate.format(now).replace('.','').toUpperCase(),[now]);
 const time=useMemo(()=>fmtTime.format(now),[now]);
 return <div className="business-clock business-clock-compact" title="Horário de Sete Lagoas - MG">
   <div className="business-clock-main"><b>{time}</b><span>{date}</span></div>
   <div className="business-clock-place"><MapPin size={12}/><span>SETE LAGOAS · MG</span></div>
 </div>
}
