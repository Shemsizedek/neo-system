import test from 'node:test';
import assert from 'node:assert/strict';
import {createBip322Verifier} from './bip322-verifier.mjs';
test('BIP-322 production adapter rejects unsupported types before calling crypto',async()=>{
 const verify=createBip322Verifier();
 assert.equal(await verify({address:'bc1q9vza2e8x573nczrlzms0wvx3gsqjx7vavgkx0l',message:'Hello World',signature:'fulAAAA',network:'bitcoin-mainnet',scheme:'BIP322'}),false);
 assert.equal(await verify({address:'tb1q9vza2e8x573nczrlzms0wvx3gsqjx7vavgkx0l',message:'Hello World',signature:'smpAAAA',network:'bitcoin-mainnet',scheme:'BIP322'}),false);
});
test('official BIP-322 p2wpkh simple proof (integration vector)',async(t)=>{
 // Based on bitcoin/bips/bip-0322/basic-test-vectors.json.
 const verify=createBip322Verifier();
 const passed=await verify({address:'bc1q9vza2e8x573nczrlzms0wvx3gsqjx7vavgkx0l',message:'Hello World',network:'bitcoin-mainnet',scheme:'BIP322',signature:'smpAkcwRAIgZRfIY3p7/DoVTty6YZbWS71bc5Vct9p9Fia83eRmw2QCICK/ENGfwLtptFluMGs2KsqoNSk89pO7F29zJLUx9a/sASECx/EgAxlkQpQ9hYjgGu6EBCPMVPwVIVJqO4XCsMvViHI='});
 assert.equal(passed,true,'Official vector must pass before enabling NEO_BANK_BIP322_VERIFY_ENABLED');
});
