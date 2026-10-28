import http from 'node:http';
import {readFile} from 'node:fs/promises';
const routes=new Map([
  ['/assets/NOMNI/tokenscan.json',['./attachments/NOMNI/tokenscan.json','application/json; charset=utf-8']],
  ['/assets/NOMNI/info.json',['./attachments/NOMNI/tokenscan.json','application/json; charset=utf-8']],
  ['/assets/NOMNI/bill-1.json',['./attachments/NOMNI/bill-1.json','application/json; charset=utf-8']],
  ['/assets/NOMNI/nomni-bill-1.jpg',['./attachments/NOMNI/assets/NOMNI/nomni-bill-1.jpg','image/jpeg']],
]);
http.createServer(async(req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname;
  if(req.method!=='GET'){res.writeHead(405);res.end('Read only');return;}
  if(path==='/health'){res.writeHead(200,{'content-type':'text/plain'});res.end('ok');return;}
  const route=routes.get(path);
  if(!route){res.writeHead(404);res.end('Not found');return;}
  try{
    const body=await readFile(new URL(route[0],import.meta.url));
    res.writeHead(200,{'content-type':route[1],'access-control-allow-origin':'*','cache-control':'public, max-age=60','x-content-type-options':'nosniff'});
    res.end(body);
  }catch{res.writeHead(503);res.end('Metadata unavailable');}
}).listen(Number(process.env.PORT||10000),'0.0.0.0');
