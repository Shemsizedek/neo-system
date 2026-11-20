import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';

const PORT = Number(process.env.PORT || 10000);
const TOKEN = process.env.NEO_MUSE_MCP_TOKEN || '';
const NAME = 'neo-muse-mcp-staging';
const VERSION = '0.1.0';
const PROTOCOL = '2025-06-18';
const TOOLS = [
  {name:'neo_gateway_status',description:'Read-only gateway and environment status. No secrets or infrastructure mutations.',inputSchema:{type:'object',properties:{},additionalProperties:false}},
  {name:'neo_repository_info',description:'Public NEO System repository reference (read-only; no GitHub token or write access).',inputSchema:{type:'object',properties:{},additionalProperties:false}}
];
function auth(header='') {
  if (!TOKEN || !header.startsWith('Bearer ')) return false;
  const supplied=Buffer.from(header.slice(7)); const expected=Buffer.from(TOKEN);
  return supplied.length===expected.length && timingSafeEqual(supplied,expected);
}
function send(res,status,data,headers={}) {
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers});
  res.end(JSON.stringify(data));
}
function rpc(id,result){return {jsonrpc:'2.0',id,result};}
function error(id,code,message){return {jsonrpc:'2.0',id,error:{code,message}};}
const server=http.createServer(async(req,res)=>{
  const path=(req.url || '').split('?')[0];
  if(path==='/health' && req.method==='GET') return send(res,200,{status:'ok',service:NAME,version:VERSION,mode:'read-only',authConfigured:Boolean(TOKEN)});
  if(path!=='/mcp') return send(res,404,{error:'not_found'});
  if (!auth(req.headers.authorization)) return send(res,401,{error:'unauthorized'},{'WWW-Authenticate':'Bearer realm="NEO Muse MCP"'});
  if(req.method==='GET') return send(res,405,{error:'sse_not_supported'},{Allow:'POST'});
  if(req.method!=='POST') return send(res,405,{error:'method_not_allowed'},{Allow:'POST'});
  if(!String(req.headers['content-type']||'').startsWith('application/json')) return send(res,415,{error:'content_type_must_be_json'});
  let chunks=[],size=0;
  try { for await (const chunk of req) { size+=chunk.length; if(size>65536) {return send(res,413,{error:'payload_too_large'});} chunks.push(chunk);} }
  catch{return send(res,400,{error:'invalid_body'});}
  let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return send(res,400,error(null,-32700,'Parse error'));}
  if(!body || body.jsonrpc!=='2.0' || typeof body.method!=='string') return send(res,400,error(body?.id??null,-32600,'Invalid Request'));
  if(body.method==='notifications/initialized' && !Object.hasOwn(body,'id')) {res.writeHead(202);return res.end();}
  if(!Object.hasOwn(body,'id')) {res.writeHead(202);return res.end();}
  if(body.method==='initialize') return send(res,200,rpc(body.id,{protocolVersion:PROTOCOL,capabilities:{tools:{listChanged:false}},serverInfo:{name:NAME,version:VERSION},instructions:'NEO System staging gateway. Read-only tools; no side effects.'}));
  if(body.method==='ping') return send(res,200,rpc(body.id,{}));
  if(body.method==='tools/list') return send(res,200,rpc(body.id,{tools:TOOLS}));
  if(body.method==='tools/call') {
    const name=body.params?.name;
    if(!TOOLS.some(t=>t.name===name)) return send(res,200,error(body.id,-32602,'Unknown tool'));
    if(Object.keys(body.params?.arguments||{}).length) return send(res,200,error(body.id,-32602,'No arguments accepted'));
    const data=name==='neo_gateway_status'
      ? {service:NAME,version:VERSION,mode:'read-only',deployment:'staging',credentials:'never returned'}
      : {repository:'Shemsizedek/neo-system',url:'https://github.com/Shemsizedek/neo-system',branch:'main',access:'public-metadata-only',liveRepositoryAccess:false};
    return send(res,200,rpc(body.id,{content:[{type:'text',text:JSON.stringify(data)}],isError:false}));
  }
  return send(res,200,error(body.id,-32601,'Method not found'));
});
server.listen(PORT,'0.0.0.0',()=>console.log(NAME+' listening on '+PORT));
