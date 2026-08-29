import {readFileSync,statSync} from 'node:fs';
import crypto from 'node:crypto';

const required=(env,key)=>{const value=String(env[key]||'').trim();if(!value)throw new Error(`${key} is required`);return value};
export function loadNibiruRuntimeConfig(env=process.env){
  const trustKeysPath=required(env,'NIBIRU_TRUST_KEYS_PATH');
  const isoSchemaPath=required(env,'NIBIRU_ISO_XSD_PATH');
  const isoSchemaSha256=required(env,'NIBIRU_ISO_XSD_SHA256').toLowerCase();
  if(!/^[a-f0-9]{64}$/.test(isoSchemaSha256))throw new Error('NIBIRU_ISO_XSD_SHA256 must be 64 hexadecimal characters');
  if(!statSync(isoSchemaPath).isFile()||!statSync(trustKeysPath).isFile())throw new Error('Nibiru runtime paths must point to files');
  const actualSchemaSha256=crypto.createHash('sha256').update(readFileSync(isoSchemaPath)).digest('hex');
  if(actualSchemaSha256!==isoSchemaSha256)throw new Error('NIBIRU_ISO_XSD_SHA256 does not match the configured schema file');
  const source=JSON.parse(readFileSync(trustKeysPath,'utf8')),trustedPublicKeys={};
  if(!source||Array.isArray(source)||typeof source!=='object'||Object.keys(source).length===0)throw new Error('trust key file must contain a non-empty object');
  for(const[keyId,pem]of Object.entries(source)){const key=crypto.createPublicKey(pem);if(key.asymmetricKeyType!=='ed25519')throw new Error(`trust key ${keyId} is not Ed25519`);trustedPublicKeys[keyId]=key}
  return{dbPath:String(env.NIBIRU_RESERVE_DB_PATH||'./data/nibiru-reserve.sqlite'),trustKeysPath,isoSchemaPath,isoSchemaSha256,xsdExecutable:String(env.NIBIRU_XSD_EXECUTABLE||'xmllint'),trustedPublicKeys};
}
