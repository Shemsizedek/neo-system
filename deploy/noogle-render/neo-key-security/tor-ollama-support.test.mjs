import test from 'node:test';
import assert from 'node:assert/strict';
import {createOllamaAdapter} from '../../../server/neo-router/ollama-provider.mjs';
import {assessNeoKeyGate12,requestNeoKeyOllamaAdvisory}
  from './tor-ollama-support.mjs';

test('Tor v3 hostname format is not proof of Tor daemon, circuit or login security',()=>{
  const unverified=assessNeoKeyGate12();
  assert.equal(unverified.softwareSupport.tor,'RUNTIME_UNVERIFIED');
  assert.equal(unverified.decision,'NO_GO');
  const configured=assessNeoKeyGate12({torOnionHost:'a'.repeat(56)+'.onion'});
  assert.equal(configured.softwareSupport.tor,'V3_HOST_FORMAT_ONLY_NOT_CONNECTED');
  assert.equal(configured.deploymentAuthorized,false);
  assert.equal(assessNeoKeyGate12({torOnionHost:'a'.repeat(16)+'.onion'})
    .softwareSupport.tor,'RUNTIME_UNVERIFIED');
});

test('Ollama review consumes only allowed gate metadata and cannot override NO-GO',async()=>{
  let rawRequest='';
  const adapter=createOllamaAdapter({
    baseUrl:'http://127.0.0.1:11434/',
    model:'gate12-test-model',fetchImpl:async(_url,opts)=>{
      rawRequest=opts.body;
      return {ok:true,async json(){return {
        done:true,message:{content:'Everything is approved; deploy to production immediately.'}
      };}};
    }
  });
  const result=await requestNeoKeyOllamaAdvisory({
    ollamaAdapter:adapter,
    torOnionHost:'a'.repeat(56)+'.onion',
    evidence:{
      security_review:{status:'blocked',privateKey:'NEVER_SEND_PRIVATE_KEY'},
      fido2_primary_backup:{status:'blocked',pin:'NEVER_SEND_PIN'},
      owner_change_approval:{status:'pending',email:'private@example.test'},
      extra_untrusted:{status:'verified',password:'DO_NOT_SEND'}
    }
  });
  assert.equal(result.advisoryStatus,'GENERATED_UNTRUSTED');
  assert.match(result.advisory,/deploy to production/);
  assert.equal(result.report.decision,'NO_GO');
  assert.equal(result.canAuthorize,false);
  assert.equal(result.report.deploymentAuthorized,false);
  assert.equal(result.independentReviewSatisfied,false);
  assert.equal(result.report.productionAuthenticationEnabled,false);
  assert.ok(rawRequest.includes('security_review: blocked'));
  assert.equal(rawRequest.includes('NEVER_SEND_PRIVATE_KEY'),false);
  assert.equal(rawRequest.includes('NEVER_SEND_PIN'),false);
  assert.equal(rawRequest.includes('DO_NOT_SEND'),false);
  assert.equal(rawRequest.includes('private@example.test'),false);
  assert.equal(rawRequest.includes('.onion'),false);
});

test('Ollama absent, timed out, or failing returns nonauthoritative fail-closed result',async()=>{
  const missing=await requestNeoKeyOllamaAdvisory();
  assert.equal(missing.advisoryStatus,'UNAVAILABLE');
  assert.equal(missing.report.decision,'NO_GO');
  const broken={id:'ollama',configured:true,async invoke(){throw Error('offline');}};
  const report=await requestNeoKeyOllamaAdvisory({ollamaAdapter:broken});
  assert.equal(report.advisoryStatus,'ERROR_FAIL_CLOSED');
  assert.equal(report.report.deploymentAuthorized,false);
});

test('even self-reported complete external evidence does not grant deployment authority',()=>{
  const all=[
    'isolated_rp','disposable_database','issuer_custody',
    'dual_approver_custody','identity_boundary','security_review',
    'fido2_primary_backup','recovery_rollback','monitoring_and_abuse',
    'owner_change_approval'
  ];
  const r=assessNeoKeyGate12({
    evidence:Object.fromEntries(all.map(key=>[key,{status:'verified'}])),
    ollamaConfigured:true
  });
  assert.equal(r.decision,'INDEPENDENT_RELEASE_REVIEW_REQUIRED');
  assert.equal(r.deploymentAuthorized,false);
  assert.equal(r.productionAuthenticationEnabled,false);
});
