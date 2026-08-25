import http from 'node:http';
import { createEvidenceVault } from './store.mjs';

const PORT=Number(process.env.NEO_EVIDENCE_PORT||8791);
const DB_PATH=process.env.NEO_EVIDENCE_DB_PATH||'data/neo-evidence-vault.sqlite';
const ALLOWED_ORIGIN=process.env.NEO_EVIDENCE_ALLOWED_ORIGIN||'https://shemsizedek.github.io';
const API_TOKEN=process.env.NEO_EVIDENCE_API_TOKEN||'';

function applyCors(res){
  res.setHeader('Access-Control-Allow-Origin',ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type, X-Reviewer');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,PATCH,OPTIONS');
}
function send(res,status,body){applyCors(res);res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(body));}
async function readJson(req){const chunks=[];for await(const chunk of req)chunks.push(chunk);return chunks.length?JSON.parse(Buffer.concat(chunks).toString('utf8')):{};}
function authorized(req){if(!API_TOKEN)return true;return req.headers.authorization===`Bearer ${API_TOKEN}`;}
function actor(req){return String(req.headers['x-reviewer']||'system');}

export function createHandler(vault){
  return async(req,res)=>{
    try{
      if(req.method==='OPTIONS'){applyCors(res);res.writeHead(204);return res.end();}
      const url=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`);
      if(url.pathname==='/health')return send(res,200,{ok:true,service:'neo-evidence-vault'});
      if(!authorized(req))return send(res,401,{error:'unauthorized'});

      const assetEvidence=url.pathname.match(/^\/assets\/([^/]+)\/evidence$/);
      if(assetEvidence){
        const asset=decodeURIComponent(assetEvidence[1]).toUpperCase();
        if(req.method==='GET')return send(res,200,{asset,evidence:vault.listEvidence(asset,Number(url.searchParams.get('limit')||200))});
        if(req.method==='POST'){
          const body=await readJson(req);
          if(String(body.asset||asset).toUpperCase()!==asset)return send(res,400,{error:'asset_mismatch'});
          return send(res,201,vault.createEvidence({...body,asset},actor(req)));
        }
      }

      const audit=url.pathname.match(/^\/assets\/([^/]+)\/audit$/);
      if(audit&&req.method==='GET'){
        const asset=decodeURIComponent(audit[1]).toUpperCase();
        return send(res,200,{asset,events:vault.listAudit(asset,Number(url.searchParams.get('limit')||500))});
      }

      const evidence=url.pathname.match(/^\/evidence\/([^/]+)$/);
      if(evidence&&req.method==='GET'){
        const record=vault.getEvidence(decodeURIComponent(evidence[1]));
        return record?send(res,200,record):send(res,404,{error:'not_found'});
      }

      const review=url.pathname.match(/^\/evidence\/([^/]+)\/review$/);
      if(review&&req.method==='PATCH'){
        const body=await readJson(req);
        const reviewer=String(body.reviewer||actor(req));
        const record=vault.reviewEvidence(decodeURIComponent(review[1]),{status:body.status,reviewer,note:body.note});
        return record?send(res,200,record):send(res,404,{error:'not_found'});
      }

      return send(res,404,{error:'not_found'});
    }catch(error){return send(res,500,{error:'internal_error',message:error instanceof Error?error.message:'unknown'});}
  };
}

export function startServer({port=PORT,dbPath=DB_PATH}={}){
  const vault=createEvidenceVault(dbPath);
  const server=http.createServer(createHandler(vault));
  server.listen(port,()=>console.log(`NEO Evidence Vault listening on :${port}`));
  return {server,vault};
}

if(import.meta.url===`file://${process.argv[1]}`)startServer();
