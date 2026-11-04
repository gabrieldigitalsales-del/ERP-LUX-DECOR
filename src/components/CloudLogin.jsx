import React,{useState}from'react';
import{Eye,EyeOff,LockKeyhole,UserRound,ShieldCheck}from'lucide-react';
import logo from'../assets/lux-logo.png';
import nexor from'../assets/nexor-logo.png';
import{signInUsername,api}from'../utils/cloudAuth';
export default function CloudLogin({onAuthenticated}){
 const[user,setUser]=useState(''),[pass,setPass]=useState(''),[show,setShow]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[info,setInfo]=useState('');
 const[setup,setSetup]=useState(false),[activationCode,setActivationCode]=useState(''),[setupPassword,setSetupPassword]=useState('');
 const submit=async e=>{
  e.preventDefault();if(busy)return;setBusy(true);setError('');setInfo('');
  try{
   if(setup){
    if(setupPassword.length<6)throw Error('A senha inicial precisa ter pelo menos 6 caracteres.');
    const result=await api('/functions/v1/erpluxdecor-setup',{method:'POST',body:{activationCode,initialPassword:setupPassword}});
    if(result?.ok!==true)throw Error('A ativação não pôde ser concluída.');
    setSetup(false);setActivationCode('');setSetupPassword('');
    setInfo('Acessos iniciais criados! Entre com admin, vendedor ou financeiro e a senha que você definiu.');
   }else{
    const s=await signInUsername(user,pass);onAuthenticated(s);
   }
  }catch(err){setError(err.message||'Não foi possível concluir a operação.')}
  finally{setBusy(false)}
 };
 return <div className="login-screen"><div className="login-card">
  <div className="login-brand"><img src={logo} alt="Logo Lux Decor"/><span>GESTÃO EMPRESARIAL</span></div>
  <div className="login-copy"><h1>{setup?'Ativar acessos iniciais':'Entrar no LUX DECOR ERP'}</h1><p>{setup?'Esta etapa é feita uma única vez pelo responsável da Lux Decor.':'Informe seu usuário e sua senha para acessar o sistema.'}</p></div>
  <form onSubmit={submit}>
   {setup?<>
    <label><span>Código de ativação do administrador</span><div className="login-input"><ShieldCheck size={17}/><input autoFocus autoComplete="off" value={activationCode} onChange={e=>setActivationCode(e.target.value.trim())} placeholder="Cole o código de ativação" required/></div></label>
    <label><span>Senha inicial dos três usuários (mínimo 6 caracteres)</span><div className="login-input"><LockKeyhole size={17}/><input autoComplete="new-password" type={show?'text':'password'} minLength={6} value={setupPassword} onChange={e=>setSetupPassword(e.target.value)} placeholder="Digite a senha inicial" required/><button type="button" onClick={()=>setShow(v=>!v)} aria-label={show?'Ocultar senha':'Mostrar senha'}>{show?<EyeOff size={16}/>:<Eye size={16}/>}</button></div></label>
   </>:<>
    <label><span>Usuário</span><div className="login-input"><UserRound size={17}/><input autoFocus autoComplete="username" value={user} onChange={e=>setUser(e.target.value.toLowerCase())} placeholder="Seu usuário" required/></div></label>
    <label><span>Senha</span><div className="login-input"><LockKeyhole size={17}/><input type={show?'text':'password'} autoComplete="current-password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="Sua senha" required/><button type="button" onClick={()=>setShow(v=>!v)} aria-label={show?'Ocultar senha':'Mostrar senha'}>{show?<EyeOff size={16}/>:<Eye size={16}/>}</button></div></label>
   </>}
   {info&&<div className="erp-cloud-info" role="status">{info}</div>}
   {error&&<div role="alert" className="login-error">{error}</div>}
   <button className="login-submit" disabled={busy} type="submit">{busy?'Verificando...':setup?'Criar os três acessos':'Entrar'}</button>
  </form>
  <div className="erp-cloud-login-actions"><button type="button" onClick={()=>{setSetup(x=>!x);setError('');setInfo('')}}>{setup?'Voltar para entrar':'Primeira configuração do sistema'}</button></div>
  <div className="login-nexor"><span>Feito pela</span><img src={nexor} alt="NEXOR"/></div>
 </div></div>;
}
