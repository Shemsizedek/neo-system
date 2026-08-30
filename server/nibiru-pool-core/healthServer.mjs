import http from 'node:http'

const send=(res,status,payload)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(payload))}

export function createHealthServer({host='127.0.0.1',port=3334,statusProvider}={}){
  if(typeof statusProvider!=='function')throw new Error('STATUS_PROVIDER_REQUIRED')
  const server=http.createServer(async(req,res)=>{
    try{
      if(req.method!=='GET')return send(res,405,{ok:false,error:'METHOD_NOT_ALLOWED'})
      if(req.url==='/healthz')return send(res,200,{ok:true,service:'world-mint-genesis-pool'})
      if(req.url==='/readyz'){
        const status=await statusProvider()
        return send(res,status.ready?200:503,{ok:Boolean(status.ready),...status})
      }
      if(req.url==='/status'){
        const status=await statusProvider()
        return send(res,200,status)
      }
      return send(res,404,{ok:false,error:'NOT_FOUND'})
    }catch(error){return send(res,500,{ok:false,error:String(error?.message||error)})}
  })
  return Object.freeze({
    server,
    start:()=>new Promise(resolve=>server.listen(port,host,()=>resolve({host,port}))),
    stop:()=>new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()))
  })
}
