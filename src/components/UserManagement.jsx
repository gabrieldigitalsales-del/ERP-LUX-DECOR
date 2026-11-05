import React,{useEffect,useMemo,useState}from'react';
import{UserPlus,Users,ShieldCheck,KeyRound,Save,RefreshCw,Eye,EyeOff}from'lucide-react';
import{api,getCloudSession}from'../utils/cloudAuth';
import{toast}from'./ToastHost';
const rolePages={
 Administrador:[['dashboard','Dashboard'],['cashier','Caixa / PDV'],['sales','Vendas'],['orders','Pedidos'],['products','Produtos'],['salespeople','Vendedoras'],['stock','Estoque'],['movements','Movimentações'],['clients','Clientes'],['suppliers','Fornecedores'],['finance','Financeiro'],['operations','Pós-venda'],['reports','Relatórios'],['settings','Configurações'],['intelligence','Inteligência']],
 Vendedor:[['dashboard','Dashboard'],['cashier','Caixa / PDV'],['sales','Vendas'],['orders','Pedidos'],['products','Produtos'],['clients','Clientes'],['operations','Pós-venda']],
 Financeiro:[['dashboard','Dashboard'],['finance','Financeiro'],['reports','Relatórios'],['clients','Clientes'],['suppliers','Fornecedores']]
};
const call=(method,body)=>api('/functions/v1/erpluxdecor-user-admin',{method,body});
const defaultPages=role=>rolePages[role].map(([id])=>id);
export default function UserManagement(){
 const[users,setUsers]=useState([]),[busy,setBusy]=useState(false),[username,setUsername]=useState(''),[password,setPassword]=useState(''),[role,setRole]=useState('Vendedor'),[pages,setPages]=useState(defaultPages('Vendedor')),[show,setShow]=useState(false),[editing,setEditing]=useState(null),[resetId,setResetId]=useState(''),[resetPassword,setResetPassword]=useState(''),[loadingError,setLoadingError]=useState('');
 const admin=getCloudSession()?.member?.role==='Administrador';
 const load=async()=>{setLoadingError('');try{const r=await call('GET');setUsers(r.users||[])}catch(e){setLoadingError(e.message||'Não foi possível consultar usuários')}};
 useEffect(()=>{if(admin)load()},[admin]);
 const setRoleDefault=val=>{setRole(val);setPages(defaultPages(val))};
 const flip=(id,list,setter)=>setter(a=>a.includes(id)?a.filter(x=>x!==id):[...a,id]);
 const create=async e=>{
  e.preventDefault();if(busy)return;setBusy(true);
  try{await call('POST',{action:'create',username,password,role,page_access:pages});toast('Usuário criado com sucesso.','success','Usuários');setUsername('');setPassword('');setRoleDefault('Vendedor');await load()}
  catch(e){toast(e.message||'Não foi possível criar usuário','warning','Usuários')}
  finally{setBusy(false)}
 };
 const update=async()=>{
  if(!editing)return;setBusy(true);
  try{await call('POST',{action:'set',user_id:editing.user_id,role:editing.role,page_access:editing.page_access,is_active:editing.is_active});toast('Permissões atualizadas.','success','Usuários');setEditing(null);await load()}
  catch(e){toast(e.message||'Erro de permissão','warning','Usuários')}
  finally{setBusy(false)}
 };
 const reset=async()=>{
  if(resetPassword.length<6)return toast('A senha precisa de pelo menos 6 caracteres.','warning','Usuários');
  setBusy(true);
  try{await call('POST',{action:'reset',user_id:resetId,password:resetPassword});toast('Senha redefinida.','success','Usuários');setResetId('');setResetPassword('')}
  catch(e){toast(e.message||'Falha ao redefinir senha','warning','Usuários')}
  finally{setBusy(false)}
 };
 if(!admin)return null;
 return <div className="panel lux-user-management">
  <div className="lux-user-management-head"><div><Users size={21}/><h3>Usuários e senhas</h3><p>Crie usuários e altere senhas. Todos os usuários ativos têm acesso completo às funcionalidades do ERP.</p></div><button className="secondary" onClick={load}><RefreshCw size={14}/>Atualizar</button></div>
  {loadingError&&<p role="alert" className="login-error">{loadingError}</p>}
  <form onSubmit={create} className="lux-user-create">
   <label><span>Login do novo usuário</span><input required minLength={3} maxLength={30} value={username} onChange={e=>setUsername(e.target.value.toLowerCase())} placeholder="Ex.: maria.vendas" autoComplete="off"/></label>
   <label><span>Senha inicial (mín. 6)</span><div className="lux-user-password"><input required type={show?'text':'password'} minLength={6} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Defina a senha inicial"/><button type="button" onClick={()=>setShow(a=>!a)} title="Mostrar/ocultar senha">{show?<EyeOff size={15}/>:<Eye size={15}/>}</button></div></label>
   <label><span>Perfil</span><select value={role} onChange={e=>setRoleDefault(e.target.value)}>{Object.keys(rolePages).map(x=><option key={x}>{x}</option>)}</select></label>
   <div className="lux-user-permissions"><strong>Acesso completo</strong><p>Todos os usuários ativos utilizam as mesmas funções do ERP.</p></div>
   <button type="submit" className="primary" disabled={busy}><UserPlus size={15}/>Criar usuário</button>
  </form>
  <div className="lux-user-list"><h4>Usuários cadastrados</h4>
   {users.map(u=><div key={u.user_id} className="lux-user-record">
    <div><b>{u.username}</b><small>{u.role} · {u.is_active?'Ativo':'Desativado'}</small></div>
    <div className="lux-user-record-actions">
     <button type="button" className="secondary" onClick={()=>{setEditing({...u,page_access:u.page_access||defaultPages(u.role)});setResetId('')}}><ShieldCheck size={14}/>Editar usuário</button>
     <button type="button" className="secondary" onClick={()=>{setResetId(u.user_id);setResetPassword('');setEditing(null)}}><KeyRound size={14}/>Senha</button>
    </div>
   </div>)}
   {!users.length&&!loadingError&&<p className="empty-list">Nenhum usuário encontrado.</p>}
  </div>
  {editing&&<div className="lux-user-edit"><h4>Editar {editing.username}</h4>
   <label>Perfil <select value={editing.role} onChange={e=>setEditing(x=>({...x,role:e.target.value,page_access:defaultPages(e.target.value)}))}>{Object.keys(rolePages).map(x=><option key={x}>{x}</option>)}</select></label>
   <p>Todos os módulos do ERP estão liberados para este usuário enquanto o acesso estiver ativo.</p>
   <label className="lux-user-active"><input type="checkbox" checked={editing.is_active!==false} onChange={e=>setEditing(x=>({...x,is_active:e.target.checked}))}/>Acesso ativo</label>
   <div className="lux-user-record-actions"><button className="primary" disabled={busy} onClick={update}><Save size={14}/>Salvar usuário</button><button className="secondary" onClick={()=>setEditing(null)}>Cancelar</button></div>
  </div>}
  {resetId&&<div className="lux-user-edit"><h4>Redefinir senha de {users.find(x=>x.user_id===resetId)?.username||'usuário'}</h4>
    <label className="form-field"><span>Nova senha (mínimo 6 caracteres)</span><input type="password" minLength={6} value={resetPassword} onChange={e=>setResetPassword(e.target.value)} autoComplete="new-password"/></label>
    <div className="lux-user-record-actions"><button className="primary" disabled={busy||resetPassword.length<6} onClick={reset}><KeyRound size={14}/>Salvar nova senha</button><button className="secondary" onClick={()=>setResetId('')}>Cancelar</button></div>
  </div>}
 </div>;
}
