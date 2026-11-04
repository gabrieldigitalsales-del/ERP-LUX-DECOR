let deferredPrompt=null;
let installListeners=[];
let updateListeners=[];
let registration=null;

export function isStandalone(){
 return typeof window!=='undefined'&&(window.matchMedia?.('(display-mode: standalone)').matches||window.navigator.standalone===true||new URLSearchParams(location.search).get('source')==='pwa');
}

function emitInstall(){installListeners.forEach(fn=>fn({available:Boolean(deferredPrompt),installed:isStandalone()}))}
function emitUpdate(reg){updateListeners.forEach(fn=>fn(Boolean(reg?.waiting)))}

export function initPwaInstall(){
 if(typeof window==='undefined')return;
 document.documentElement.classList.toggle('pwa-standalone',isStandalone());
 window.matchMedia?.('(display-mode: standalone)')?.addEventListener?.('change',()=>{document.documentElement.classList.toggle('pwa-standalone',isStandalone());emitInstall()});
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredPrompt=event;emitInstall()});
 window.addEventListener('appinstalled',()=>{deferredPrompt=null;document.documentElement.classList.add('pwa-standalone');emitInstall()});
}

export async function registerPwaServiceWorker(){
 if(!('serviceWorker'in navigator))return null;
 registration=await navigator.serviceWorker.register('/sw.js');
 if(registration.waiting)emitUpdate(registration);
 registration.addEventListener('updatefound',()=>{
  const worker=registration.installing;
  if(!worker)return;
  worker.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)emitUpdate(registration)});
 });
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(sessionStorage.getItem('luxdecorerp-sw-reload')==='1'){sessionStorage.removeItem('luxdecorerp-sw-reload');location.reload()}});
 return registration;
}

export function canInstallPwa(){return Boolean(deferredPrompt)}
export function subscribePwaInstall(fn){installListeners.push(fn);fn({available:Boolean(deferredPrompt),installed:isStandalone()});return()=>{installListeners=installListeners.filter(x=>x!==fn)}}
export function subscribePwaUpdate(fn){updateListeners.push(fn);fn(Boolean(registration?.waiting));return()=>{updateListeners=updateListeners.filter(x=>x!==fn)}}
export async function installPwa(){
 if(isStandalone())return {ok:true,alreadyInstalled:true};
 if(!deferredPrompt)return {ok:false,reason:'unavailable'};
 const prompt=deferredPrompt;deferredPrompt=null;emitInstall();await prompt['prompt']();const choice=await prompt.userChoice;return {ok:choice?.outcome==='accepted',outcome:choice?.outcome||'dismissed'};
}
export function applyPwaUpdate(){if(!registration?.waiting)return false;sessionStorage.setItem('luxdecorerp-sw-reload','1');registration.waiting.postMessage({type:'SKIP_WAITING'});return true}
