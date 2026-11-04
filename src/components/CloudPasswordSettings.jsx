import React,{useState}from'react';
import{LockKeyhole,Eye,EyeOff}from'lucide-react';
import{changeCloudPassword}from'../utils/cloudAuth';
import{toast}from'./ToastHost';
export default function CloudPasswordSettings(){
 const[oldPassword,setOldPassword]=useState(''),[newPassword,setNewPassword]=useState(''),[repeat,setRepeat]=useState(''),[show,setShow]=useState(false),[busy,setBusy]=useState(false);
 const save=async e=>{
  e.preventDefault();
  if(newPassword!==repeat)return toast('A confirmação não corresponde à nova senha.','warning','Segurança');
  setBusy(true);
  try{
   await changeCloudPassword(oldPassword,newPassword);
   setOldPassword('');setNewPassword('');setRepeat('');
   toast('Senha alterada diretamente no Supabase.','success','Segurança');
  }catch(error){toast(error.message||'Não foi possível alterar a senha.','warning','Segurança')}
  finally{setBusy(false)}
 };
 return <div className="panel"><LockKeyhole/><h3>Alterar minha senha</h3>
  <p>Proteja seu acesso com uma senha pessoal. A alteração é feita no Supabase Auth.</p>
  <form className="settings-mini-grid" onSubmit={save}>
   <label className="form-field wide"><span>Senha atual</span><input type={show?'text':'password'} autoComplete="current-password" value={oldPassword} onChange={e=>setOldPassword(e.target.value)} required/></label>
   <label className="form-field"><span>Nova senha</span><input type={show?'text':'password'} minLength={6} autoComplete="new-password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} required placeholder="Mínimo 6 caracteres"/></label>
   <label className="form-field"><span>Confirmar nova senha</span><input type={show?'text':'password'} minLength={6} autoComplete="new-password" value={repeat} onChange={e=>setRepeat(e.target.value)} required/></label>
   <button className="secondary" type="button" onClick={()=>setShow(x=>!x)}>{show?<EyeOff size={14}/>:<Eye size={14}/>} {show?'Ocultar':'Mostrar'} senha</button>
   <button className="primary" type="submit" disabled={busy}>{busy?'Salvando...':'Alterar senha'}</button>
  </form></div>;
}
