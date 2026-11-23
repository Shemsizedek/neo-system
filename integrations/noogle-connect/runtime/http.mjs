import http from 'node:http';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { tools, callTool } from '../tools.mjs';
import { deviceReadTool, createDeviceReadTool } from '../device-read-tool.mjs';

const headers = { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer' };
const send = (res, status, data, extra = {}) => { res.writeHead(status, {...headers,...extra}); res.end(JSON.stringify(data)); };
function secureURL(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.search) throw Error('https_metadata_required');
  return url;
}
export function createHttpServer({ verifyAccessToken, authorization, store,
  allowedHosts = ['127.0.0.1', 'localhost'], allowedOrigins = ['https://chatgpt.com'] } = {}) {
  const configured = typeof verifyAccessToken === 'function' && !!authorization;
  let resource, issuer, metadataURL;
  if (authorization) {
    secureURL(authorization.resource);secureURL(authorization.issuer);
    // OAuth identifiers use exact comparison, including trailing slash policy.
    resource = authorization.resource;
    issuer = authorization.issuer;
    metadataURL = new URL('/.well-known/oauth-protected-resource', resource).href;
  }
  const state = () => ({ service:'noogle-connect-mcp', gate:3, mode:configured?'authenticated-resource-server':'locked-staging',
    identityAdapterConfigured:configured, deviceReadAdapterConfigured:configured && !!store,
    enrollmentEnabled:false, terminalEnabled:false, publicPluginPublished:false });
  const rates = new Map();
  const server = http.createServer(async (req,res) => {
    try {
      let host, pathname;
      try { host = new URL('http://' + req.headers.host).hostname; pathname = new URL(req.url, 'http://localhost').pathname; }
      catch { return send(res,400,{error:'invalid_request'}); }
      if (!allowedHosts.includes(host)) return send(res,403,{error:'host_denied'});
      if (req.headers.origin && !allowedOrigins.includes(req.headers.origin)) return send(res,403,{error:'origin_denied'});
      if (req.method==='GET' && (pathname==='/healthz' || pathname==='/')) return send(res,200,{ok:true,...state()});
      if (req.method==='GET' && pathname==='/readyz') return send(res,503,{ready:false,...state(),reason:'live_identity_and_database_certification_pending'});
      if (req.method==='GET' && pathname==='/.well-known/oauth-protected-resource') {
        if (!configured) return send(res,503,{error:'identity_provider_unverified'});
        return send(res,200,{resource,authorization_servers:[issuer],scopes_supported:['connect:read',...(store?['devices:read']:[])]});
      }
      if (pathname!=='/mcp') return send(res,404,{error:'not_found'});
      if (!configured) return send(res,503,{error:'mcp_locked',reason:'verified_identity_adapter_required'});
      const ip=req.socket.remoteAddress, time=Date.now();
      let rate=rates.get(ip);
      if (!rate || time-rate.start>60000) {
        if(rates.size>=1000){for(const [key,value] of rates)if(time-value.start>60000)rates.delete(key);}
        if(rates.size>=1000 && !rates.has(ip))return send(res,429,{error:'rate_limited'});
        rate={start:time,count:0};rates.set(ip,rate);
      }
      if(++rate.count>120)return send(res,429,{error:'rate_limited'});
      if(req.method!=='POST')return send(res,405,{error:'post_required'},{allow:'POST'});
      const challenge = `Bearer resource_metadata="${metadataURL}", scope="connect:read", error="invalid_token", error_description="Link your account to continue"`;
      const token=/^Bearer ([^\s]+)$/i.exec(req.headers.authorization || '')?.[1];
      let identity;
      try { if(token)identity=await verifyAccessToken(token); } catch { /* no raw token/provider errors leave the boundary */ }
      if(!identity || typeof identity.subject!=='string' || !identity.subject.trim() || !Array.isArray(identity.scopes))return send(res,401,{error:'authentication_required'},{'www-authenticate':challenge});
      if(!identity.scopes.includes('connect:read'))return send(res,403,{error:'insufficient_scope'},{'www-authenticate':challenge.replace('invalid_token','insufficient_scope')});
      if(req.headers['content-type']?.split(';')[0]!=='application/json')return send(res,415,{error:'json_required'});
      let size=0, parts=[];
      for await(const chunk of req){size+=chunk.length;if(size>65536)return send(res,413,{error:'payload_too_large'});parts.push(chunk);}
      let body;
      try{body=JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{return send(res,400,{error:'invalid_json'});}
      const mcp=new Server({name:'noogle-connect',version:'0.3.0'},{capabilities:{tools:{}}});
      const schemes=[{type:'oauth2',scopes:['connect:read']}];
      mcp.setRequestHandler(ListToolsRequestSchema,async()=>({tools:[
        ...tools.map(tool=>({...tool,securitySchemes:schemes,_meta:{securitySchemes:schemes}})),
        ...(store?[{...deviceReadTool,_meta:{securitySchemes:deviceReadTool.securitySchemes}}]:[])
      ]}));
      mcp.setRequestHandler(CallToolRequestSchema,async request=>{
        try{
          let result;
          if(request.params.name==='noogle_list_devices' && store){
            const read=createDeviceReadTool({verifyAccessToken:async()=>identity,store});
            result=await read(request.params.arguments??{},{authorization:req.headers.authorization});
          }else {
            result=await callTool(request.params.name,request.params.arguments);
            if(request.params.name==='noogle_connect_readiness')result={...state(),liveIdentityVerified:false,liveDatabaseVerified:false,deviceHealthChecked:false};
          }
          return {content:[{type:'text',text:JSON.stringify(result)}],structuredContent:result};
        }catch(error){
          const scope=error.message==='insufficient_scope';
          return {isError:true,content:[{type:'text',text:scope?'Device read permission required.':'Tool request rejected or data unavailable.'}],
            ...(scope?{_meta:{'mcp/www_authenticate':[`Bearer resource_metadata="${metadataURL}", scope="connect:read devices:read", error="insufficient_scope", error_description="Device read permission required"`]}}:{})};
        }
      });
      const transport=new StreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});
      res.on('close',()=>{void transport.close();void mcp.close();});
      await mcp.connect(transport);
      await transport.handleRequest(req,res,body);
    }catch{
      if(!res.headersSent)send(res,500,{error:'request_failed'});
      else res.end();
    }
  });
  server.requestTimeout=15000;server.headersTimeout=10000;
  return server;
}
