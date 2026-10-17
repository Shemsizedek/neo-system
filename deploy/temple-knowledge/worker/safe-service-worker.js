const CACHE='omnitrix-shell-v2';
const ASSETS=['./','./index.html','./styles.css','./matrix.css','./app.js','./themes.js','./miner-bridge.js','./manifest.json','./browser-state.js','./matrix.js','./logo.svg'];
const STATIC=new Set(ASSETS.map(path=>new URL(path,self.registration.scope).href));
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('omnitrix-shell-')&&key!==CACHE).map(key=>caches.delete(key))))));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||event.request.headers.has('authorization')||!STATIC.has(event.request.url))return;
 event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));}return response;}).catch(async()=>await caches.match(event.request)||new Response('This page is unavailable offline.',{status:503,headers:{'content-type':'text/plain'}})));
});
