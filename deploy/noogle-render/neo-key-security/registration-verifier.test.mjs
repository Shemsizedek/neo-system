import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash, generateKeyPairSync, randomBytes} from 'node:crypto';
import {createVerifiedRegistrationAdapter} from './registration-verifier.mjs';

const rpId='connect.example.test',origin=`https://${rpId}`;
const sha256=data=>createHash('sha256').update(data).digest();
// Minimal deterministic CBOR test fixture, not a production parser.
function hdr(major,n){
  if(n<24)return Buffer.from([(major<<5)|n]);
  if(n<256)return Buffer.from([(major<<5)|24,n]);
  if(n<65536){const b=Buffer.alloc(3);b[0]=(major<<5)|25;b.writeUInt16BE(n,1);return b;}
  throw Error('fixture too large');
}
function cbor(value){
  if(typeof value==='number')return hdr(value>=0?0:1,value>=0?value:-1-value);
  if(typeof value==='string'){const b=Buffer.from(value);return Buffer.concat([hdr(3,b.length),b]);}
  if(Buffer.isBuffer(value))return Buffer.concat([hdr(2,value.length),value]);
  if(value instanceof Map){const pairs=[...value.entries()].flatMap(([k,v])=>[cbor(k),cbor(v)]);return Buffer.concat([hdr(5,value.size),...pairs]);}
  throw Error('unsupported CBOR fixture');
}
function registration({challenge,clientOrigin=origin,verified=true,alg=-7,rawId=randomBytes(32)}={}){
  const {publicKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
  const jwk=publicKey.export({format:'jwk'});
  const cose=cbor(new Map([[1,2],[3,alg],[-1,1],[-2,Buffer.from(jwk.x,'base64url')],[-3,Buffer.from(jwk.y,'base64url')]]));
  const credentialLen=Buffer.alloc(2);credentialLen.writeUInt16BE(rawId.length);
  const auth=Buffer.concat([sha256(Buffer.from(rpId)),Buffer.from([verified?0x45:0x41]),Buffer.alloc(4),Buffer.alloc(16),credentialLen,rawId,cose]);
  const object=cbor(new Map([['fmt','none'],['attStmt',new Map()],['authData',auth]]));
  const client=Buffer.from(JSON.stringify({type:'webauthn.create',challenge,origin:clientOrigin,crossOrigin:false}));
  return {id:rawId.toString('base64url'),rawId:rawId.toString('base64url'),type:'public-key',response:{attestationObject:object.toString('base64url'),clientDataJSON:client.toString('base64url')},clientExtensionResults:{}};
}
const challenge=randomBytes(32).toString('base64url');
test('vetted WebAuthn verifier accepts cryptographically valid P256 none-attestation',async()=>{
  const verify=createVerifiedRegistrationAdapter();
  const response=registration({challenge});
  const result=await verify({response,expectedChallenge:challenge,expectedRPID:rpId,expectedOrigin:origin,requireUserVerification:true});
  if (!result) {
    // Synthetic fixture diagnostic: no user data or secrets; remove after CI.
    try {
      const sw=await import('@simplewebauthn/server');
      const raw=await sw.verifyRegistrationResponse({response,expectedChallenge:challenge,expectedRPID:rpId,expectedOrigin:origin,requireUserVerification:true,requireUserPresence:true,supportedAlgorithmIDs:[-7]});
      console.log('fixture_registration_verified',raw.verified,'credential_fields',Object.keys(raw.registrationInfo?.credential??{}));
      const helpers=await import('@simplewebauthn/server/helpers');
      const key=helpers.convertCOSEtoPKCS(raw.registrationInfo.credential.publicKey);
      const crypto=await import('node:crypto');
      try {
        const parsed=crypto.createPublicKey({key:Buffer.from(key),format:'der',type:'spki'});
        console.log('fixture_key_parsed',parsed.asymmetricKeyType,parsed.asymmetricKeyDetails?.namedCurve);
      } catch(e) { console.log('fixture_key_parse_error',e.message); }
    } catch(e) { console.log('fixture_library_rejected',e.message); }
  }
  assert.equal(result?.verified,true);
  assert.equal(result?.userVerified,true);
  assert.equal(result.credentialId,response.id);
  assert.equal(result.signCount,0);
  assert.match(result.publicKeyPem,/BEGIN PUBLIC KEY/);
});
test('reject wrong challenge, RP origin and missing user verification',async()=>{
  const verify=createVerifiedRegistrationAdapter();
  const response=registration({challenge});
  const scope={response,expectedChallenge:challenge,expectedRPID:rpId,expectedOrigin:origin,requireUserVerification:true};
  assert.equal(await verify({...scope,expectedChallenge:randomBytes(32).toString('base64url')}),null);
  assert.equal(await verify({...scope,expectedOrigin:'https://evil.example.test'}),null);
  assert.equal(await verify({...scope,response:registration({challenge,clientOrigin:'https://evil.example.test'})}),null);
  assert.equal(await verify({...scope,response:registration({challenge,verified:false})}),null);
});
test('reject unsupported COSE algorithm, bypass flag and malformed CBOR',async()=>{
  const verify=createVerifiedRegistrationAdapter();
  const scope={expectedChallenge:challenge,expectedRPID:rpId,expectedOrigin:origin,requireUserVerification:true};
  assert.equal(await verify({...scope,response:registration({challenge,alg:-257})}),null);
  assert.equal(await verify({...scope,response:{...registration({challenge}),response:{attestationObject:'bad',clientDataJSON:'bad'}}}),null);
  assert.equal(await verify({...scope,requireUserVerification:false,response:registration({challenge})}),null);
  assert.equal(await verify({...scope,response:{verified:true}}),null);
});
