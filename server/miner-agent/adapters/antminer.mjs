import net from 'node:net'
import {normalizeTelemetry} from './reference.mjs'

function tcpJson(host,port,command,timeoutMs=2500){
  return new Promise((resolve,reject)=>{
    const socket=net.createConnection({host,port})
    let data=''
    const timer=setTimeout(()=>{socket.destroy();reject(new Error('Antminer API timeout'))},timeoutMs)
    socket.on('connect',()=>socket.write(JSON.stringify({command})))
    socket.on('data',chunk=>{data+=chunk.toString('utf8')})
    socket.on('end',()=>{clearTimeout(timer);try{resolve(JSON.parse(data.replace(/\0/g,'')))}catch(e){reject(e)}})
    socket.on('error',err=>{clearTimeout(timer);reject(err)})
  })
}

export function createAntminerAdapter(config={}){
  const host=config.host||config.minerHost
  const port=Number(config.port||4028)
  if(!host) throw new Error('Antminer adapter requires host')
  return {
    name:'ANTMINER_STYLE',
    async probe(){
      try{await tcpJson(host,port,'version',config.timeoutMs);return {ok:true,vendor:'ANTMINER_STYLE',host,port}}
      catch(error){return {ok:false,vendor:'ANTMINER_STYLE',host,port,error:error instanceof Error?error.message:String(error)}}
    },
    async readTelemetry(){
      const [summary,stats,pools]=await Promise.all([
        tcpJson(host,port,'summary',config.timeoutMs),
        tcpJson(host,port,'stats',config.timeoutMs),
        tcpJson(host,port,'pools',config.timeoutMs)
      ])
      const s=summary?.SUMMARY?.[0]||{}
      const st=stats?.STATS?.find?.(x=>x&&typeof x==='object')||{}
      const p=pools?.POOLS?.[0]||{}
      const tempCandidates=Object.entries(st).filter(([k])=>/^temp/i.test(k)).map(([,v])=>Number(v)).filter(Number.isFinite)
      const fanCandidates=Object.entries(st).filter(([k])=>/^fan/i.test(k)).map(([,v])=>Number(v)).filter(Number.isFinite)
      return normalizeTelemetry({
        hashrateTh:Number(s['GHS 5s']||s['GHS av']||0)/1000,
        powerW:Number(st['Power']||st['power']||0),
        temperatureC:tempCandidates.length?Math.max(...tempCandidates):0,
        fanRpm:fanCandidates.length?Math.max(...fanCandidates):0,
        acceptedShares:Number(s.Accepted||0),
        rejectedShares:Number(s.Rejected||0),
        uptimeSeconds:Number(s.Elapsed||0),
        pool:String(p.URL||''),
        worker:String(p.User||''),
        firmware:String(st['Miner Version']||st['miner_version']||''),
        source:'ANTMINER_STYLE'
      })
    },
    async restart(){
      if(!config.allowControl) throw new Error('Control commands disabled')
      return tcpJson(host,port,'restart',config.timeoutMs)
    }
  }
}
