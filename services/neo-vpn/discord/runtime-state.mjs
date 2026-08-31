import fs from 'node:fs/promises';
import path from 'node:path';

const defaultStateFile = '/var/lib/neo-vpn/discord-state.json';

export function stateFile(env = process.env) {
  return env.NEO_VPN_RUNTIME_STATE_FILE?.trim() || defaultStateFile;
}

export async function writeRuntimeState(update, env = process.env) {
  const file = stateFile(env);
  await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  let current = {};
  try {
    current = JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  const next = {
    ...current,
    ...update,
    updatedAt: new Date().toISOString()
  };

  const temp = `${file}.tmp`;
  await fs.writeFile(temp, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });
  await fs.rename(temp, file);
  return next;
}

export async function readRuntimeState(env = process.env) {
  try {
    return JSON.parse(await fs.readFile(stateFile(env), 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return { status: 'starting' };
    throw error;
  }
}
