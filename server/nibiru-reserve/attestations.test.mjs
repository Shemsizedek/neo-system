import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {canonicalAttestationPayload,createAttestationRegistry} from './attestations.mjs';

test('verifies trusted Ed25519 attestation and rejects tampering',()=>{const{publicKey,privateKey}=crypto.generateKeyPairSync('ed25519');const base={id:'ATT-1',unit:'USD',backingValue:100,liabilitiesValue:80,asOf:'2026-08-28T00:00:00Z',custodianRef:'C-1',auditorRef:'A-1',statementHash:'sha256:abc',keyId:'K-1'};const signature=crypto.sign(null,canonicalAttestationPayload(base),privateKey).toString('base64');const registry=createAttestationRegistry({now:()=> '2026-08-29T00:00:00Z',trustedPublicKeys:{'K-1':publicKey}});const row=registry.verify({...base,signature});assert.equal(row.signatureValid,true);assert.equal(row.coverageRatio,1.25);assert.throws(()=>registry.verify({...base,backingValue:99,signature}),/signature is invalid/)});
