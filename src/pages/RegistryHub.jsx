import React,{useState}from'react';
import{Users,Truck,UserRound}from'lucide-react';
import PageHeader from'../components/PageHeader';
import SimpleRegistry from'./SimpleRegistry';
import Salespeople from'./Salespeople';

/** Cadastros em um só local, mantendo os mesmos dados e funções existentes. */
export default function RegistryHub({clients,setClients,suppliers,setSuppliers,sales=[],purchases=[],finance=[],initialTab='clients'}){
 const [tab,setTab]=useState(initialTab);
 return <section className="lux-registries-hub">
  <PageHeader title="Cadastros" subtitle="Clientes, fornecedores e vendedores organizados em um único lugar."/>
  <div className="module-tabs lux-registries-tabs" role="tablist" aria-label="Cadastros">
    <button type="button" role="tab" aria-selected={tab==='clients'} className={tab==='clients'?'active':''} onClick={()=>setTab('clients')}><UserRound size={16}/>Clientes</button>
    <button type="button" role="tab" aria-selected={tab==='suppliers'} className={tab==='suppliers'?'active':''} onClick={()=>setTab('suppliers')}><Truck size={16}/>Fornecedores</button>
    <button type="button" role="tab" aria-selected={tab==='salespeople'} className={tab==='salespeople'?'active':''} onClick={()=>setTab('salespeople')}><Users size={16}/>Vendedores</button>
  </div>
  <div className="lux-registries-content">
    {tab==='clients'&&<SimpleRegistry type="clients" items={clients} setItems={setClients} sales={sales} finance={finance}/>}
    {tab==='suppliers'&&<SimpleRegistry type="suppliers" items={suppliers} setItems={setSuppliers} purchases={purchases} finance={finance}/>}
    {tab==='salespeople'&&<Salespeople/>}
  </div>
 </section>;
}
