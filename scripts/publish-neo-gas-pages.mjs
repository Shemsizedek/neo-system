import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const sourceDir = join(root, 'data', 'neo-gas');
const targetDir = join(root, 'dist', 'api', 'neo-gas');

const status = JSON.parse(await readFile(join(sourceDir, 'status.json'), 'utf8'));
const schema = JSON.parse(await readFile(join(sourceDir, 'schema.json'), 'utf8'));

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

await mkdir(targetDir, { recursive: true });
await cp(join(sourceDir, 'status.json'), join(targetDir, 'status.json'));
await cp(join(sourceDir, 'schema.json'), join(targetDir, 'schema.json'));

const build = {
  system: 'NEO-GAS',
  apiVersion: 'v1',
  statusVersion: status.version,
  commit: process.env.GITHUB_SHA ?? 'local',
  generatedAt: new Date().toISOString(),
  source: 'GitHub Actions',
  backend: 'GitHub repository',
  frontend: 'GitHub Pages'
};
await writeFile(join(targetDir, 'build.json'), `${JSON.stringify(build, null, 2)}\n`);
console.log(`Published NEO-GAS ${status.version} API snapshot to dist/api/neo-gas`);
