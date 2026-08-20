import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../..');

export function listProjects() {
  const file = path.join(root, 'config', 'projects.json');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function getProject(id) {
  return listProjects().find((project) => project.id === id) ?? null;
}
