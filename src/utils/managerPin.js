import{erpStorage}from'./storage';
export const managerPinConfigured=()=>erpStorage.getItem('luxdecor-manager-pin')||'1234';
export const checkManagerPin=value=>String(value||'')===String(managerPinConfigured());
