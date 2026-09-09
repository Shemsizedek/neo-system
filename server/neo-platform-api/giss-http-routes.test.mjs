import test from 'node:test';
import assert from 'node:assert/strict';
import { createInMemoryTempleRegistry, createTempleCitizenGISSService } from './temple-citizen-giss.mjs';
import { createGissHttpHandler } from './giss-http-routes.mjs';

function fixture() {
  const enrollmentId = 'giss:citizen-24';
  const registry = createInMemoryTempleRegistry({ credentials: [['neopass:24',{id:'np-24',status:'active',templeCitizenId:'citizen-24'}]], citizens: [['citizen-24',{id:'citizen-24',status:'active'}]], bookOfLife: [['citizen-24',{id:'bol-24',status:'active'}]], degreeAssignments: [[enrollmentId,{id:'degree-1',enrollmentId,templeDegree:1,lesson:'Christism & the Study of Sutekh',council:'Council of Arius'}]], portfolios: [[enrollmentId,{id:'portfolio-24',status:'active'}]], advancements: [[enrollmentId,{status:'not_submitted'}]] });
  return createGissHttpHandler({ service: createTempleCitizenGISSService({registry}), subjectResolver: req => req.headers['x-neopass-subject'] || null });
}
function response() { return { status:null, body:null, writeHead(status){this.status=status;}, end(payload){this.body=payload?JSON.parse(payload):null;} }; }
async function call(handler, method, path, subject='neopass:24') { const res=response(); const req={method,url:path,headers:subject?{'x-neopass-subject':subject}:{}}; const handled=await handler(req,res); return {handled,res}; }

test('requires NEOpass identity', async()=>{ const {res}=await call(fixture(),'GET','/api/v1/temple/giss/eligibility',null); assert.equal(res.status,401); assert.equal(res.body.error,'neopass_identity_required'); });
test('returns GISS eligibility', async()=>{ const {res}=await call(fixture(),'GET','/api/v1/temple/giss/eligibility'); assert.equal(res.status,200); assert.equal(res.body.eligible,true); assert.equal(res.body.entitlement,'giss.enroll'); });
test('provisions enrollment', async()=>{ const {res}=await call(fixture(),'POST','/api/v1/temple/giss/enroll'); assert.equal(res.status,200); assert.equal(res.body.enrollment.status,'enrolled'); });
test('returns Degree 1 LMS dashboard', async()=>{ const {res}=await call(fixture(),'GET','/api/v1/temple/giss/dashboard'); assert.equal(res.status,200); assert.equal(res.body.degreeAssignment.templeDegree,1); assert.equal(res.body.lms.dashboardState,'assigned'); });
test('returns Nous Portfolio', async()=>{ const {res}=await call(fixture(),'GET','/api/v1/temple/giss/portfolio'); assert.equal(res.status,200); assert.equal(res.body.nousPortfolio.id,'portfolio-24'); });
test('returns Council advancement state', async()=>{ const {res}=await call(fixture(),'GET','/api/v1/temple/giss/council'); assert.equal(res.status,200); assert.equal(res.body.councilAdvancement.status,'not_submitted'); });
