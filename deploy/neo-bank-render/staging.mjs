import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createBankSourceClient} from '../../server/neo-bank/source-client.mjs';
import {createBankSourceHandler} from '../../server/neo-bank/source-api.mjs';

// Non-transactional preview. Source access is an authenticated backend concern.
const headers={
  'content-type':'application/json; charset=utf-8','cache-control':'no-store',
  'x-content-type-options':'nosniff','x-frame-options':'DENY','referrer-policy':'no-referrer'
};
const htmlHeaders={...headers,'content-type':'text/html; charset=utf-8',
  'content-security-policy':"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'"};
const cssHeaders={...headers,'content-type':'text/css; charset=utf-8'};
const jsHeaders={...headers,'content-type':'text/javascript; charset=utf-8',
  'content-security-policy':"default-src 'none'; base-uri 'none'"};
const previewFiles={
  '/':{file:'preview.html',type:htmlHeaders},
  '/index.html':{file:'preview.html',type:htmlHeaders},
  '/preview.css':{file:'preview.css',type:cssHeaders},
  '/preview.js':{file:'preview.js',type:jsHeaders}
};
function send(res,status,data,type=headers){res.writeHead(status,type);res.end(typeof data==='string'?data:JSON.stringify(data))}
export function createNeoBankStagingServer({sourceClient=createBankSourceClient(),sourceControlToken=process.env.NEO_BANK_SOURCE_CONTROL_TOKEN}={}){
  const sourceHandler=createBankSourceHandler({client:sourceClient,token:sourceControlToken});
  return http.createServer(async(req,res)=>{
    if(await sourceHandler(req,res))return;
    const path=new URL(req.url||'/', 'http://localhost').pathname;
    if(req.method!=='GET')return send(res,503,{ok:false,error:'staging_writes_disabled',mode:'read-only-preview'});
    if(path==='/healthz')return send(res,200,{ok:true,service:'neo-bank-render-staging',mode:'read-only-preview',bankOperational:false});
    if(path==='/health')return send(res,503,{ok:false,service:'neo-bank',reason:'bank_backend_not_deployed'});
    if(path==='/api/v1/community/status')return send(res,503,{ok:false,service:'NEO Bank',database:'not_attached',accountServices:false,mode:'read-only-preview'});
    if(path==='/api/v1/auth/config')return send(res,200,{enabled:false,mode:'read-only-preview'});
    if(Object.hasOwn(previewFiles,path)){
      const asset=previewFiles[path];
      const content=await readFile(new URL('./'+asset.file,import.meta.url),'utf8');
      return send(res,200,content,asset.type);
    }
    return send(res,404,{ok:false,error:'not_found'});
  });
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
  const port=Number(process.env.PORT||10000);
  createNeoBankStagingServer().listen(port,'0.0.0.0',()=>console.log('NEO Bank read-only staging preview listening on configured port'));
}
