import http from 'node:http';
import {readFile} from 'node:fs/promises';
const source=new URL('./attachments/NOMNI/tokenscan.json',import.meta.url);
http.createServer(async(req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname;
  if(req.method!=='GET'||!['/assets/NOMNI/info.json','/assets/NOMNI/tokenscan.json','/health'].includes(path)){res.writeHead(404);res.end('Not found');return;}
  if(path==='/health'){res.writeHead(200,{'content-type':'text/plain'});res.end('ok');return;}
  try{const record=JSON.parse(await readFile(source,'utf8'));const info={asset:'NOMNI',name:record.name,description:record.description,image:record.image,website:record.website,category:'Currency',subcategory:'Bitcoin / Counterparty',images:record.images,files:record.files};res.writeHead(200,{'content-type':'application/json; charset=utf-8','access-control-allow-origin':'*','cache-control':'public, max-age=60'});res.end(JSON.stringify(info));}catch{res.writeHead(503);res.end('Metadata unavailable');}
}).listen(Number(process.env.PORT||10000),'0.0.0.0');
