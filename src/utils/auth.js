export const LOCAL_USERS=[
  {username:'administrador',password:'asd123',role:'Administrador',name:'Administrador'},
  {username:'vendedor',password:'asd123',role:'Vendedor',name:'Vendedor'},
  {username:'financeiro',password:'asd123',role:'Financeiro',name:'Financeiro'}
];
const SESSION_KEY='luxdecor-auth-session-v1';
export function loginLocal(username,password){
  const u=LOCAL_USERS.find(x=>x.username===String(username||'').trim().toLowerCase()&&x.password===String(password||''));
  if(!u)return null;
  const session={username:u.username,role:u.role,name:u.name,at:new Date().toISOString()};
  sessionStorage.setItem(SESSION_KEY,JSON.stringify(session));
  localStorage.setItem('luxdecor-current-role',u.role);
  return session;
}
export function getLocalSession(){
  try{const s=JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null');return s?.username&&s?.role?s:null}catch{return null}
}
export function logoutLocal(){try{sessionStorage.removeItem(SESSION_KEY)}catch{};try{localStorage.removeItem('luxdecor-current-role')}catch{}}
