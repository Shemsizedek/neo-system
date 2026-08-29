import { mkdir, readFile, writeFile } from 'node:fs/promises';

const source = new URL('../data/neo-counter/runtime.json', import.meta.url);
const outDir = new URL('../dist/api/neo-counter/', import.meta.url);

await mkdir(outDir, { recursive: true });
const runtime = JSON.parse(await readFile(source, 'utf8'));
const generatedAt = new Date().toISOString();
const commit = process.env.GITHUB_SHA || 'local';

await writeFile(new URL('runtime.json', outDir), JSON.stringify({ ...runtime, generatedAt, commit }, null, 2) + '\n');
await writeFile(new URL('build.json', outDir), JSON.stringify({
  service: 'neo-counter',
  source: 'GitHub Actions',
  backend: 'GitHub repository snapshots',
  frontend: 'GitHub Pages',
  commit,
  generatedAt,
  writable: false,
  localFirst: true
}, null, 2) + '\n');

console.log(`NEO Counter GitHub backend snapshot built for ${commit}`);
