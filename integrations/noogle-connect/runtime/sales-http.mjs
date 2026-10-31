import http from 'node:http';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const jsonHeaders = Object.freeze({
  'content-type':'application/json',
  'cache-control':'no-store',
  'x-content-type-options':'nosniff',
  'referrer-policy':'no-referrer',
});
const respond = (res,status,payload,extra={}) => {
  res.writeHead(status,{...jsonHeaders,...extra});
  res.end(JSON.stringify(payload));
};

export const salesTools = Object.freeze([
  {
    name:'neo_sales_overview',
    title:'NEO Sales — Public Overview',
    description:'Read public NEO sales categories and accurately identify what is not yet connected. No customer information or private commerce access.',
    inputSchema:{type:'object',properties:{},additionalProperties:false},
    annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false},
    securitySchemes:[{type:'noauth'}],
    _meta:{securitySchemes:[{type:'noauth'}]},
  },
  {
    name:'neo_sales_public_links',
    title:'NEO Sales — Public Entry Points',
    description:'List NEO business websites and project links for general inquiries. Links are references, not proof that a checkout or sales transaction is operational.',
    inputSchema:{type:'object',properties:{},additionalProperties:false},
    annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false},
    securitySchemes:[{type:'noauth'}],
    _meta:{securitySchemes:[{type:'noauth'}]},
  },
  {
    name:'neo_sales_qualification_guide',
    title:'NEO Sales — Qualification Guide',
    description:'Get a generic, non-persistent sales qualification checklist for an interest category. Never sends a lead or creates a transaction.',
    inputSchema:{
      type:'object',
      properties:{interest:{type:'string',enum:['retail','licensing','custom_build','partnership','general']}},
      required:['interest'],additionalProperties:false,
    },
    annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false},
    securitySchemes:[{type:'noauth'}],
    _meta:{securitySchemes:[{type:'noauth'}]},
  },
]);

const questions = Object.freeze({
  retail:['What product or service is being requested?','What is the intended delivery location?','Is a quote or availability confirmation needed?'],
  licensing:['Which NEO capability is of interest?','What use case and expected users are involved?','What approvals and commercial terms need review?'],
  custom_build:['What business problem should the solution address?','What integrations and security requirements matter?','What timeline and budget range should be evaluated?'],
  partnership:['What is the proposed partnership scope?','Which organization would be involved?','What mutual deliverables and legal reviews are needed?'],
  general:['What are you seeking from NEO?','Is your request about retail, software, licensing or partnerships?','What information is needed to make the next decision?'],
});

export function invokeSalesTool(name,args={}) {
  if(args===null || typeof args!=='object' || Array.isArray(args)) throw Error('invalid_arguments');
  if(name==='neo_sales_overview'){
    if(Object.keys(args).length)throw Error('invalid_arguments');
    return {
      service:'NEO Sales Agent',stage:'public-read-only-pilot',customerDataConnected:false,
      leadCaptureEnabled:false,checkoutEnabled:false,pricingVerified:false,
      categories:['retail inquiries','software/platform discovery','enterprise licensing','custom systems','partnership inquiries'],
      restrictions:'No prices, inventory, quotes, customer data, purchase commitments or payment confirmations. Refer any such action to an authorized human and verified NEO service.',
    };
  }
  if(name==='neo_sales_public_links'){
    if(Object.keys(args).length)throw Error('invalid_arguments');
    return {
      website:'https://holytemples.org',
      projectReference:'https://github.com/Shemsizedek/neo-system',
      status:'Public entry points only. Live site and commerce availability have not been verified by this tool.',
    };
  }
  if(name==='neo_sales_qualification_guide'){
    if(Object.keys(args).length!==1 || typeof args.interest!=='string' || !(args.interest in questions))throw Error('invalid_interest');
    return {interest:args.interest,questions:questions[args.interest],
      nextStep:'Prepare a draft inquiry for human review. This tool does not collect, save, send or transmit customer contact details.'};
  }
  throw Error('unknown_tool');
}

export function createSalesHttpServer({allowedHosts=['127.0.0.1','localhost','neo-sales-mcp-staging.onrender.com'],
  allowedOrigins=['https://chatgpt.com']}={}){
  const rate=new Map();
  const server=http.createServer(async(req,res)=>{
    try{
      let host,path;
      try{
        host=new URL('http://'+req.headers.host).hostname.toLowerCase();
        path=new URL(req.url,'http://localhost').pathname;
      }catch{return respond(res,400,{error:'bad_request'});}
      if(!allowedHosts.includes(host))return respond(res,403,{error:'host_denied'});
      if(req.headers.origin && !allowedOrigins.includes(req.headers.origin))return respond(res,403,{error:'origin_denied'});
      if(req.method==='GET' && path==='/healthz')return respond(res,200,{ok:true,service:'neo-sales-mcp',mode:'public-read-only-pilot'});
      if(req.method==='GET' && path==='/readyz')return respond(res,200,{ready:true,mode:'public-read-only-pilot',privateSalesReady:false});
      if(path!=='/mcp')return respond(res,404,{error:'not_found'});
      const now=Date.now(),ip=req.socket.remoteAddress||'unknown';
      const prior=rate.get(ip);
      const entry=(!prior || now-prior.start>60000)?{start:now,count:0}:prior;
      if(++entry.count>100)return respond(res,429,{error:'rate_limited'});
      if(rate.size>1024) for(const [k,v] of rate)if(now-v.start>60000)rate.delete(k);
      rate.set(ip,entry);
      if(req.method!=='POST')return respond(res,405,{error:'post_required'},{allow:'POST'});
      if(req.headers['content-type']?.split(';')[0]!=='application/json')return respond(res,415,{error:'json_required'});
      let size=0;const chunks=[];
      for await(const chunk of req){
        size+=chunk.length;
        if(size>32768)return respond(res,413,{error:'payload_too_large'});
        chunks.push(chunk);
      }
      let body;
      try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}
      catch{return respond(res,400,{error:'invalid_json'});}
      const mcp=new Server({name:'neo-sales-agent',version:'0.1.0'},{capabilities:{tools:{}}});
      mcp.setRequestHandler(ListToolsRequestSchema,async()=>({tools:salesTools}));
      mcp.setRequestHandler(CallToolRequestSchema,async(request)=>{
        try{
          const output=invokeSalesTool(request.params.name,request.params.arguments??{});
          return {content:[{type:'text',text:JSON.stringify(output)}],structuredContent:output};
        }catch{
          return {isError:true,content:[{type:'text',text:'Invalid or unsupported public sales request.'}]};
        }
      });
      const transport=new StreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});
      res.on('close',()=>{void transport.close();void mcp.close();});
      await mcp.connect(transport);
      await transport.handleRequest(req,res,body);
    }catch{
      if(!res.headersSent)respond(res,500,{error:'request_failed'});
      else res.end();
    }
  });
  server.requestTimeout=15000;
  server.headersTimeout=10000;
  return server;
}
