import http from 'node:http'
import { createNodeHttpHandler } from './handler.js'
import { createNeoBotsDeploymentControlHandler, neoBotsDeploymentHealth } from '../../../../server/neo-bots/deployment-runtime.mjs'

function toWebRequest(req,body){
  const proto=req.headers['x-forwarded-proto']||'http'
  const host=req.headers.host||'localhost'
  const headers=new Headers()
  for(const [k,v] of Object.entries(req.headers))if(v!==undefined)headers.set(k,Array.isArray(v)?v.join(','):String(v))
  return new Request(`${proto}://${host}${req.url||'/'}`,{method:req.method,headers,body:['GET','HEAD'].includes(req.method||'GET')?undefined:body})
}

function rewriteControlRequest(request){
  const url=new URL(request.url)
  const prefix='/neo-bots/control'
  url.pathname=url.pathname.slice(prefix.length)||'/'
  return new Request(url,{method:request.method,headers:request.headers,body:['GET','HEAD'].includes(request.method)?undefined:request.body,duplex:['GET','HEAD'].includes(request.method)?undefined:'half'})
}

async function sendWebResponse(res,response){
  res.statusCode=response.status
  response.headers.forEach((value,key)=>res.setHeader(key,value))
  res.end(Buffer.from(await response.arrayBuffer()))
}

async function proxyStewardship(request,env){
  const source=new URL(request.url)
  let path=source.pathname
  if(path==='/wordpress-stewardship/health') path='/health'
  const target=new URL(`${path}${source.search}`,env.NEO_STEWARDSHIP_INTERNAL_URL||'http://127.0.0.1:8791')
  const headers=new Headers(request.headers)
  headers.set('host',target.host)
  return fetch(target,{method:request.method,headers,body:['GET','HEAD'].includes(request.method)?undefined:request.body,duplex:['GET','HEAD'].includes(request.method)?undefined:'half'})
}

export function createNodeDiscordServer({env=process.env,askRuntimeAI=null,label='Node HTTP'}={}){
  const handle=createNodeHttpHandler({askRuntimeAI,label})
  const handleNeoBots=createNeoBotsDeploymentControlHandler(env)
  return http.createServer(async(req,res)=>{
    try{
      const chunks=[]
      for await(const chunk of req)chunks.push(chunk)
      const request=toWebRequest(req,Buffer.concat(chunks))
      const url=new URL(request.url)
      if(request.method==='GET'&&url.pathname==='/neo-bots/health'){
        await sendWebResponse(res,new Response(JSON.stringify({ok:true,service:'neo-bots-control',...neoBotsDeploymentHealth(env)}),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}}))
        return
      }
      if(url.pathname==='/neo-bots/control'||url.pathname.startsWith('/neo-bots/control/')){
        await sendWebResponse(res,await handleNeoBots(rewriteControlRequest(request)))
        return
      }
      if(url.pathname==='/wordpress-stewardship/health'||url.pathname==='/api/v1/wordpress/stewardship/events'){
        await sendWebResponse(res,await proxyStewardship(request,env))
        return
      }
      const pending=[]
      const response=await handle(request,env,{waitUntil:(p)=>pending.push(Promise.resolve(p))})
      await sendWebResponse(res,response)
      Promise.allSettled(pending).catch(()=>{})
    }catch(err){
      res.statusCode=500
      res.setHeader('content-type','application/json; charset=utf-8')
      res.end(JSON.stringify({error:'Node Discord transport error'}))
    }
  })
}

if(import.meta.url===`file://${process.argv[1]}`){
  const port=Number(process.env.PORT||8788)
  createNodeDiscordServer().listen(port,()=>console.log(`NEO Discord Node HTTP adapter listening on ${port}`))
}
