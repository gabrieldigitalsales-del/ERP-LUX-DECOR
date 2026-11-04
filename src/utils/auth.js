// Credenciais fixas foram desativadas. O ERP usa Supabase Auth exclusivamente.
export const LOCAL_USERS=[];
export const loginLocal=()=>null;
export const getLocalSession=()=>null;
export function logoutLocal(){try{sessionStorage.removeItem('luxdecor-auth-session-v1')}catch{}}
