import React,{useEffect,useRef,useState}from'react';
import BusinessClock from'./BusinessClock';
import Modal from'./Modal';
import CloudPasswordSettings from'./CloudPasswordSettings';
import{Search,Bell,ChevronDown,Menu,X,User,Building2,SlidersHorizontal,ShieldCheck,LogOut,CheckCheck,LockKeyhole}from'lucide-react';
import{canViewPage}from'../utils/permissions';
export default function Topbar({mobile,setMobile,setPage,notifications,setNotifications,onSearch,session,onLogout}){
 const[pOpen,setPOpen]=useState(false),[nOpen,setNOpen]=useState(false),[passwordOpen,setPasswordOpen]=useState(false);const ref=useRef();
 useEffect(()=>{const f=e=>{if(ref.current&&!ref.current.contains(e.target)){setPOpen(false);setNOpen(false)}};addEventListener('mousedown',f);return()=>removeEventListener('mousedown',f)},[]);
 const unread=notifications.filter(n=>!n.read).length,name=session?.name||session?.role||'Usuário',role=session?.role||'Administrador',initials=name.split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase();
 const settingsItems=canViewPage('settings',role)?[[User,'Meu perfil'],[Building2,'Empresa'],[SlidersHorizontal,'Preferências'],[ShieldCheck,'Segurança']]:[];
 return <><header className="topbar topbar-v2116" ref={ref}>
  <button className="mobile-menu" onClick={()=>setMobile(x=>!x)}>{mobile?<X/>:<Menu/>}</button>
  <div className="hello"><small>LUX DECOR ERP</small><b>Olá, {name}</b><span>Operação da Lux Decor</span></div>
  <button className="global-search fake-input" onClick={onSearch}><Search size={18}/><span>Buscar produtos, clientes, vendas e pedidos...</span><kbd>F2</kbd></button>
  <div className="top-actions"><div className="topbar-divider"/><BusinessClock/>
   <div className="popover-wrap"><button className="bell" onClick={()=>{setNOpen(v=>!v);setPOpen(false)}}><Bell size={20}/>{unread>0&&<i>{unread}</i>}</button>{nOpen&&<div className="popover notifications"><div className="popover-head"><b>Notificações</b><button onClick={()=>setNotifications(n=>n.map(x=>({...x,read:true})))}><CheckCheck size={15}/>Marcar lidas</button></div>{notifications.length?notifications.map(n=><button key={n.id} className={n.read?'read':''} onClick={()=>{setNotifications(a=>a.map(x=>x.id===n.id?{...x,read:true}:x));setPage(n.page);setNOpen(false)}}><span className={`dot ${n.kind||''}`}/><div><b>{n.title}</b><small>{n.text}</small></div></button>):<p className="empty">Nenhuma notificação.</p>}</div>}</div>
   <div className="popover-wrap"><button className="profile" onClick={()=>{setPOpen(v=>!v);setNOpen(false)}}><div className="avatar">{initials}</div><span><b>{name}</b><small>{role}</small></span><ChevronDown size={16}/></button>{pOpen&&<div className="popover profile-menu">{settingsItems.map(([Icon,label])=><button key={label} onClick={()=>{setPage('settings');setPOpen(false)}}><Icon size={16}/>{label}</button>)}{settingsItems.length>0&&<hr/>}<button onClick={()=>{setPasswordOpen(true);setPOpen(false)}}><LockKeyhole size={16}/>Alterar minha senha</button><button onClick={()=>{setPOpen(false);onLogout?.()}}><LogOut size={16}/>Sair</button></div>}</div>
  </div>
 </header>{passwordOpen&&<Modal title="Minha senha" onClose={()=>setPasswordOpen(false)}><CloudPasswordSettings/></Modal>}</>;
}
