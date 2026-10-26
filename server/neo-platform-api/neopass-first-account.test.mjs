import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createNeopassFirstAccount,createNeopassFirstAccountStore} from './neopass-first-account.mjs';
test('first-account reservation is pinned, idempotent, persistent and cannot be reassigned',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'neopass-owner-')),path=join(dir,'owner.sqlite');let store=createNeopassFirstAccountStore(path);t.after(()=>{store.close();rmSync(dir,{recursive:true,force:true});});
 const config={expectedIssuer:'https://accounts.google.com',expectedProviderSubject:'verified-owner-subject',resolveOwnerIdentity:async session=>session==='owner'?{verified:true,issuer:'https://accounts.google.com',providerSubject:'verified-owner-subject',canonicalSubject:'existing-owner-account'}:{verified:true,issuer:'https://accounts.google.com',providerSubject:'someone-else'}};
 await assert.rejects(()=>createNeopassFirstAccount({...config,store})('attacker'),/verified_first_owner/);
 const first=await createNeopassFirstAccount({...config,store})('owner');assert.equal(first.accountNumber,1);assert.equal(first.servicePermissionsGranted,false);
 store.close();store=createNeopassFirstAccountStore(path);assert.equal((await createNeopassFirstAccount({...config,store})('owner')).subject,first.subject);
 await assert.rejects(()=>store.reserve({issuer:'https://accounts.google.com',providerSubject:'new-owner',canonicalSubject:'different-account'}),/already_reserved/);
});
