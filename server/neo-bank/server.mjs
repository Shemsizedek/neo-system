import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {getNomniValuation} from './market.mjs';

const root=fileURLToPath(new URL('./public/',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};
function json(res,status,body){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*','x-content-type-options':'nosniff'});res.end(JSON.stringify(body))}
function authorized(req,token){return Boolean(token)&&req.headers.authorization===`Bearer ${token}`}

export function createNeoBankServer({store,fetchImpl=fetch,apiToken=process.env.NEO_BANK_API_TOKEN||'',now=()=>new Date().toISOString()}={}){
  if(!store) throw new Error('neo_bank_store_required');
  return http.createServer(async(req,res)=>{
    const url=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`);
    try{
      if(req.method==='OPTIONS'){res.writeHead(204,{'access-control-allow-origin':'*','access-control-allow-headers':'authorization,content-type'});return res.end()}
      if(req.method==='GET'&&url.pathname==='/health'){
        try{await store.ping();return json(res,200,{ok:true,service:'neo-bank',database:'connected',timestamp:now()})}
        catch{return json(res,503,{ok:false,service:'neo-bank',database:'unavailable',timestamp:now()})}
      }
      if(req.method==='GET'&&url.pathname==='/api/v1/community/status'){
        let database='unavailable';try{await store.ping();database='connected'}catch{}
        return json(res,database==='connected'?200:503,{service:'NEO Bank',network:'NMNI Community Exchange System',database,walletEntry:'https://holytemples.org/neo-system/neopay/',timestamp:now()});
      }
      if(req.method==='GET'&&url.pathname==='/api/v1/nomni/valuation') return json(res,200,await getNomniValuation({fetchImpl,now}));
      const match=url.pathname.match(/^\/api\/v1\/accounts\/([^/]+)$/);
      if(req.method==='GET'&&match){
        if(!authorized(req,apiToken)) return json(res,401,{error:'authentication_required'});
        const account=await store.account(decodeURIComponent(match[1]));
        return account?json(res,200,{account}):json(res,404,{error:'account_not_found'});
      }
      if(req.method==='GET'&&(url.pathname==='/'||url.pathname==='/index.html')){
        const body=await readFile(`${root}index.html`);res.writeHead(200,{'content-type':types['.html'],'content-security-policy':"default-src 'self'; connect-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",'x-frame-options':'DENY','x-content-type-options':'nosniff'});return res.end(body);
      }
      if(req.method==='GET'&&(url.pathname==='/app.css'||url.pathname==='/app.js')){const ext=url.pathname.endsWith('.css')?'.css':'.js',body=await readFile(`${root}${url.pathname.slice(1)}`);res.writeHead(200,{'content-type':types[ext],'cache-control':'public, max-age=300','x-content-type-options':'nosniff'});return res.end(body)}
      return json(res,404,{error:'not_found'});
    }catch(error){return json(res,500,{error:'internal_error'})}
  });
}
