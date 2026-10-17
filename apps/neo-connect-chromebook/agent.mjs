import http from 'node:http';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const origin='https://connect.holytemples.org';
const token=randomBytes(32).toString('hex');
const port=Number(process.env.NEO_CONNECT_PORT||8766);
export function createAgent({secret=token,run=runCommand}={}){
 return http.createServer(async(req,res)=>{
  const reply=(status,data)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','access-control-allow-origin':origin,'vary':'Origin','access-control-allow-headers':'content-type,x-neo-token','access-control-allow-methods':'POST,OPTIONS','access-control-allow-private-network':'true'});res.end(JSON.stringify(data))};
  if(req.headers.origin!==origin)return reply(403,{error:'origin_denied'});
  if(req.method==='OPTIONS')return reply(204,{});
  if(req.method!=='POST'||req.url!=='/command')return reply(404,{error:'not_found'});
  const supplied=String(req.headers['x-neo-token']||'');
  if(supplied.length!==secret.length||!timingSafeEqual(Buffer.from(supplied),Buffer.from(secret)))return reply(401,{error:'authentication_required'});
  let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>4096)return reply(413,{error:'too_large'})}
  let body;try{body=JSON.parse(raw)}catch{return reply(400,{error:'invalid_json'})}
  if(typeof body.command!=='string'||!body.command.trim()||body.command.length>512)return reply(400,{error:'invalid_command'});
  try{return reply(200,await run(body.command))}catch{return reply(500,{error:'command_failed'})}
 });
}
function runCommand(command){
 return new Promise(resolve=>{
  const child=spawn('/bin/sh',['-c',command],{cwd:process.env.HOME||process.cwd(),env:{PATH:process.env.PATH||'/usr/bin:/bin',HOME:process.env.HOME||''},stdio:['ignore','pipe','pipe']});
  let output='',finished=false;
  const finish=(code)=>{if(finished)return;finished=true;resolve({output:output.slice(0,16384),code})};
  const timer=setTimeout(()=>{child.kill('SIGKILL');finish(124)},8000);
  for(const stream of [child.stdout,child.stderr])stream.on('data',chunk=>{output=(output+chunk.toString()).slice(0,16384)});
  child.on('error',()=>{clearTimeout(timer);finish(127)});
  child.on('close',code=>{clearTimeout(timer);finish(code??1)});
 });
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 const server=createAgent();
 server.listen(port,'127.0.0.1',()=>{console.log('NEO Connect Chromebook companion listening on 127.0.0.1:'+port);console.log('Paste this session token into connect.holytemples.org: '+token)});
}
