// CONTENT is a versioned selection of existing public frontend files only.
const HOSTS={
 'noogle.holytemples.org':'noogle',
 'omnitrix.holytemples.org':'omnitrix',
 'oracle.holytemples.org':'neo-oracle',
 'algo.holytemples.org':'neo-algo',
 'book.holytemples.org':'neo-books'
};
const ALIASES={'noogle':'noogle.holytemples.org','omnitrix':'omnitrix.holytemples.org','neo-oracle':'oracle.holytemples.org','neo-algo':'algo.holytemples.org','neo-books':'book.holytemples.org','neo-hub':'hub.holytemples.org'};
const PREVIEW_HOST='temple-knowledge.shemsizedek.chatgpt.site';
const response=(body,type='text/plain; charset=utf-8',status=200)=>new Response(body,{status,headers:{'content-type':type,'cache-control':'public, max-age=300','x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin'}});
const json=(data,status=200)=>response(JSON.stringify(data),'application/json; charset=utf-8',status);
const head=(result,request)=>request.method==='HEAD'?new Response(null,{status:result.status,headers:result.headers}):result;
const unavailable=()=>{const result=json({error:'account_service_unavailable',message:'Private account and financial services are recovering. No changes were confirmed.'},503);result.headers.set('cache-control','no-store');return result;};
export function createGateway(content){return {async fetch(request){
 const url=new URL(request.url),root=HOSTS[url.hostname];
 if(!root&&url.hostname!==PREVIEW_HOST)return response('Misdirected request',undefined,421);
 if(!['GET','HEAD'].includes(request.method))return unavailable();
 if(['/health','/healthz'].includes(url.pathname))return head(json({ok:true,service:'temple-knowledge',scope:'public-frontend-and-catalog',accountServices:'not-restored',catalogGeneratedAt:content.generatedAt}),request);
 if(url.pathname==='/robots.txt')return head(response('User-agent: *\nAllow: /\nDisallow: /api/\n'),request);
 let path;try{path=decodeURIComponent(url.pathname);}catch{return response('Invalid path',undefined,400);}
 if(path.includes('\\')||path.includes('\0')||path.split('/').some(part=>part==='..'||part.startsWith('.')))return response('Not found',undefined,404);
 if(path.startsWith('/neo-system/'))path=path.slice('/neo-system'.length);
 const [prefix,...rest]=path.slice(1).split('/');
 if(ALIASES[prefix]){const target=new URL('https://'+ALIASES[prefix]+'/');target.pathname='/'+rest.join('/');target.search=url.search;return new Response(null,{status:302,headers:{location:target.href,'cache-control':'public, max-age=300'}});}
 if(!root&&path==='/')return head(response('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NEO Knowledge</title><body style="font:18px/1.6 system-ui;max-width:760px;margin:8vh auto;padding:24px"><h1>NEO Knowledge</h1><p>Search, browse, research and explore public tools.</p><nav>'+Object.entries(HOSTS).map(([host,name])=>'<p><a href="https://'+host+'/">'+({noogle:'Noogle',omnitrix:'Omnitrix','neo-oracle':'NEO Oracle','neo-algo':'NEO Algo','neo-books':'NEO Books'})[name]+'</a></p>').join('')+'</nav><a href="https://neo.holytemples.org/">NEO System</a></body></html>','text/html; charset=utf-8'),request);
 const relative=path==='/'?'index.html':path.slice(1);
 const file=content.files[root+'/'+relative]||content.files[relative];
 if(file){const body=file.encoding==='base64'?Uint8Array.from(atob(file.body),c=>c.charCodeAt(0)):file.body;const result=response(body,file.type);if(relative==='sw.js')result.headers.set('cache-control','no-cache');return head(result,request);}
 if(path.startsWith('/api/'))return unavailable();
 if(['/favicon.ico','/favicon.png','/apple-touch-icon.png'].includes(path))return Response.redirect('https://holytemples.org/wp-content/uploads/2026/09/holy-keys-transparent-master.png',302);
 return response('Page not found',undefined,404);
}};}
export default createGateway(CONTENT);
