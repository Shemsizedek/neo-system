import http from 'node:http'
import {Pool} from 'pg'
import {RelationsRepository} from './repository.js'
import {verifyBearer} from './auth.js'

function json(res,status,body){
  res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'})
  res.end(JSON.stringify(body))
}

async function readJson(req){
  const chunks=[]
  for await(const chunk of req) chunks.push(chunk)
  if(chunks.length===0) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

function mapError(err){
  const message=String(err?.message||'request failed')
  if(/required|must be|invalid|cannot be decided/i.test(message)) return [400,message]
  if(/forbidden|denied|role required|disabled/i.test(message)) return [403,message]
  if(/not found/i.test(message)) return [404,message]
  return [500,'internal error']
}

export function createHandler({repository,verify=verifyBearer,env=process.env}={}){
  if(!repository) throw new Error('repository is required')
  return async function handler(req,res){
    try{
      const url=new URL(req.url,'http://localhost')
      if(req.method==='GET'&&url.pathname==='/health') return json(res,200,{service:'neo-relations',status:'ok',executionWorker:false})

      const actor=await verify(req,env)
      if(req.method==='GET'&&url.pathname==='/intents'){
        const tenantId=url.searchParams.get('tenantId')
        const status=url.searchParams.get('status')||'pending_approval'
        if(status!=='pending_approval') return json(res,400,{error:'only pending_approval reads are enabled in this gate'})
        const rows=await repository.listPending(tenantId,actor,url.searchParams.get('limit')||20)
        return json(res,200,{items:rows})
      }
      if(req.method==='POST'&&url.pathname==='/intents'){
        const result=await repository.createIntent(await readJson(req),actor)
        return json(res,202,result)
      }
      const decision=url.pathname.match(/^\/intents\/([^/]+)\/decision$/)
      if(req.method==='POST'&&decision){
        const body=await readJson(req)
        const result=await repository.decide(decodeURIComponent(decision[1]),body.decision,body.reason,actor)
        return json(res,200,result)
      }
      if(req.method==='POST'&&url.pathname==='/router/events'){
        const result=await repository.ingestRouterEvent(await readJson(req),actor)
        return json(res,202,result)
      }
      return json(res,404,{error:'not found'})
    }catch(err){
      const [status,message]=mapError(err)
      return json(res,status,{error:message})
    }
  }
}

export function createServer(env=process.env){
  if(!env.DATABASE_URL) throw new Error('DATABASE_URL is required')
  const pool=new Pool({connectionString:env.DATABASE_URL,ssl:env.PGSSL==='disable'?false:{rejectUnauthorized:false}})
  const repository=new RelationsRepository(pool)
  return http.createServer(createHandler({repository,env}))
}

if(import.meta.url===`file://${process.argv[1]}`){
  const port=Number(process.env.PORT||8788)
  createServer().listen(port,'0.0.0.0',()=>console.log(`NEO Relations runtime listening on ${port}`))
}
