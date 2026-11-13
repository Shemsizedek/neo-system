import { createHttpServer } from './http.mjs';
// Gate 3 deploy stays locked. No environment flag or pasted token can enable
// private tools. Gate 4 must wire a verified issuer and durable store explicitly.
const hosts=['127.0.0.1','localhost',process.env.RENDER_EXTERNAL_HOSTNAME].filter(Boolean);
const server=createHttpServer({allowedHosts:hosts});
server.listen(Number(process.env.PORT||10000),'0.0.0.0',()=>console.log('Noogle Connect locked staging listening'));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{
  server.close(()=>process.exit(0));
  setTimeout(()=>{server.closeAllConnections();process.exit(0);},10000).unref();
});
