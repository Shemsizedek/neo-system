import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateHcadHeader, inspectHcadLocalFile } from './estate-source-preflight.mjs';
import { runHcadPreflightCli } from '../../scripts/neo-estate-source-preflight.mjs';

const header='acct\tyr\tmailto\tsite_addr_1\tstate_class\ttot_appr_val\ttot_mkt_val\tmail_addr_1';
const sample=`${header}\n000010001\t2026\tPRIVATE OWNER\t100 EXAMPLE WAY\tA1\t200000\t250000\tPRIVATE MAIL\n000010002\t2026\tPRIVATE OWNER2\t200 EXAMPLE ST\tB1\t330000\t400000\tPRIVATE MAIL2\n`;
async function fixture(content=sample) {
 const dir=await mkdtemp(join(tmpdir(),'neo-hcad-002-'));
 const path=join(dir,'real_acct.txt');
 await writeFile(path,content);
 return path;
}

test('HCAD codebook columns recognized with optional fields',()=>{
 const v=validateHcadHeader(header);
 assert.equal(v.columns,8);
 assert.equal(v.optionalColumnCount,2);
});
test('market value missing is not inferred from appraisal',()=>{
 assert.throws(()=>validateHcadHeader(header.replace('tot_mkt_val\t','')),/hcad_required_fields_missing_tot_mkt_val/);
});
test('CSV is not a HCAD tab-delimited real_acct file',()=>{
 assert.throws(()=>validateHcadHeader('acct,yr,site_addr_1,state_class,tot_appr_val,tot_mkt_val'),/hcad_required_fields_missing/);
});
test('duplicate and empty headers fail closed',()=>{
 assert.throws(()=>validateHcadHeader(`${header}\tacct`),/duplicate_header_fields/);
 assert.throws(()=>validateHcadHeader(`${header}\t`),/empty_header_field/);
});
test('preflight detects structure but does not expose personal data or certify authenticity',async()=>{
 const p=await fixture();
 const r=await inspectHcadLocalFile({path:p,observedAt:'2026-11-15T16:00:00Z'});
 assert.equal(r.sample.rows_sampled,2);
 assert.equal(r.sample.market_values_present,2);
 assert.equal(r.sample.appraisal_values_present,2);
 assert.equal(r.source_authenticity_verified,false);
 assert.equal(r.live_estate_opportunities_verified,0);
 assert.equal(r.production_import_permitted,false);
 assert.match(r.source_sha256,/^[a-f0-9]{64}$/);
 assert.equal(JSON.stringify(r).includes('PRIVATE OWNER'),false);
 assert.equal(JSON.stringify(r).includes('100 EXAMPLE WAY'),false);
});
test('wrong tax year fails closed',async()=>{
 const p=await fixture(sample.replace('\t2026\t','\t2025\t'));
 await assert.rejects(inspectHcadLocalFile({path:p}),/source_year_mismatch/);
});
test('missing account fails closed',async()=>{
 const p=await fixture(sample.replace('000010002',''));
 await assert.rejects(inspectHcadLocalFile({path:p}),/missing_accounts/);
});
test('empty and overlong sample selections rejected',async()=>{
 const p=await fixture(header+'\n');
 await assert.rejects(inspectHcadLocalFile({path:p}),/no_property_records/);
 await assert.rejects(inspectHcadLocalFile({path:p,sampleLimit:1001}),/invalid_sample_limit/);
});
test('CLI writes once, privately, without owner details or production claims',async()=>{
 const p=await fixture(),out=p+'.report.json';
 const s=await runHcadPreflightCli(['--hcad',p,'--out',out]);
 assert.equal(s.sampled,2);
 assert.equal(s.production_import_permitted,false);
 const saved=JSON.parse(await readFile(out,'utf8'));
 assert.equal(saved.source_authenticity_verified,false);
 assert.equal(JSON.stringify(saved).includes('PRIVATE OWNER'),false);
 await assert.rejects(runHcadPreflightCli(['--hcad',p,'--out',out]),/EEXIST/);
});
