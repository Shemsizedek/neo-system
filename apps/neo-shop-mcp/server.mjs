import http from "node:http";
import { timingSafeEqual } from "node:crypto";

const PORT = Number(process.env.PORT || 3000);
const TOKEN = process.env.NEO_MCP_BEARER_TOKEN || "";
const SHOP_URL = "https://shemsizedek.myspreadshop.com";
const tools = [
 { name:"neo_shop_status", description:"Check the NEO Shop recovery and merchant storefront URLs; no modifications.", inputSchema:{type:"object",properties:{},additionalProperties:false}},
 { name:"neo_commerce_capabilities",description:"Read supported NEO commerce integration capabilities and safety limits.",inputSchema:{type:"object",properties:{},additionalProperties:false}}
];
const response=(res,status,payload)=>{res.writeHead(status,{"content-type":"application/json; charset=utf-8","cache-control":"no-store","access-control-allow-origin":"https://chatgpt.com"});res.end(JSON.stringify(payload));};
const allowed=(req)=>{const given=(req.headers.authorization||"").replace(/^Bearer /i,"");if(!TOKEN||!given)return false;const a=Buffer.from(given),b=Buffer.from(TOKEN);return a.length===b.length&&timingSafeEqual(a,b);};
async function check(url){try{const r=await fetch(url,{method:"GET",signal:AbortSignal.timeout(7000),redirect:"follow",headers:{"user-agent":"NEO-Store-Health/1.0"}});return {url,status:r.status,ok:r.ok};}catch{return {url,ok:false,status:"unreachable"};}}
const server=http.createServer(async(req,res)=>{
 if(req.url==="/health" && req.method==="GET")return response(res,200,{service:"neo-commerce-mcp",status:"ready",authenticated_tools:true,live_catalog:false,write_actions:false});
 if(req.url!=="/mcp")return response(res,404,{error:"not_found"});
 if(!allowed(req))return response(res,401,{error:"unauthorized"});
 if(req.method==="GET")return response(res,405,{error:"streaming_not_enabled_use_post"});
 if(req.method!=="POST")return response(res,405,{error:"method_not_allowed"});
 let body="";for await(const c of req){body+=c;if(body.length>65536)return response(res,413,{error:"too_large"});}
 let msg;try{msg=JSON.parse(body);}catch{return response(res,400,{error:"invalid_json"});}
 const id=msg.id;
 if(msg.method==="notifications/initialized")return response(res,202,{});
 if(msg.method==="initialize")return response(res,200,{jsonrpc:"2.0",id,result:{protocolVersion:"2025-03-26",capabilities:{tools:{listChanged:false}},serverInfo:{name:"neo-commerce-mcp",version:"0.1.0"}}});
 if(msg.method==="ping")return response(res,200,{jsonrpc:"2.0",id,result:{}});
 if(msg.method==="tools/list")return response(res,200,{jsonrpc:"2.0",id,result:{tools}});
 if(msg.method==="tools/call"){
  const name=msg.params?.name;
  let result;
  if(name==="neo_shop_status")result={recovery:await check("https://neo-shop-react-recovery.onrender.com"),merchant:await check(SHOP_URL),domain:await check("https://shop.holytemples.org")};
  else if(name==="neo_commerce_capabilities")result={mode:"read_only",catalog:"not_connected",checkout:"external_merchant",social_publishing:"disabled",approval_required_for:["catalog_updates","publishing","wallet_signing","payments"],clients:["ChatGPT","Muse","other_authorized_MCP_clients"]};
  else return response(res,200,{jsonrpc:"2.0",id,error:{code:-32602,message:"Unknown tool"}});
  return response(res,200,{jsonrpc:"2.0",id,result:{content:[{type:"text",text:JSON.stringify(result)}]}});
 }
 return response(res,200,{jsonrpc:"2.0",id,error:{code:-32601,message:"Method not found"}});
});
server.listen(PORT,"0.0.0.0",()=>console.log("NEO commerce MCP listening"));
