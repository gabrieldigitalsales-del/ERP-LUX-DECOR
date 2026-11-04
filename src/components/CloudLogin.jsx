import React,{useState}from'react';
import{Eye,EyeOff,LockKeyhole,UserRound,ShieldCheck}from'lucide-react';
import logo from'../assets/lux-logo.png';
import nexor from'../assets/nexor-logo.png';
import{signInCloud,signUpCloud,activateCloudAccount}from'../utils/cloudAuth';

export default function CloudLogin({onAuthenticated}){
 const[mode,setMode]=useState('login'),[email,setEmail]=useState(''),[password,setPassword]=useState('');
 const[code,setCode]=useState(''),[username,setUsername]=useState('admin');
 const[show,setShow]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[info,setInfo]=useState('');
 const submit=async e=>{
  e.preventDefault();if(busy)return;setBusy(true);setError('');setInfo('');
  try{
   if(mode==='register'){
    await signUpCloud(email,password);
    setMode('login');setInfo('Conta solicitada. Confirme o e-mail se receber uma mensagem do Supabase; depois entre para ativar o perfil.');return;
   }
   if(mode==='activate'){
    const s=await activateCloudAccount(username,code);
    onAuthenticated(s);return;
   }
   const s=await signInCloud(email,password);
   if(s.member)onAuthenticated(s);
   else{setMode('activate');setInfo('Login confirmado. Informe o perfil e o código de ativação fornecido pelo administrador.')}
  }catch(err){setError(err.message||'Não foi possível autenticar.')}
  finally{setBusy(false)}
 };
 return <div className="login-screen"><div className="login-card">
  <div className="login-brand"><img src={logo} alt="Lux Decor"/><span>GESTÃO EMPRESARIAL</span></div>
  <div className="login-copy">
  <h1>{mode==='activate'?'Ativar meu acesso':mode==='register'?'Criar conta Lux Decor':'Entrar no LUX DECOR ERP'}</h1>
  <p>{mode==='activate'?'A ativação é única e vincula sua conta à empresa.':'Use seu e-mail e sua senha pessoal. Os dados da loja ficam no servidor.'}</p></div>
  <form onSubmit={submit}>
   {mode==='activate'?<>
    <label><span>Perfil autorizado</span><select value={username} onChange={e=>setUsername(e.target.value)}><option value="admin">Admin</option><option value="vendedor">Vendedor</option><option value="financeiro">Financeiro</option></select></label>
    <label><span>Código de ativação individual</span><div className="login-input"><ShieldCheck size={17}/><input autoFocus value={code} onChange={e=>setCode(e.target.value.trim())} placeholder="Cole o código recebido" autoComplete="off" required/></div></label>
   </>:<>
    <label><span>E-mail</span><div className="login-input"><UserRound size={17}/><input autoFocus type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="seuemail@empresa.com" required/></div></label>
    <label><span>Senha</span><div className="login-input"><LockKeyhole size={17}/><input type={show?'text':'password'} autoComplete={mode==='register'?'new-password':'current-password'} minLength={mode==='register'?6:undefined} value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode==='register'?'Mínimo de 6 caracteres':'Sua senha'} required/><button type="button" onClick={()=>setShow(x=>!x)} aria-label="Mostrar senha">{show?<EyeOff size={16}/>:<Eye size={16}/>}</button></div></label>
   </>}
   {info&&<div className="erp-cloud-info" role="status">{info}</div>}
   {error&&<div className="login-error" role="alert">{error}</div>}
   <button className="login-submit" type="submit" disabled={busy}>{busy?'Verificando...':mode==='register'?'Criar conta':mode==='activate'?'Ativar acesso':'Entrar'}</button>
  </form>
  <div className="erp-cloud-login-actions">
   {mode!=='login'&&<button type="button" onClick={()=>{setMode('login');setError('')}}>Já tenho conta</button>}
   {mode==='login'&&<button type="button" onClick={()=>{setMode('register');setError('')}}>Criar acesso</button>}
  </div>
  <div className="login-nexor"><span>Feito pela</span><img src={nexor} alt="NEXOR"/></div>
 </div></div>;
}
