import {readFileSync,writeFileSync,mkdirSync,statSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {randomBytes,generateKeyPairSync} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {createNooglePasskeyStore} from '../../server/neo-platform-api/noogle-passkey-store.mjs';
import {createNooglePasskeyAccounts} from '../../server/neo-platform-api/noogle-passkey-accounts.mjs';
import {createNoogleOidcStore} from '../../server/neo-platform-api/noogle-oidc-store.mjs';
import {createNoogleOidcHandler} from '../../server/neo-platform-api/noogle-oidc.mjs';
import {createNooglePasskeyServer} from '../../server/neo-platform-api/noogle-passkey-http.mjs';

export async function createRenderNeopass({env=process.env}={}) {
 const origin=new URL(env.NEOPASS_ORIGIN);
 if(origin.protocol!=='https:'||origin.origin!==env.NEOPASS_ORIGIN)throw Error('canonical_https_origin_required');
 if(!env.NEOPASS_DATA_DIR)throw Error('persistent_data_directory_required');
 const dir=resolve(env.NEOPASS_DATA_DIR);
 if(env.RENDER==='true') {
  const mounts=readFileSync('/proc/self/mountinfo','utf8').split('\n').map(line=>line.split(' ')[4]);
  if(dir!=='/var/data/neopass'||!mounts.includes('/var/data'))throw Error('render_persistent_mount_required');
 }
 // Enrollment stays disabled until the existing first owner has been migrated.
 if(env.NEOPASS_ALLOW_REGISTRATION==='true')throw Error('owner_migration_required_before_enrollment');
 const clients=JSON.parse(env.NEOPASS_CLIENTS_JSON||'[]');
 if(!Array.isArray(clients))throw Error('client_registry_required');
 mkdirSync(dir,{recursive:true,mode:0o700});
 const keyFile=join(dir,'issuer-keys.json');
 let keys;
 try{keys=JSON.parse(readFileSync(keyFile,'utf8'));}
 catch(error){
  if(error.code!=='ENOENT')throw Error('issuer_key_file_invalid');
  const {privateKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
  keys={privateJwk:privateKey.export({format:'jwk'}),kid:randomBytes(12).toString('hex'),pairwiseSecret:randomBytes(48).toString('base64url')};
  writeFileSync(keyFile,JSON.stringify(keys),{flag:'wx',mode:0o600});
 }
 if((statSync(keyFile).mode&0o077)!==0)throw Error('issuer_key_permissions_required');
 let passkeys,oidc;
 try{
  passkeys=createNooglePasskeyStore(join(dir,'passkeys.sqlite'));
  oidc=createNoogleOidcStore(join(dir,'oidc.sqlite'));
  const accounts=createNooglePasskeyAccounts({rpId:origin.hostname,origin:origin.origin,store:passkeys});
  const handler=await createNoogleOidcHandler({issuer:origin.origin,clients,store:oidc,accounts,...keys});
  const server=createNooglePasskeyServer({origin:origin.origin,accounts,allowRegistration:false,oidcHandler:async(req,res)=>{
   if(req.method==='GET'&&req.url==='/healthz') {res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify({status:'ok',registrationEnabled:false}));return true;}
   return handler(req,res);
  }});
  server.once('close',()=>{passkeys.close();oidc.close();});
  return server;
 }catch(error){passkeys?.close();oidc?.close();throw error;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
 try {
  const server=await createRenderNeopass();const port=Number(process.env.PORT||10000);
  server.listen(port,'0.0.0.0',()=>console.log('NEO Pass Render service listening'));
  for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>server.close());
 }catch{console.error('NEO Pass startup blocked: verify origin, persistent mount, client registry and issuer key configuration');process.exitCode=1;}
}
