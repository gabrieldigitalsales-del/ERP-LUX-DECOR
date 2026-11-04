import {luxInventoryProducts} from './luxInventory';
export const seedProducts=luxInventoryProducts;
export const seedClients=[];
export const seedSuppliers=['LUART','BOARETO','MAIS ESTOFADOS','EDN'].map((name,i)=>({id:`sup-lux-${i+1}`,name,doc:'',cnpj:'',phone:'',email:'',leadTime:0}));
export const seedFinance=[];
export const seedSales=[];
export const seedPurchases=[];
