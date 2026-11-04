const CACHE='luxdecor-erp-v2.20.0';
const OFFLINE_URL='/index.html';
const CORE=['/','/index.html','/site.webmanifest','/lux-erp-192.png','/lux-erp-512.png','/apple-touch-icon.png','/favicon.ico'];

async function cacheAppShell(){
  const cache=await caches.open(CACHE);
  await cache.addAll(CORE);
  try{
    const res=await fetch('/index.html',{cache:'no-store'});
    if(!res.ok)return;
    const html=await res.clone().text();
    await cache.put('/index.html',res);
    const urls=[...html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css))["']/g)].map(m=>m[1]).filter(u=>u.startsWith('/'));
    await Promise.all(urls.map(async u=>{try{const r=await fetch(u,{cache:'no-store'});if(r.ok)await cache.put(u,r)}catch{}}));
  }catch{}
}

self.addEventListener('install',event=>{event.waitUntil(cacheAppShell().then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting()});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;

  if(req.mode==='navigate'){
    event.respondWith(fetch(req).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{});return r}).catch(async()=>await caches.match(req)||await caches.match(OFFLINE_URL)));
    return;
  }

  if(/\.(?:png|jpg|jpeg|webp|svg|ico|woff2?|json)$/i.test(url.pathname)){
    event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{})}return r})));
    return;
  }

  event.respondWith(fetch(req).then(r=>{if(r&&r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{})}return r}).catch(()=>caches.match(req)));
});
