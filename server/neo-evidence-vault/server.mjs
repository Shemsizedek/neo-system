import http from 'node:http';
import { createHash, timingSafeEqual } from 'node:crypto';
import { createEvidenceVault } from './store.mjs';

const PORT=Number(process.env.NEO_EVIDENCE_PORT||8791);
const DB_PATH=process.env.NEO_EVIDENCE_DB_PATH||'data/neo-evidence-vault.sqlite';
const ALLOWED_ORIGIN=process.env.NEO_EVIDENCE_ALLOWED_ORIGIN||'https://shemsizedek.github.io';
// Credentials are resolved when a handler is created, not at import time.
export function credentialsFromEnv(env=process.env){
  if(env.NEO_EVIDENCE_CREDENTIALS){
    const values=JSON.parse(env.NEO_EVIDENCE_CREDENTIALS);
    return validateCredentials(values);
  }
  return validateCredentials(env.NEO_EVIDENCE_API_TOKEN ? [{token:env.NEO_EVIDENCE_API_TOKEN,actor:env.NEO_EVIDENCE_ACTOR||'evidence-service',roles:['read','ingest','review']}] : []);
}
function validateCredentials(values){
  if(!Array.isArray(values))throw new Error('invalid_evidence_credentials');
  const seen=new Set();
  return values.map(value=>{
    if(typeof value?.token!=='string'||!value.token.trim()||seen.has(value.token)||typeof value.actor!=='string'||!value.actor.trim()||!Array.isArray(value.roles)||!value.roles.length||value.roles.some(role=>!['read','ingest','review'].includes(role)))throw new Error('invalid_evidence_credentials');
    seen.add(value.token);
    return {digest:createHash('sha256').update(value.token).digest(),actor:value.actor,roles:[...value.roles]};
  });
}

function applyCors(res){
  res.setHeader('Access-Control-Allow-Origin',ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,PATCH,OPTIONS');
}
function send(res,status,body){applyCors(res);res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(body));}
async function readJson(req){const chunks=[];for await(const chunk of req)chunks.push(chunk);return chunks.length?JSON.parse(Buffer.concat(chunks).toString('utf8')):{};}
function principal(req,credentials){
  const match=/^Bearer (.+)$/.exec(req.headers.authorization||'');
  if(!match)return null;
  const digest=createHash('sha256').update(match[1]).digest();
  return credentials.find(value=>timingSafeEqual(digest,value.digest))||null;
}

export function createHandler(vault,{credentials}={}){
  const configured=credentials===undefined?credentialsFromEnv():validateCredentials(credentials);
  return async(req,res)=>{
    try{
      if(req.method==='OPTIONS'){applyCors(res);res.writeHead(204);return res.end();}
      const url=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`);
      if(url.pathname==='/health')return send(res,200,{ok:true,service:'neo-evidence-vault'});
      if(!configured.length)return send(res,503,{error:'authentication_not_configured'});
      const identity=principal(req,configured);
      if(!identity)return send(res,401,{error:'unauthorized'});
      const role=req.method==='GET'?'read':req.method==='POST'?'ingest':req.method==='PATCH'?'review':null;
      if(!role||!identity.roles.includes(role))return send(res,403,{error:'forbidden'});

      const assetEvidence=url.pathname.match(/^\/assets\/([^/]+)\/evidence$/);
      if(assetEvidence){
        const asset=decodeURIComponent(assetEvidence[1]).toUpperCase();
        if(req.method==='GET')return send(res,200,{asset,evidence:vault.listEvidence(asset,Number(url.searchParams.get('limit')||200))});
        if(req.method==='POST'){
          const body=await readJson(req);
          if(String(body.asset||asset).toUpperCase()!==asset)return send(res,400,{error:'asset_mismatch'});
          const {title,sourceType,sourceUrl,issuer,jurisdiction,claimType,observedAt,note}=body;
          return send(res,201,vault.createEvidence({asset,title,sourceType,sourceUrl,issuer,jurisdiction,claimType,observedAt,note},identity.actor));
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
        const reviewer=identity.actor;
        const record=vault.reviewEvidence(decodeURIComponent(review[1]),{status:body.status,reviewer,note:body.note});
        return record?send(res,200,record):send(res,404,{error:'not_found'});
      }

      return send(res,404,{error:'not_found'});
    }catch(error){return send(res,500,{error:'internal_error'});}
  };
}

export function startServer({port=PORT,dbPath=DB_PATH,host,credentials}={}){
  const vault=createEvidenceVault(dbPath);
  const server=http.createServer(createHandler(vault,{credentials}));
  server.listen(port,host,()=>console.log(`NEO Evidence Vault listening on :${port}`));
  return {server,vault};
}

if(import.meta.url===`file://${process.argv[1]}`)startServer();
