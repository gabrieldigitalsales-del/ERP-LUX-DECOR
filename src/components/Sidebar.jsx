import React from 'react';
import {
  LayoutDashboard,Package,Boxes,ArrowLeftRight,ShoppingCart,Store,Users,Truck,
  WalletCards,ChartSpline,Settings,ChevronRight,ShieldCheck,ClipboardCheck
} from 'lucide-react';
import logo from '../assets/lux-logo.png';import{canViewPage}from'../utils/permissions';

export const navItems=[
  ['dashboard','Dashboard',LayoutDashboard,'Início'],
  ['cashier','Caixa',Store,'Operação'],
  ['sales','Histórico de vendas',ShoppingCart,'Operação'],
  ['orders','Pedidos',ClipboardCheck,'Operação'],
  ['products','Produtos',Package,'Cadastros'],
  ['salespeople','Vendedoras',Users,'Cadastros'],
  ['stock','Estoque',Boxes,'Estoque'],
  ['movements','Movimentações',ArrowLeftRight,'Estoque'],
  ['clients','Clientes',Users,'Cadastros'],
  ['suppliers','Fornecedores',Truck,'Cadastros'],
  ['finance','Financeiro',WalletCards,'Gestão'],
  ['operations','Pós-venda',ShieldCheck,'Gestão'],
  ['reports','Relatórios',ChartSpline,'Gestão'],
  ['settings','Configurações',Settings,'Gestão']
];

export default function Sidebar({page,setPage}){
  return <aside className="sidebar">
    <button type="button" className="brand-wrap brand-luxdecor-button" onClick={()=>setPage('dashboard')} aria-label="Voltar ao início">
      <img src={logo} className="brand-logo" alt="Lux Decor"/>
      <span className="brand-sub">GESTÃO EMPRESARIAL</span>
    </button>
    <nav>{(()=>{let last='';return navItems.filter(([id])=>canViewPage(id)).map(([id,label,Icon,group])=>{const show=group!==last;last=group;return <React.Fragment key={id}>{show&&<span className="nav-section-label">{group}</span>}<button onClick={()=>setPage(id)} className={`nav-item ${page===id?'active':''}`}><Icon size={18}/><span>{label}</span><ChevronRight className="nav-chevron" size={14}/></button></React.Fragment>})})()}</nav>
    <div className="sidebar-footer">
      <div className="company-pill">
        <span className="status-dot"/><div><b>Lux Decor</b></div>
      </div>
    </div>
  </aside>
}
