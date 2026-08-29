import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {mkdtempSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {loadNibiruRuntimeConfig} from './runtimeConfig.mjs';

test('loads only Ed25519 public trust roots and pinned schema config',()=>{
 const dir=mkdtempSync(join(tmpdir(),'nibiru-config-')),{publicKey}=crypto.generateKeyPairSync('ed25519');
 const keys=join(dir,'keys.json'),xsd=join(dir,'pain.xsd'),schema=Buffer.from('<schema/>');
 writeFileSync(keys,JSON.stringify({K1:publicKey.export({type:'spki',format:'pem'})}));writeFileSync(xsd,schema);
 const digest=crypto.createHash('sha256').update(schema).digest('hex');
 const config=loadNibiruRuntimeConfig({NIBIRU_TRUST_KEYS_PATH:keys,NIBIRU_ISO_XSD_PATH:xsd,NIBIRU_ISO_XSD_SHA256:digest});
 assert.equal(config.trustedPublicKeys.K1.asymmetricKeyType,'ed25519');assert.equal(config.isoSchemaSha256,digest);
});

test('rejects a schema file that differs from its pinned digest',()=>{
 const dir=mkdtempSync(join(tmpdir(),'nibiru-config-')),{publicKey}=crypto.generateKeyPairSync('ed25519');
 const keys=join(dir,'keys.json'),xsd=join(dir,'pain.xsd');
 writeFileSync(keys,JSON.stringify({K1:publicKey.export({type:'spki',format:'pem'})}));writeFileSync(xsd,'<schema/>');
 assert.throws(()=>loadNibiruRuntimeConfig({NIBIRU_TRUST_KEYS_PATH:keys,NIBIRU_ISO_XSD_PATH:xsd,NIBIRU_ISO_XSD_SHA256:'a'.repeat(64)}),/does not match/);
});
