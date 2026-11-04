import currentStock from './luxCurrentStock.json' with { type: 'json' };

const slug=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,'-').replace(/^-|-$/g,'');

export const luxInventoryProducts=currentStock.map((r,index)=>{
  const identifier=`LUX-2026-${String(index+1).padStart(3,'0')}`;
  const label=r.showroom?r.model:`Sofá ${r.model}`;
  const pending=r.quantity===null;
  const observations=[pending?'Quantidade não informada: conferir inventário físico.':'',r.notes].filter(Boolean).join(' ');
  return {
    id:`lux-inventario-2026-${String(index+1).padStart(3,'0')}`,
    name:label,category:r.showroom?'Móveis / Showroom':'Estofados',
    subcategory:r.showroom?'Showroom EDN':r.model,
    supplier:r.factory,brand:r.factory,sku:identifier,reference:identifier,
    variant:r.module,color:r.color,sizeLabel:r.module,
    stock:pending?0:r.quantity,stockConfirmed:!pending,inventoryPending:pending,
    stockType:r.showroom?'Mostruário':'Estoque',location:r.showroom?'Showroom Lux Decor':'Estoque de estofados',
    reserved:0,minStock:0,unit:'UN',price:0,cost:0,
    notes:observations,description:`${label} · ${r.module} · ${r.color}`,
    active:true,inventorySource:'Relação de estoque Lux Decor (04/11/2026)',
    importedFromLuxInventory:true
  };
});

export function mergeLuxInventory(existing=[]){
  const ids=new Set(existing.map(p=>p.id));
  const skus=new Set(existing.map(p=>p.sku).filter(Boolean));
  const incoming=luxInventoryProducts.filter(p=>!ids.has(p.id)&&!skus.has(p.sku));
  return {products:[...existing,...incoming],inserted:incoming.length,skipped:luxInventoryProducts.length-incoming.length};
}
