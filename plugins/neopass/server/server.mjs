import http from 'node:http';
import {Server} from '@modelcontextprotocol/sdk/server/index.js';
import {StreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {ListToolsRequestSchema,CallToolRequestSchema} from '@modelcontextprotocol/sdk/types.js';
const scopes={neopass_account:'neopass:profile',neopass_services:'neopass:services'};
const https=value=>{const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password||url.hash||url.search)throw Error('canonical_https_url_required');return url;};
// Callbacks are trusted server dependencies; never resolve identity from tool arguments.
export function createNeopassMcpServer({resource,issuer,verifyAccessToken,isActive,readProfile,readServices,now=Date.now}={}){
 const url=https(resource),auth=https(issuer);
 if(url.pathname!=='/mcp'||auth.origin!==issuer||[verifyAccessToken,isActive,readProfile,readServices].some(fn=>typeof fn!=='function'))throw Error('neopass_mcp_dependencies_required');
 const metadataUrl=url.origin+'/.well-known/oauth-protected-resource';
 const metadata={resource,authorization_servers:[issuer],scopes_supported:Object.values(scopes),bearer_methods_supported:['header']};
 const challenge=scope=>`Bearer resource_metadata="${metadataUrl}", error="insufficient_scope", error_description="Sign in with NEO Pass to continue", scope="${scope}"`;
 const denied=scope=>({isError:true,content:[{type:'text',text:'Sign in with NEO Pass to continue.'}],_meta:{'mcp/www_authenticate':[challenge(scope)]}});
 const tools=Object.entries(scopes).map(([name,scope])=>({name,title:name==='neopass_account'?'Connected NEO Pass account':'Authorized NEO services',description:name==='neopass_account'?'Read the connected NEO Pass account identity. Does not log in to another service or unlock a wallet.':'List services authorized for the connected NEO Pass account. Does not grant permissions.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false},securitySchemes:[{type:'oauth2',scopes:[scope]}],_meta:{securitySchemes:[{type:'oauth2',scopes:[scope]}]}}));
 return http.createServer(async(req,res)=>{
  res.setHeader('cache-control','no-store');res.setHeader('x-content-type-options','nosniff');
  const path=new URL(req.url,url.origin).pathname;
  if(path==='/.well-known/oauth-protected-resource'&&req.method==='GET'){res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify(metadata));return;}
  if(path!=='/mcp'){res.writeHead(404);res.end();return;}
  if(req.headers.origin&&req.headers.origin!==url.origin&&!['https://chatgpt.com','https://chat.openai.com'].includes(req.headers.origin)){res.writeHead(403);res.end();return;}
  if(req.method!=='POST'){res.writeHead(405,{allow:'POST'});res.end();return;}
  const server=new Server({name:'neopass',version:'0.1.0'},{capabilities:{tools:{}}});
  server.setRequestHandler(ListToolsRequestSchema,async()=>({tools}));
  server.setRequestHandler(CallToolRequestSchema,async request=>{
   const scope=scopes[request.params.name];
   if(!scope||Object.keys(request.params.arguments||{}).length)return {isError:true,content:[{type:'text',text:'Unsupported tool or arguments.'}]};
   const header=req.headers.authorization;
   if(typeof header!=='string'||!/^Bearer [A-Za-z0-9._~-]+$/.test(header)||header.length>8192)return denied(scope);
   try{
    // Verifier must check signature or opaque-token store, token type and revocation.
    const identity=await verifyAccessToken(header.slice(7));
    if(identity?.verified!==true||identity.tokenUse!=='access'||identity.issuer!==issuer||identity.audience!==resource||typeof identity.subject!=='string'||!identity.subject||!Number.isFinite(identity.expiresAt)||identity.expiresAt<=now()||identity.assurance!=='passkey-user-verified'||!Array.isArray(identity.scopes)||!identity.scopes.includes(scope)||await isActive(identity.subject)!==true)return denied(scope);
    let data;
    if(request.params.name==='neopass_account'){
     const profile=await readProfile(identity.subject);
     if(!profile||typeof profile.id!=='string'||!profile.id||typeof profile.displayName!=='string')throw Error('profile_unavailable');
     data={id:profile.id,displayName:profile.displayName};
    }else{
     const services=await readServices(identity.subject);
     if(!Array.isArray(services))throw Error('services_unavailable');
     data={services:services.filter(row=>row&&typeof row.id==='string'&&typeof row.name==='string').map(({id,name})=>({id,name}))};
    }
    return {content:[{type:'text',text:JSON.stringify(data)}],structuredContent:data};
   }catch{return {isError:true,content:[{type:'text',text:'NEO Pass could not verify access or load this account.'}]};}
  });
  const transport=new StreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});
  res.on('close',()=>{void transport.close();void server.close();});
  try{await server.connect(transport);await transport.handleRequest(req,res);}
  catch{if(!res.headersSent)res.writeHead(500);if(!res.writableEnded)res.end();}
 });
}
