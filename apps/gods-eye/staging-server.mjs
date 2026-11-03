import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {fetchEarthquakes} from './earthquakes.mjs';
const root = new URL('../../public/gods-eye/', import.meta.url);
const assets = new Map([['/gods-eye/',['index.html','text/html']],['/gods-eye/view.mjs',['view.mjs','text/javascript']],['/gods-eye/globe.mjs',['globe.mjs','text/javascript']],['/gods-eye/feed-state.mjs',['feed-state.mjs','text/javascript']]]);
export function stagingServer({enabled=false,fetchSnapshot=fetchEarthquakes,clock=Date.now}={}) {
 let cached, expires=0, pending;
 return createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  const end=(status,body,type='application/json')=>{res.writeHead(status,{'Content-Type':type});res.end(body);};
  if(req.method!=='GET')return end(405,'{"state":"method-not-allowed"}');
  if(req.url==='/gods-eye/api/earthquakes') {
   if(!enabled)return end(503,'{"state":"disabled","observations":[],"records":[]}');
   try {
    if(!cached||clock()>=expires){
     pending??=Promise.resolve().then(()=>fetchSnapshot()).then(value=>{cached=value;expires=clock()+60000;return value;}).finally(()=>{pending=undefined;});
     await pending;
    }
    return end(cached.state==='unavailable'?502:200,JSON.stringify(cached));
   }catch{return end(502,'{"state":"unavailable","observations":[],"records":[]}');}
  }
  const asset=assets.get(req.url);
  if(!asset)return end(404,'{"state":"not-found"}');
  try{return end(200,await readFile(new URL(asset[0],root)),asset[1]);}catch{return end(500,'{"state":"unavailable"}');}
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const port=Number(process.env.PORT??8765);
 stagingServer({enabled:process.env.GODSEYE_USGS_ENABLED==='1'}).listen(port,'127.0.0.1',()=>console.log(`God's Eye localhost staging: http://127.0.0.1:${port}/gods-eye/`));
}
