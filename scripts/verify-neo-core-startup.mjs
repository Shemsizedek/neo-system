// Gate 025: boot the exact NEO edge entrypoint without changing production.
import {spawn} from "node:child_process";
import {setTimeout as sleep} from "node:timers/promises";
const port=19357;
const child=spawn(process.execPath,["server/neo-edge/production.mjs"],{
  cwd:process.cwd(),
  env:{...process.env,PORT:String(port),NODE_ENV:"test"},
  stdio:["ignore","pipe","pipe"]
});
let output="",exitCode=null;
const capture=(buf)=>{output=(output+buf.toString()).slice(-10000)};
child.stdout.on("data",capture);child.stderr.on("data",capture);
child.once("exit",code=>{exitCode=code});
const fetchRoute=async(path)=>{
  const resp=await fetch("http://127.0.0.1:"+port+path,{
    headers:{host:"neo.holytemples.org","x-forwarded-host":"neo.holytemples.org"},
    redirect:"manual",
    signal:AbortSignal.timeout(1800)
  });
  const body=(await resp.text()).slice(0,800);
  return {status:resp.status,contentType:resp.headers.get("content-type"),recovery:/public-recovery|temple-continuity|is recovering/i.test(body),preview:body.slice(0,230)};
};
try {
  let healthy=null;
  for(let i=0;i<35;i++){
    if(exitCode!==null)break;
    await sleep(600);
    try{healthy=await fetchRoute("/health");break}catch{}
  }
  if(!healthy)throw Error("NEO edge did not bind PORT or exited early. Logs: "+output.slice(-2200));
  const routes={"/health":healthy};
  for(const path of ["/","/neosync/","/corpus/"]){
    try{routes[path]=await fetchRoute(path)}catch(e){routes[path]={error:String(e.message||e)}}
  }
  console.log(JSON.stringify({serverBooted:true,portBound:port,routes,productionChanged:false},null,2));
  if(healthy.status!==200)throw Error("Health route did not return HTTP 200");
  if(healthy.recovery)throw Error("Health route is recovery placeholder");
  console.log("NEO_EDGE_BOOT_SMOKE_PASS — member and corpus flows still require live tests");
}catch(e){
  console.error("NEO_EDGE_BOOT_SMOKE_FAIL: "+e.message);
  process.exitCode=1;
}finally{
  child.kill("SIGTERM");
  await Promise.race([new Promise(resolve=>child.once("exit",resolve)),sleep(2000)]);
  if(exitCode===null)child.kill("SIGKILL");
}
