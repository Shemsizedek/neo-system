import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { HCAD_GIS_LAYER, validateOfficialLayerUrl, classifyOfficialGISFeatures,
  preparePrivateGISSnapshot, runPrivateGISSnapshotCli } from './estate-arcgis-snapshot.mjs';
const A=(acct_num,tax_year='2026',extra={})=>({attributes:{acct_num,tax_year,state_class:'A1',
  total_market_val:230000,owner_name_1:'PRIVATE OWNER',mail_addr_1:'PRIVATE MAILING',...extra}});
const fixture=async document=>{
  const dir=await mkdtemp(join(tmpdir(),'neo-gis003-'));
  const input=join(dir,'capture.json');
  await writeFile(input,JSON.stringify(document));
  return {input,output:join(dir,'output.json')};
};
test('accepts only official county GIS layer and read-only query URLs',()=>{
  assert.equal(validateOfficialLayerUrl(HCAD_GIS_LAYER),HCAD_GIS_LAYER);
  assert.equal(validateOfficialLayerUrl(HCAD_GIS_LAYER+'/query?f=json'),HCAD_GIS_LAYER+'/query');
  assert.throws(()=>validateOfficialLayerUrl('https://example.com/arcgis'),/source_not_allowlisted/);
  assert.throws(()=>validateOfficialLayerUrl('http://www.gis.hctx.net/arcgishcpid/rest/services/HCAD/Parcels/FeatureServer/0'),/source_not_allowlisted/);
});
test('only a parcel reference emerges; private owner and contact fields dropped',()=>{
  const x=classifyOfficialGISFeatures({features:[A('0000001234567')]});
  assert.equal(x.rows.length,1);
  assert.equal(x.rows[0].parcel_id,'0000001234567');
  assert.equal(x.rows[0].gis_market_value_usd,230000);
  assert.equal(x.rows[0].heirs_status,'unknown');
  assert.equal(x.rows[0].probate_case_verified,false);
  assert.equal(x.rows[0].production_import_permitted,false);
  assert.equal(JSON.stringify(x).includes('PRIVATE OWNER'),false);
  assert.equal(JSON.stringify(x).includes('PRIVATE MAILING'),false);
});
test('duplicate parcels and wrong tax year never turn into new records',()=>{
  const x=classifyOfficialGISFeatures({features:[A('0000001234567'),A('0000001234567'),A('0000001234568','2025')]});
  assert.equal(x.rows.length,1);
  assert.equal(x.counts.duplicate,1); assert.equal(x.counts.wrong_tax_year,1);
});
test('confidential and invalid records excluded',()=>{
  const x=classifyOfficialGISFeatures({features:[A('0000001234567','2026',{confidential_flag:'Y'}),
    A('BAD', '2026'), {attributes:null}]});
  assert.equal(x.rows.length,0);
  assert.equal(x.counts.confidential_skipped,1);assert.equal(x.counts.invalid_account,1);
  assert.equal(x.counts.invalid_fields,1);
});
test('malformed, error and missing features fail without inventing evidence',()=>{
  assert.throws(()=>classifyOfficialGISFeatures({error:{code:500}}),/arcgis_error_response/);
  assert.throws(()=>classifyOfficialGISFeatures({}),/arcgis_features_missing/);
  assert.throws(()=>classifyOfficialGISFeatures({features:[]},{maxRecords:101}),/invalid_max_records/);
});
test('snapshot stays unverified even if its claimed URL is an official GIS layer',async()=>{
  const f=await fixture({features:[A('0000001234567'),A('0000001234568')]});
  const r=await preparePrivateGISSnapshot({path:f.input,sourceUrl:HCAD_GIS_LAYER+'/query?f=json'});
  assert.equal(r.counts.accepted,2);
  assert.equal(r.source_authenticity_verified,false);
  assert.equal(r.hcad_2026_cama_archive_imported,false);
  assert.equal(r.official_probate_case_data_imported,false);
  assert.equal(r.verified_estate_opportunities,0);
  assert.equal(r.revenue_received_usd,0);
  assert.match(r.supplied_snapshot_sha256,/^[a-f0-9]{64}$/);
});
test('private CLI writes creation-only report and refuses duplicate writes',async()=>{
  const f=await fixture({features:[A('0000001234567')]});
  const summary=await runPrivateGISSnapshotCli(['--input',f.input,'--source',HCAD_GIS_LAYER,'--out',f.output]);
  assert.equal(summary.accepted,1);
  const stored=JSON.parse(await readFile(f.output,'utf8'));
  assert.equal(stored.parcel_references.length,1);
  assert.equal(JSON.stringify(stored).includes('PRIVATE OWNER'),false);
  await assert.rejects(runPrivateGISSnapshotCli(['--input',f.input,'--source',HCAD_GIS_LAYER,'--out',f.output]),/EEXIST/);
});
test('refuses oversized, wrong-year and unsupported source captures',async()=>{
  const f=await fixture({features:[A('0000001234567')]});
  await assert.rejects(preparePrivateGISSnapshot({path:f.input,sourceUrl:'https://example.org/'}),/source_not_allowlisted/);
  assert.equal(classifyOfficialGISFeatures({features:[A('0000001234567','2025')]}).rows.length,0);
});
