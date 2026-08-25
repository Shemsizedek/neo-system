import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const registryPath = path.join(root, 'apps/noogle/index/sources.json');
const outDir = path.join(root, 'apps/noogle/index/generated');
const outPath = path.join(outDir, 'source-health.json');

const registry = JSON.parse(await fs.readFile(registryPath, 'utf8'));
const now = new Date().toISOString();
const seen = new Map();
const sources = [];

for (const source of registry.sources.filter(s => s.enabled)) {
  const canonical = new URL(source.url).toString();
  const key = crypto.createHash('sha256').update(canonical).digest('hex');
  const duplicateOf = seen.get(key) || null;
  if (!duplicateOf) seen.set(key, source.id);

  let status = 'unchecked';
  let httpStatus = null;
  let error = null;
  try {
    const response = await fetch(canonical, { method: 'HEAD', redirect: 'follow', headers: { 'user-agent': 'NoogleBot/1.0 (+https://shemsizedek.github.io/neo-system/noogle/)' } });
    httpStatus = response.status;
    status = response.ok ? 'reachable' : 'http-error';
  } catch (e) {
    status = 'network-error';
    error = String(e?.message || e);
  }

  sources.push({ id: source.id, name: source.name, url: canonical, duplicateOf, status, httpStatus, checkedAt: now, error });
}

await fs.mkdir(outDir, { recursive: true });
await fs.writeFile(outPath, JSON.stringify({ generatedAt: now, total: sources.length, sources }, null, 2) + '\n');
console.log(`Noogle source health written: ${outPath}`);
