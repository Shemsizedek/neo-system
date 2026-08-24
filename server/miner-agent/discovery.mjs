import net from 'node:net'

function canConnect(host,port,timeoutMs=600){
  return new Promise(resolve=>{
    const socket=net.createConnection({host,port})
    const done=(ok)=>{socket.destroy();resolve(ok)}
    socket.setTimeout(timeoutMs)
    socket.once('connect',()=>done(true))
    socket.once('timeout',()=>done(false))
    socket.once('error',()=>done(false))
  })
}

export async function discoverHosts(hosts,{ports=[4028],timeoutMs=600}={}){
  const found=[]
  for(const host of hosts){
    for(const port of ports){
      if(await canConnect(host,port,timeoutMs)) found.push({host,port,reachable:true})
    }
  }
  return found
}

export async function discoverFromSubnet(prefix,start=1,end=254,options={}){
  if(!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.$/.test(prefix)) throw new Error('Subnet prefix must look like 192.168.1.')
  const hosts=[]
  for(let i=start;i<=end;i++) hosts.push(`${prefix}${i}`)
  return discoverHosts(hosts,options)
}

export async function discoverMiners(config={}){
  const ports=Array.isArray(config.ports)?config.ports:[4028]
  const timeoutMs=Number(config.timeoutMs||600)
  if(Array.isArray(config.hosts)&&config.hosts.length) return discoverHosts(config.hosts,{ports,timeoutMs})
  if(config.subnetPrefix) return discoverFromSubnet(config.subnetPrefix,Number(config.start||1),Number(config.end||254),{ports,timeoutMs})
  return []
}
