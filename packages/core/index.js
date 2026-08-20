import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../..');

export function loadSystem() {
  const file = path.join(root, 'config', 'system.json');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function originBanner() {
  const system = loadSystem();
  return `${system.system} — ${system.codename} v${system.version}`;
}
