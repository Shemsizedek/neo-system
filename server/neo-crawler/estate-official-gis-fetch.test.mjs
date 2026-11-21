import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildOfficialGISReadOnlyQuery, probeOfficialGIS, runOfficialGISCli } from './estate-official-gis-fetch.mjs';
const feature=(acct_num='0012345678901')=>({attributes:{acct_num,tax_year:'2026',state_class:'A1',total_market_val:150000,
  confidential_flag:'N',owner_name_1:'DO NOT EXPORT OWNER',mail_addr_1:'DO NOT EXPORT MAILING'}});
const good = () => new Response(JSON.stringify({features:[feature()]}),{status:200,headers:{'content-type':'application/json'}});

test('builds only HCAD official URL and minimal whitelisted public fields',()=>{
  const query=new URL(buildOfficialGISReadOnlyQuery({year:'2026',count:10}));
  assert.equal(query.hostname,'www.gis.hctx.net');
  assert.equal(query.pathname.endsWith('/query'),true);
  assert.equal(query.searchParams.get('where'),"tax_year='2026'");
  assert.equal(query.searchParams.get('returnGeometry'),'false');
  assert.equal(query.searchParams.get('outFields').includes('owner'),false);
  assert.equal(query.searchParams.get('outFields').includes('mail'),false);
  assert.equal(query.searchParams.get('resultRecordCount'),'10');
});
test('rejects unbounded counts and invalid years',()=>{
  assert.throws(()=>buildOfficialGISReadOnlyQuery({count:2000}),/invalid_sample_count/);
  assert.throws(()=>buildOfficialGISReadOnlyQuery({count:0}),/invalid_sample_count/);
  assert.throws(()=>buildOfficialGISReadOnlyQuery({year:"2026' OR 1=1"}),/invalid_tax_year/);
});
test('test transport never represents a verified direct public source',async()=>{
  let captured;
  const result=await probeOfficialGIS({fetchImpl:async (u,opts)=>{captured={u,opts};return good();},observedAt:()=> '2026-11-15T23:45:00Z'});
  assert.equal(captured.opts.method,'GET');
  assert.equal(captured.opts.redirect,'error');
  assert.equal(captured.opts.credentials,'omit');
  assert.equal(result.direct_https_response_observed,false);
  assert.equal(result.source_record_truth_independently_verified,false);
  assert.equal(result.counts.accepted,1);
  assert.match(result.raw_response_sha256,/^[a-f0-9]{64}$/);
  assert.equal(result.parcel_references[0].record_class,'property_reference_only_not_estate_lead');
  assert.equal(JSON.stringify(result).includes('DO NOT EXPORT'),false);
});
test('rejects HTTP errors and untrusted content types',async()=>{
  await assert.rejects(probeOfficialGIS({fetchImpl:async()=>new Response('no',{status:403})}),/source_http_not_ok/);
  await assert.rejects(probeOfficialGIS({fetchImpl:async()=>new Response('{}',{headers:{'content-type':'text/html'}})}),/source_not_json/);
});
test('rejects HTML disguised as JSON and ArcGIS server-side errors',async()=>{
  await assert.rejects(probeOfficialGIS({fetchImpl:async()=>new Response('<html>blocked</html>',{headers:{'content-type':'application/json'}})}),/invalid_arcgis_json/);
  await assert.rejects(probeOfficialGIS({fetchImpl:async()=>new Response('{"error":{"code":498}}',{headers:{'content-type':'application/json'}})}),/arcgis_error_response/);
});
test('rejects redirects or origin mismatches when response.url is set',async()=>{
  await assert.rejects(probeOfficialGIS({fetchImpl:async()=>({ok:true,status:200,url:'https://malicious.example/',headers:new Headers({'content-type':'application/json'})})}),/source_redirect_or_origin_mismatch/);
});
test('rejects oversized payload by header or stream',async()=>{
  await assert.rejects(probeOfficialGIS({fetchImpl:async()=>new Response('{}',{headers:{'content-type':'application/json','content-length':'900000'}})}),/source_payload_too_large/);
  await assert.rejects(probeOfficialGIS({fetchImpl:async()=>new Response(' '.repeat(600000),{headers:{'content-type':'application/json'}})}),/source_payload_too_large/);
});
test('rejects empty public feature results instead of claiming a lead',async()=>{
  await assert.rejects(probeOfficialGIS({fetchImpl:async()=>new Response('{"features":[]}',{headers:{'content-type':'application/json'}})}),/no_parcel_rows_in_response/);
});
test('CLI requires explicit opt-in flag and a private report path',async()=>{
  await assert.rejects(runOfficialGISCli(['--out','/tmp/ignore.json'],{fetchImpl:async()=>good()}),/explicit_public_readonly_flag_required/);
  await assert.rejects(runOfficialGISCli(['--public-readonly'],{fetchImpl:async()=>good()}),/private_output_path_required/);
});
test('CLI produces private, creation-only redacted receipt without promoting test responses',async()=>{
  const temp=await mkdtemp(join(tmpdir(),'neo-official-gis-004-'));
  const output=join(temp,'receipt.json');
  const args=['--public-readonly','--out',output];
  const res=await runOfficialGISCli(args,{fetchImpl:async()=>good()});
  assert.equal(res.accepted,1);
  assert.equal(res.direct_https_response_observed,false);
  const receipt=JSON.parse(await readFile(output,'utf8'));
  assert.equal(receipt.verified_estate_leads,0);
  assert.equal(receipt.counts.accepted,1);
  assert.equal(JSON.stringify(receipt).includes('DO NOT EXPORT'),false);
  await assert.rejects(runOfficialGISCli(args,{fetchImpl:async()=>good()}),/EEXIST/);
});
