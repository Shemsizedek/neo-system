import net from 'node:net'

function arg(name){
  const prefix=`--${name}=`
  return process.argv.find(value=>value.startsWith(prefix))?.slice(prefix.length)||null
}

export function createStratumSmokeClient({host='127.0.0.1',port=3333,workerId,secret,timeoutMs=8000}={}){
  if(!workerId||!secret)throw new Error('WORKER_ID_AND_SECRET_REQUIRED')
  return new Promise((resolve,reject)=>{
    const socket=net.createConnection({host,port})
    socket.setEncoding('utf8')
    socket.setTimeout(timeoutMs)
    let buffer=''
    const seen={subscribed:false,authorized:false,difficulty:false,notify:false}
    const finish=()=>{
      if(!(seen.subscribed&&seen.authorized&&seen.difficulty&&seen.notify))return
      socket.end()
      resolve(Object.freeze({ok:true,host,port,workerId,...seen}))
    }
    socket.on('connect',()=>{
      socket.write(`${JSON.stringify({id:1,method:'mining.subscribe',params:[]})}\n`)
      socket.write(`${JSON.stringify({id:2,method:'mining.authorize',params:[workerId,secret]})}\n`)
    })
    socket.on('data',chunk=>{
      buffer+=chunk
      while(buffer.includes('\n')){
        const i=buffer.indexOf('\n')
        const line=buffer.slice(0,i).trim();buffer=buffer.slice(i+1)
        if(!line)continue
        let msg
        try{msg=JSON.parse(line)}catch{continue}
        if(msg.id===1&&msg.result)seen.subscribed=true
        if(msg.id===2&&msg.result===true)seen.authorized=true
        if(msg.method==='mining.set_difficulty')seen.difficulty=true
        if(msg.method==='mining.notify')seen.notify=true
        finish()
      }
    })
    socket.on('timeout',()=>socket.destroy(new Error('STRATUM_SMOKE_TIMEOUT')))
    socket.on('error',reject)
    socket.on('close',()=>{
      if(!(seen.subscribed&&seen.authorized&&seen.difficulty&&seen.notify))reject(new Error(`STRATUM_SMOKE_INCOMPLETE:${JSON.stringify(seen)}`))
    })
  })
}

if(import.meta.url===`file://${process.argv[1]}`){
  const workerId=arg('worker')||process.env.NIBIRU_SMOKE_WORKER
  const secret=arg('secret')||process.env.NIBIRU_SMOKE_SECRET
  const host=arg('host')||process.env.NIBIRU_STRATUM_HOST||'127.0.0.1'
  const port=Number(arg('port')||process.env.NIBIRU_STRATUM_PORT||3333)
  try{
    const result=await createStratumSmokeClient({host,port,workerId,secret})
    process.stdout.write(`${JSON.stringify(result,null,2)}\n`)
  }catch(error){
    process.stderr.write(`[stratum-smoke] ${String(error?.message||error)}\n`)
    process.exitCode=1
  }
}
