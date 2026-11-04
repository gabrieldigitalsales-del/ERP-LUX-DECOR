import{erpStorage}from'./storage';
export const managerPinConfigured=()=>erpStorage.getItem('luxdecor-manager-pin')||'';
export const checkManagerPin=value=>Boolean(managerPinConfigured()&&String(value||'')===String(managerPinConfigured()));
