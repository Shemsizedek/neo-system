// Private HTTP API for authenticated Forum service; not wired to public host.
import {createServer} from "node:http";
const fail=(status,code)=>Object.assign(new Error(code),{status,code});
const reply=(res,status,payload)=>{
 res.writeHead(status,{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff","x-frame-options":"DENY","referrer-policy":"no-referrer"});
 res.end(JSON.stringify(payload));
};
async function parseBody(req){
 if(!/^application\/json(?:\s*;|$)/i.test(req.headers["content-type"]||""))throw fail(415,"JSON_REQUIRED");
 let chars=0,data="";
 for await(const chunk of req){
  chars+=chunk.length;if(chars>24576)throw fail(413,"BODY_TOO_LARGE");data+=chunk.toString("utf8");
 }
 try{const obj=JSON.parse(data);if(!obj||typeof obj!=="object"||Array.isArray(obj))throw Error("bad");return obj;}
 catch{throw fail(400,"INVALID_JSON")}
}
export function createHttpApi({forum,publicOrigin}){
 if(!forum||typeof publicOrigin!=="string"||!publicOrigin.startsWith("https://"))throw Error("HTTP_API_NOT_CONFIGURED");
 return createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,"https://localhost.invalid");
   if(req.headers.origin&&req.headers.origin!==publicOrigin)throw fail(403,"ORIGIN_DENIED");
   if(req.method==="OPTIONS")throw fail(405,"METHOD_NOT_ALLOWED");
   if(req.method==="GET"&&url.pathname==="/health")return reply(res,200,{status:"private_prelaunch",posting:false});
   if(req.method==="GET"&&url.pathname.startsWith("/communities/")&&url.pathname.endsWith("/questions")){
    const slug=url.pathname.slice("/communities/".length,-"/questions".length);
    return reply(res,200,{questions:await forum.list(slug)});
   }
   if(req.method!=="POST")throw fail(404,"NOT_FOUND");
   const token=(req.headers.authorization||"").match(/^Bearer ([A-Za-z0-9._-]{30,8192})$/)?.[1];
   if(!token)throw fail(401,"AUTH_REQUIRED");
   const data=await parseBody(req);
   const routes={
    "/questions":()=>forum.ask(token,data),"/answers":()=>forum.answer(token,data),
    "/votes":()=>forum.vote(token,data),"/reports":()=>forum.report(token,data),
    "/moderation":()=>forum.moderate(token,data)
   };
   if(!routes[url.pathname])throw fail(404,"NOT_FOUND");
   return reply(res,202,await routes[url.pathname]());
  }catch(e){
   reply(res,[400,401,403,404,405,413,415,429,503].includes(e.status)?e.status:500,{error:e.status?e.code:"INTERNAL_ERROR"});
  }
 });
}
