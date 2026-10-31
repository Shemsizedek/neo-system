import { createSalesHttpServer } from './sales-http.mjs';
const hosts=['127.0.0.1','localhost','neo-sales-mcp-staging.onrender.com',process.env.RENDER_EXTERNAL_HOSTNAME].filter(Boolean);
const server=createSalesHttpServer({allowedHosts:hosts});
server.listen(Number(process.env.PORT||10000),'0.0.0.0',()=>console.log('NEO Sales MCP public read-only pilot listening'));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{
  server.close(()=>process.exit(0));
  setTimeout(()=>{server.closeAllConnections();process.exit(0);},10000).unref();
});
