import net from 'node:net'
import {normalizeTelemetry} from './reference.mjs'

function tcpCommand(host,port,command,timeoutMs=2500){
  return new Promise((resolve,reject)=>{
    const socket=net.createConnection({host,port})
    let data=''
    const timer=setTimeout(()=>{socket.destroy();reject(new Error('WhatsMiner API timeout'))},timeoutMs)
    socket.on('connect',()=>socket.write(JSON.stringify({cmd:command})))
    socket.on('data',chunk=>{data+=chunk.toString('utf8')})
    socket.on('end',()=>{clearTimeout(timer);try{resolve(JSON.parse(data.replace(/\0/g,'')))}catch(e){reject(e)}})
    socket.on('error',err=>{clearTimeout(timer);reject(err)})
  })
}

export function createWhatsMinerAdapter(config={}){
  const host=config.host||config.minerHost
  const port=Number(config.port||4028)
  if(!host) throw new Error('WhatsMiner adapter requires host')
  return {
    name:'WHATSMINER_STYLE',
    async probe(){
      try{await tcpCommand(host,port,'summary',config.timeoutMs);return {ok:true,vendor:'WHATSMINER_STYLE',host,port}}
      catch(error){return {ok:false,vendor:'WHATSMINER_STYLE',host,port,error:error instanceof Error?error.message:String(error)}}
    },
    async readTelemetry(){
      const summary=await tcpCommand(host,port,'summary',config.timeoutMs)
      const s=summary?.SUMMARY?.[0]||summary?.summary?.[0]||summary||{}
      return normalizeTelemetry({
        hashrateTh:Number(s['MHS 5s']||s['MHS av']||s.hashrate||0)/1_000_000,
        powerW:Number(s.Power||s.power||0),
        temperatureC:Number(s['Temperature']||s.temperature||0),
        fanRpm:Number(s['Fan Speed In']||s.fan||0),
        acceptedShares:Number(s.Accepted||s.accepted||0),
        rejectedShares:Number(s.Rejected||s.rejected||0),
        uptimeSeconds:Number(s.Elapsed||s.uptime||0),
        pool:String(s.Pool||s.pool||''),
        worker:String(s.Worker||s.worker||''),
        firmware:String(s.Firmware||s.firmware||''),
        source:'WHATSMINER_STYLE'
      })
    },
    async restart(){
      if(!config.allowControl) throw new Error('Control commands disabled')
      return tcpCommand(host,port,'reboot',config.timeoutMs)
    }
  }
}
