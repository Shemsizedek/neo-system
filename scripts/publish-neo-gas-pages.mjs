import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const sourceDir = join(root, 'data', 'neo-gas');
const targetDir = join(root, 'dist', 'api', 'neo-gas');

const readJson = async path => JSON.parse(await readFile(path, 'utf8'));
const status = await readJson(join(sourceDir, 'status.json'));
const schema = await readJson(join(sourceDir, 'schema.json'));
const recordSchema = await readJson(join(sourceDir, 'record-schema.json'));

const required = schema.required ?? [];
for (const key of required) {
  if (!(key in status)) throw new Error(`NEO-GAS status missing required field: ${key}`);
}
if (status.system !== 'NEO-GAS') throw new Error('NEO-GAS status.system must equal NEO-GAS');
if (!Number.isInteger(status.overallReadiness) || status.overallReadiness < 0 || status.overallReadiness > 100) {
  throw new Error('NEO-GAS overallReadiness must be an integer from 0 through 100');
}
if (!/^\d+\.\d+\.\d+$/.test(status.version)) throw new Error('NEO-GAS version must use semantic versioning');
if (Number.isNaN(Date.parse(status.updatedAt))) throw new Error('NEO-GAS updatedAt must be a valid date-time');
if (!Array.isArray(status.alerts) || !Array.isArray(status.intelligenceRequirements) || !Array.isArray(status.guardrails)) {
  throw new Error('NEO-GAS list fields must be arrays');
}
for (const alert of status.alerts) {
  for (const key of ['id', 'severity', 'domain', 'title', 'summary']) {
    if (!alert?.[key]) throw new Error(`NEO-GAS alert missing ${key}`);
  }
  if (!['GREEN', 'AMBER', 'RED'].includes(alert.severity)) throw new Error(`Unsupported NEO-GAS alert severity: ${alert.severity}`);
}

const recordTypes = {
  assessments: 'assessment',
  alerts: 'alert',
  indicators: 'indicator'
};
const allowedStatus = new Set(['DRAFT', 'ACTIVE', 'MONITORING', 'RESOLVED', 'ARCHIVED']);
const allowedConfidence = new Set(['LOW', 'MODERATE', 'HIGH']);
const allowedSeverity = new Set(['GREEN', 'AMBER', 'RED']);
const allowedGuardrails = new Set(['DEFENSIVE', 'RESILIENCE', 'HUMANITARIAN', 'GOVERNANCE']);
const requiredRecordFields = recordSchema.required ?? [];

async function loadRecords(directory, expectedType) {
  const dir = join(sourceDir, directory);
  const names = (await readdir(dir)).filter(name => name.endsWith('.json')).sort();
  const records = [];
  const ids = new Set();
  for (const name of names) {
    const record = await readJson(join(dir, name));
    for (const key of requiredRecordFields) {
      if (!(key in record)) throw new Error(`${directory}/${name} missing required field: ${key}`);
    }
    if (record.recordType !== expectedType) throw new Error(`${directory}/${name} has invalid recordType`);
    if (ids.has(record.id)) throw new Error(`Duplicate NEO-GAS record id in ${directory}: ${record.id}`);
    ids.add(record.id);
    if (!allowedStatus.has(record.status)) throw new Error(`${record.id} has unsupported status: ${record.status}`);
    if (!allowedConfidence.has(record.confidence)) throw new Error(`${record.id} has unsupported confidence: ${record.confidence}`);
    if (!allowedGuardrails.has(record.guardrailClass)) throw new Error(`${record.id} has unsupported guardrailClass: ${record.guardrailClass}`);
    if (record.severity && !allowedSeverity.has(record.severity)) throw new Error(`${record.id} has unsupported severity: ${record.severity}`);
    if (Number.isNaN(Date.parse(record.createdAt)) || Number.isNaN(Date.parse(record.updatedAt))) throw new Error(`${record.id} has invalid timestamps`);
    if (!Array.isArray(record.provenance?.sourceRefs)) throw new Error(`${record.id} provenance.sourceRefs must be an array`);
    records.push(record);
  }
  return records;
}

const recordSets = {};
for (const [directory, type] of Object.entries(recordTypes)) {
  recordSets[directory] = await loadRecords(directory, type);
}

const allRecords = Object.values(recordSets).flat();
const globalIds = new Set();
for (const record of allRecords) {
  if (globalIds.has(record.id)) throw new Error(`Duplicate NEO-GAS record id across corpus: ${record.id}`);
  globalIds.add(record.id);
}

await mkdir(targetDir, { recursive: true });
await cp(join(sourceDir, 'status.json'), join(targetDir, 'status.json'));
await cp(join(sourceDir, 'schema.json'), join(targetDir, 'schema.json'));
await cp(join(sourceDir, 'record-schema.json'), join(targetDir, 'record-schema.json'));

for (const [directory, records] of Object.entries(recordSets)) {
  const publishedDir = join(targetDir, directory);
  await mkdir(publishedDir, { recursive: true });
  for (const record of records) {
    await writeFile(join(publishedDir, `${record.id}.json`), `${JSON.stringify(record, null, 2)}\n`);
  }
  await writeFile(join(publishedDir, 'index.json'), `${JSON.stringify({
    system: 'NEO-GAS',
    recordType: recordTypes[directory],
    count: records.length,
    records: records.map(({ id, title, status, domain, severity, confidence, updatedAt, summary }) => ({ id, title, status, domain, severity, confidence, updatedAt, summary }))
  }, null, 2)}\n`);
}

const feed = {
  system: 'NEO-GAS',
  apiVersion: 'v1',
  statusVersion: status.version,
  generatedAt: new Date().toISOString(),
  counts: {
    assessments: recordSets.assessments.length,
    alerts: recordSets.alerts.length,
    indicators: recordSets.indicators.length,
    total: allRecords.length
  },
  assessments: recordSets.assessments,
  alerts: recordSets.alerts,
  indicators: recordSets.indicators
};
await writeFile(join(targetDir, 'feed.json'), `${JSON.stringify(feed, null, 2)}\n`);

const build = {
  system: 'NEO-GAS',
  apiVersion: 'v1',
  statusVersion: status.version,
  recordCount: allRecords.length,
  commit: process.env.GITHUB_SHA ?? 'local',
  generatedAt: new Date().toISOString(),
  source: 'GitHub Actions',
  backend: 'GitHub repository',
  frontend: 'GitHub Pages'
};
await writeFile(join(targetDir, 'build.json'), `${JSON.stringify(build, null, 2)}\n`);
console.log(`Published NEO-GAS ${status.version} API snapshot with ${allRecords.length} intelligence records to dist/api/neo-gas`);
