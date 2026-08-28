import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = path.join(repoRoot, 'dist');
const manifestPath = path.join(repoRoot, 'config', 'pages-routes.json');
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));

const failures = [];

async function exists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

function routeToFile(route) {
  if (route === '/') return path.join(distRoot, 'index.html');
  const clean = route.replace(/^\/+|\/+$/g, '');
  return path.join(distRoot, clean, 'index.html');
}

for (const route of manifest.requiredRoutes || []) {
  const target = routeToFile(route);
  if (!(await exists(target))) failures.push(`Missing route ${route} -> ${path.relative(repoRoot, target)}`);
}

for (const file of manifest.requiredFiles || []) {
  const target = path.join(distRoot, file.replace(/^\//, ''));
  if (!(await exists(target))) failures.push(`Missing file ${file}`);
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else files.push(full);
  }
  return files;
}

function stripQueryAndHash(value) {
  return value.split('#', 1)[0].split('?', 1)[0];
}

function isExternal(value) {
  return !value || value.startsWith('#') || /^(?:https?:|mailto:|tel:|data:|javascript:|blob:|\/\/)/i.test(value);
}

function resolveLocalReference(htmlFile, rawValue) {
  const clean = stripQueryAndHash(rawValue.trim());
  if (!clean || isExternal(clean)) return null;

  let candidate;
  if (clean.startsWith('/')) {
    let rooted = clean;
    const base = manifest.basePath || '';
    if (base && rooted === base) rooted = '/';
    else if (base && rooted.startsWith(`${base}/`)) rooted = rooted.slice(base.length);
    candidate = path.join(distRoot, rooted.replace(/^\//, ''));
  } else {
    candidate = path.resolve(path.dirname(htmlFile), clean);
  }

  if (!candidate.startsWith(distRoot)) return null;
  return candidate;
}

async function referenceExists(candidate) {
  if (await exists(candidate)) {
    const stat = await fs.stat(candidate);
    if (stat.isDirectory()) return exists(path.join(candidate, 'index.html'));
    return true;
  }
  if (!path.extname(candidate)) return exists(path.join(candidate, 'index.html'));
  return false;
}

const allFiles = await walk(distRoot);
const htmlFiles = allFiles.filter((file) => file.endsWith('.html'));
const attrPattern = /\b(?:href|src|action)\s*=\s*["']([^"']+)["']/gi;

for (const htmlFile of htmlFiles) {
  const html = await fs.readFile(htmlFile, 'utf8');
  for (const match of html.matchAll(attrPattern)) {
    const raw = match[1];
    const candidate = resolveLocalReference(htmlFile, raw);
    if (!candidate) continue;
    if (!(await referenceExists(candidate))) {
      failures.push(`Broken local reference in ${path.relative(distRoot, htmlFile)}: ${raw}`);
    }
  }
}

if (await exists(path.join(distRoot, 'neo-government')) || await exists(path.join(distRoot, 'government-workspace'))) {
  failures.push('Private government workspace leaked into public Pages artifact');
}

if (failures.length) {
  console.error(`GitHub Pages static integrity FAILED (${failures.length} issue${failures.length === 1 ? '' : 's'}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`GitHub Pages static integrity OK: ${manifest.requiredRoutes.length} required routes, ${manifest.requiredFiles.length} required files, ${htmlFiles.length} HTML pages checked.`);
