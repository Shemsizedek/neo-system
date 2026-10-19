import http from 'node:http';
import {createStagingStore} from './neon-adapter.mjs';
import {buildSecuredStagingHandler} from './authenticated-app.mjs';
import {pathToFileURL} from 'node:url';

export async function startPrivateStaging({env=process.env,Pool,fetchImpl}={}){
 const host=env.STAGING_BIND_ADDRESS||'127.0.0.1';
 if(host!=='127.0.0.1'&&host!=='::1')throw new Error('loopback_only_until_private_gateway_certified');
 if(env.STAGING_ACCESS_PROXY_VERIFIED!=='true')throw new Error('private_gateway_not_certified');
 const {pool,store}=await createStagingStore({env,Pool});
 try{
  const handler=buildSecuredStagingHandler({env,store,fetchImpl});
  const server=http.createServer((req,res)=>handler(req,res));
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(Number(env.PORT||10000),host,resolve);});
  return {server,pool};
 }catch(e){await pool.end();throw e;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 // Explicitly no auto-start unless all dependencies are configured by trusted operations.
 console.error('Use trusted private runner with injected pg.Pool and managed secrets.');
 process.exitCode=1;
}
