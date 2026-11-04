import React,{useState}from'react';
import{Eye,EyeOff,LockKeyhole,UserRound}from'lucide-react';
import logo from'../assets/lux-logo.png';
import nexor from'../assets/nexor-logo.png';
import{signInUsername}from'../utils/cloudAuth';
export default function CloudLogin({onAuthenticated}){
 const[user,setUser]=useState(''),[pass,setPass]=useState(''),[show,setShow]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const submit=async e=>{
  e.preventDefault();if(busy)return;setBusy(true);setError('');
  try{const s=await signInUsername(user,pass);onAuthenticated(s)}
  catch(err){setError('Não foi possível entrar. Confira o usuário e a senha ou solicite acesso ao administrador.')}
  finally{setBusy(false)}
 };
 return <div className="login-screen"><div className="login-card">
  <div className="login-brand"><img src={logo} alt="Logo Lux Decor"/><span>GESTÃO EMPRESARIAL</span></div>
  <div className="login-copy"><h1>Entrar no LUX DECOR ERP</h1><p>Informe seu usuário e sua senha para acessar o sistema.</p></div>
  <form onSubmit={submit}>
   <label><span>Usuário</span><div className="login-input"><UserRound size={17}/><input autoFocus autoComplete="username" value={user} onChange={e=>setUser(e.target.value)} placeholder="Seu usuário" required/></div></label>
   <label><span>Senha</span><div className="login-input"><LockKeyhole size={17}/><input type={show?'text':'password'} autoComplete="current-password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="Sua senha" required/><button type="button" onClick={()=>setShow(v=>!v)} aria-label={show?'Ocultar senha':'Mostrar senha'}>{show?<EyeOff size={16}/>:<Eye size={16}/>}</button></div></label>
   {error&&<div role="alert" className="login-error">{error}</div>}
   <button className="login-submit" disabled={busy} type="submit">{busy?'Verificando...':'Entrar'}</button>
  </form>
  <div className="login-nexor"><span>Feito pela</span><img src={nexor} alt="NEXOR"/></div>
 </div></div>;
}
