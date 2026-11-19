import {createHash, generateKeyPairSync, randomBytes, sign} from 'node:crypto';

// Synthetic software authenticator for isolated cryptographic tests ONLY.
// Not FIDO2 hardware, not an attestation certificate, not for production.
const hash=data=>createHash('sha256').update(data).digest();
const encodeHeader=(major,length)=>{
  if(length<24)return Buffer.from([(major<<5)|length]);
  if(length<256)return Buffer.from([(major<<5)|24,length]);
  if(length<65536){const b=Buffer.alloc(3);b[0]=(major<<5)|25;b.writeUInt16BE(length,1);return b;}
  throw Error('fixture_length_exceeded');
};
const cbor=v=>{
  if(typeof v==='number')return encodeHeader(v>=0?0:1,v>=0?v:-1-v);
  if(typeof v==='string'){const b=Buffer.from(v);return Buffer.concat([encodeHeader(3,b.length),b]);}
  if(Buffer.isBuffer(v))return Buffer.concat([encodeHeader(2,v.length),v]);
  if(v instanceof Map)return Buffer.concat([encodeHeader(5,v.size),...[...v].flatMap(([k,val])=>[cbor(k),cbor(val)])]);
  throw Error('unsupported_test_cbor');
};

export function createSoftwareAuthenticator(rpId, origin=`https://${rpId}`) {
  const {publicKey,privateKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
  const jwk=publicKey.export({format:'jwk'});
  const rawId=randomBytes(24);
  const id=rawId.toString('base64url');
  const cose=cbor(new Map([[1,2],[3,-7],[-1,1],[-2,Buffer.from(jwk.x,'base64url')],[-3,Buffer.from(jwk.y,'base64url')]]));
  return Object.freeze({
    id,
    registration(challenge) {
      const len=Buffer.alloc(2);len.writeUInt16BE(rawId.length);
      const auth=Buffer.concat([
        hash(Buffer.from(rpId)),Buffer.from([0x45]),
        Buffer.alloc(4),Buffer.alloc(16),len,rawId,cose
      ]);
      const attestation=cbor(new Map([['fmt','none'],['attStmt',new Map()],['authData',auth]]));
      const client=Buffer.from(JSON.stringify({type:'webauthn.create',challenge,origin,crossOrigin:false}));
      return {id,rawId:id,type:'public-key',response:{
        attestationObject:attestation.toString('base64url'),
        clientDataJSON:client.toString('base64url')
      },clientExtensionResults:{}};
    },
    assertion(challenge,{counter=0,clientOrigin=origin,userVerified=true}={}) {
      const client=Buffer.from(JSON.stringify({type:'webauthn.get',challenge,origin:clientOrigin,crossOrigin:false}));
      const auth=Buffer.alloc(37);
      hash(Buffer.from(rpId)).copy(auth);auth[32]=userVerified?0x05:0x01;auth.writeUInt32BE(counter,33);
      const signature=sign('sha256',Buffer.concat([auth,hash(client)]),privateKey);
      return {id,rawId:id,type:'public-key',response:{
        clientDataJSON:client.toString('base64url'),
        authenticatorData:auth.toString('base64url'),
        signature:signature.toString('base64url'),userHandle:null
      },clientExtensionResults:{}};
    }
  });
}
