import test from 'node:test';
import assert from 'node:assert/strict';
import { firestoreCodec, createMetadataTokenProvider } from './firestore-rest-db.mjs';

test('Firestore codec round-trips JSON-compatible values',()=>{
  const source={s:'x',n:7,d:1.5,b:true,z:null,a:[1,'two'],m:{ok:false}};
  const encoded=firestoreCodec.encodeFields(source);
  assert.deepEqual(firestoreCodec.decodeFields(encoded),source);
});

test('metadata token provider caches tokens before expiry',async()=>{
  let calls=0;let now=0;
  const fetchImpl=async()=>{calls++;return {ok:true,json:async()=>({access_token:'token-a',expires_in:300})};};
  const token=createMetadataTokenProvider({fetchImpl,now:()=>now});
  assert.equal(await token(),'token-a');
  now=1000;
  assert.equal(await token(),'token-a');
  assert.equal(calls,1);
});
