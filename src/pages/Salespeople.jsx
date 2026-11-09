import React,{useState}from'react';
import{Plus,Save,Users,Trash2,ShieldCheck}from'lucide-react';
import PageHeader from'../components/PageHeader';
import{toast}from'../components/ToastHost';
import{getSalespeople,saveSalespeople}from'../utils/commercial';
import{flushCloudWrites}from'../services/cloudStore';
import{can}from'../utils/permissions';
import{addAudit}from'../utils/audit';
const blank=()=>({id:'seller-'+crypto.randomUUID(),name:'',active:true,pin:'',commission:null,target:0,discountLimit:null});
export default function Salespeople(){
 const[rows,setRows]=useState(()=>getSalespeople()),[busy,setBusy]=useState(false);
 const[dirty,setDirty]=useState(false);
 const admin=can('products.write');
 const edit=(index,key,value)=>{setDirty(true);setRows(current=>current.map((x,i)=>i===index?{...x,[key]:value}:x))};
 const add=()=>{setDirty(true);setRows(x=>[...x,blank()])};
 const remove=index=>{setDirty(true);setRows(x=>x.filter((_,i)=>i!==index))};
 const save=async()=>{
  if(!admin)return toast('Entre com um usuário da Lux Decor para cadastrar vendedores.','warning','Permissão');
  if(busy)return;setBusy(true);
  try{
   const saved=saveSalespeople(rows);
   await flushCloudWrites();
   setRows(saved);setDirty(false);
   addAudit('Cadastro de vendedores atualizado','Comercial',saved.length+' vendedores');
   toast('Vendedores salvas no Supabase.','success','Vendedores');
  }catch(e){toast(e.message||'Falha ao salvar vendedores.','warning','Vendedores')}
  finally{setBusy(false)}
 };
 return <section className="page lux-salespeople-page">
  <PageHeader title="Vendedores" subtitle="Cadastre os profissionais que poderão ser selecionadas nas vendas e no PDV." action={admin&&<div className="lux-seller-actions"><button className="secondary" type="button" onClick={add}><Plus size={14}/>Adicionar</button><button className="primary" type="button" disabled={busy||!dirty} onClick={save}><Save size={14}/>{busy?'Salvando...':'Salvar'}</button></div>}/>
  <div className="panel lux-salespeople-panel">
   <div className="lux-salespeople-info"><Users size={18}/><div><b>Equipe de vendas</b><p>Nome, PIN opcional, comissão, meta e limite de desconto. Desativar mantém o histórico da profissional.</p></div></div>
   {rows.length===0?<div className="lux-salespeople-empty"><Users size={26}/><b>Nenhuma vendedora cadastrada</b><p>Use o botão Adicionar para registrar a primeira profissional.</p>{admin&&<button className="secondary" onClick={add}><Plus size={14}/>Adicionar vendedora</button>}</div>:<div className="lux-salespeople-list">
    {rows.map((person,i)=><div key={person.id||i} className="lux-salespeople-row">
      <label className="lux-salespeople-name"><span>Nome da vendedora</span><input disabled={!admin} value={person.name} placeholder="Nome completo" onChange={e=>edit(i,'name',e.target.value)}/></label>
      <label><span>PIN (opcional)</span><input disabled={!admin} inputMode="numeric" value={person.pin||''} maxLength={6} placeholder="Até 6 dígitos" onChange={e=>edit(i,'pin',e.target.value.replace(/\D/g,'').slice(0,6))}/></label>
      <label><span>Comissão (%)</span><input disabled={!admin} type="number" min="0" step=".1" value={person.commission??''} placeholder="Padrão" onChange={e=>edit(i,'commission',e.target.value)}/></label>
      <label><span>Meta mensal (R$)</span><input disabled={!admin} type="number" min="0" step="100" value={person.target??''} placeholder="Ex.: 10000" onChange={e=>edit(i,'target',e.target.value)}/></label>
      <label><span>Desconto máximo (%)</span><input disabled={!admin} type="number" min="0" max="100" step=".5" value={person.discountLimit??''} placeholder="Padrão" onChange={e=>edit(i,'discountLimit',e.target.value)}/></label>
      <label className="lux-salespeople-active"><input disabled={!admin} type="checkbox" checked={person.active!==false} onChange={e=>edit(i,'active',e.target.checked)}/>Ativa</label>
      {admin&&<button type="button" className="lux-salespeople-remove" title="Remover da lista antes de salvar" onClick={()=>remove(i)}><Trash2 size={15}/></button>}
    </div>)}
   </div>}
   <div className="lux-salespeople-note"><ShieldCheck size={15}/>Vendedora é quem recebe a comissão e aparece na venda. Usuário de login é cadastrado separadamente em Configurações.</div>
   {dirty&&<p className="lux-salespeople-unsaved">Há alterações ainda não salvas.</p>}
  </div>
 </section>;
}
