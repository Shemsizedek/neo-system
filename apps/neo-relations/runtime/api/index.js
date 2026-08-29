import {Pool} from 'pg'
import {RelationsRepository} from '../repository.js'
import {createHandler} from '../server.js'

let handler

function getHandler(){
  if(handler) return handler
  if(!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')
  const pool=new Pool({
    connectionString:process.env.DATABASE_URL,
    ssl:process.env.PGSSL==='disable'?false:{rejectUnauthorized:false}
  })
  const repository=new RelationsRepository(pool)
  handler=createHandler({repository,env:process.env})
  return handler
}

export default async function vercelHandler(req,res){
  try{
    return await getHandler()(req,res)
  }catch(err){
    res.statusCode=500
    res.setHeader('content-type','application/json; charset=utf-8')
    res.setHeader('cache-control','no-store')
    res.end(JSON.stringify({error:'runtime unavailable'}))
  }
}
