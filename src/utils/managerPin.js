export const managerPinConfigured=()=>localStorage.getItem('luxdecor-manager-pin')||'1234';
export const checkManagerPin=value=>String(value||'')===String(managerPinConfigured());
