import test from 'node:test';
import assert from 'node:assert/strict';
import {validateInquiry, makeLeadIntake, IntakeError} from '../lead-intake.mjs';
const valid={company:'Example Research',email:'ops@example.com',project:'We need a new institutional knowledge platform.',service:'Strategic Architecture',budget:'$75,000–$150,000',timeline:'1–3 months',consent:true};
test('validated inquiry preserves allowed fields',()=>{const v=validateInquiry(valid);assert.equal(v.organization,'Example Research');assert.equal(v.email,'ops@example.com');});
test('consent required',()=>assert.throws(()=>validateInquiry({...valid,consent:false}),/consent_required/));
test('honeypot rejected',()=>assert.throws(()=>validateInquiry({...valid,website:'buy now'}),/spam_rejected/));
test('invalid offering rejected',()=>assert.throws(()=>validateInquiry({...valid,service:'Guaranteed investment'}),/invalid_selection/));
test('overlong source rejected',()=>assert.throws(()=>validateInquiry({...valid,project:'x'.repeat(2100)}),/field_too_long/));
test('unsupported types rejected',()=>assert.throws(()=>validateInquiry({...valid,email:{toString(){return 'ops@example.com';}}}),/required_fields_invalid/));
test('API denies submission without durable store and limiter',async()=>{
  let status,body;
  const req={method:'POST'};
  const res={writeHead(s){status=s;},end(data){body=JSON.parse(data);}};
  await makeLeadIntake({origin:'https://desk.holytemples.org',enabled:true})(req,res);
  assert.equal(status,503);assert.equal(body.error,'intake_not_configured');
});
test('API denies requests from unexpected origin',async()=>{
  let status,body;
  const req={method:'POST',headers:{origin:'https://evil.example','content-type':'application/json'}};
  const res={writeHead(s){status=s;},end(data){body=JSON.parse(data);}};
  await makeLeadIntake({origin:'https://desk.holytemples.org',enabled:true,store:{insertIfAbsent(){}},rateLimiter:{allow(){return true;}}})(req,res);
  assert.equal(status,403);assert.equal(body.error,'origin_not_allowed');
});
