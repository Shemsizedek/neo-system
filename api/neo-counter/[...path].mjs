import { createRedisContext, RedisVersionConflictError } from '../../server/neo-counter-backend/redis-rest.mjs';

const ALLOWED_ORIGIN=process.env.NEO_COUNTER_ALLOWED_ORIGIN||'https://shemsizedek.github.io';
let contextPromise;

function context(){
  if(!contextPromise){
    const ctx=createRedisContext();
    contextPromise=ctx.init().then(()=>ctx);
  }
  return contextPromise;
}
function cors(res){
  res.setHeader('Access-Control-Allow-Origin',ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,DELETE,OPTIONS');
  res.setHeader('Cache-Control','no-store');
}
function send(res,status,body){cors(res);res.status(status).json(body);}
function requestPath(req){
  const raw=req.query?.path;
  if(Array.isArray(raw)) return '/'+raw.join('/');
  if(typeof raw==='string'&&raw) return '/'+raw;
  const url=new URL(req.url||'/',`https://${req.headers.host||'localhost'}`);
  return url.pathname.replace(/^\/api\/neo-counter/,'')||'/';
}

export default async function handler(req,res){
  try{
    if(req.method==='OPTIONS'){cors(res);return res.status(204).end();}
    const ctx=await context();
    const path=requestPath(req);
    if(path==='/health') return send(res,200,{ok:true,service:'neo-counter-backend',storage:'redis-rest'});

    if(path==='/session'&&req.method==='POST'){
      const session=await ctx.createSession(req.body||{});
      return session?send(res,201,session):send(res,401,{error:'invalid_credentials'});
    }

    const principal=await ctx.sessionPrincipal(req);
    if(!principal) return send(res,401,{error:'unauthorized'});
    if(path==='/session/me'&&req.method==='GET') return send(res,200,{merchantId:principal.merchantId,terminalId:principal.terminalId,staffId:principal.staffId,permissions:principal.permissions,expiresAt:principal.expiresAt||null});
    if(path==='/session'&&req.method==='DELETE'){await ctx.revoke(req);return send(res,200,{ok:true});}

    const snapshot=path.match(/^\/merchant\/([^/]+)\/snapshot$/);
    if(snapshot&&req.method==='GET'){
      const merchantId=decodeURIComponent(snapshot[1]);
      if(!ctx.can(principal,'register',merchantId)&&!ctx.can(principal,'settings',merchantId)) return send(res,403,{error:'forbidden'});
      const afterVersion=Number(req.query?.afterVersion||0);
      const merchantOps=await ctx.getState(merchantId,'merchant_ops');
      if(!merchantOps||merchantOps.version<=afterVersion){cors(res);return res.status(204).end();}
      return send(res,200,{merchantOps,cursor:String(merchantOps.version)});
    }

    if(path==='/sync'&&req.method==='POST'){
      const envelope=req.body||{};
      if(!envelope?.merchantId||!envelope?.entity||!envelope?.terminalId||typeof envelope.version!=='number') return send(res,400,{error:'invalid_envelope'});
      if(principal.kind!=='admin'&&principal.terminalId!==envelope.terminalId) return send(res,403,{error:'terminal_mismatch'});
      const permission=envelope.entity==='merchant_ops'?'settings':'register';
      if(!ctx.can(principal,permission,envelope.merchantId)) return send(res,403,{error:'forbidden'});
      try{return send(res,200,await ctx.putEnvelope(envelope));}
      catch(error){if(error instanceof RedisVersionConflictError)return send(res,409,error.remote||{error:'version_conflict'});throw error;}
    }

    const events=path.match(/^\/merchant\/([^/]+)\/events$/);
    if(events){
      const merchantId=decodeURIComponent(events[1]);
      if(req.method==='GET'){
        if(!ctx.can(principal,'reports',merchantId)&&!ctx.can(principal,'settings',merchantId)) return send(res,403,{error:'forbidden'});
        return send(res,200,{events:await ctx.listEvents(merchantId,Number(req.query?.limit||100))});
      }
      if(req.method==='POST'){
        if(!ctx.can(principal,'register',merchantId)) return send(res,403,{error:'forbidden'});
        const body=req.body||{};
        if(!body.type) return send(res,400,{error:'event_type_required'});
        const terminalId=principal.kind==='admin'?(body.terminalId||'admin'):principal.terminalId;
        return send(res,201,await ctx.appendEvent({...body,merchantId,terminalId}));
      }
    }
    return send(res,404,{error:'not_found'});
  }catch(error){return send(res,500,{error:'internal_error',message:error instanceof Error?error.message:'unknown'});}
}
