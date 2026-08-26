import fs from 'node:fs/promises';
import path from 'node:path';

const storageMode = (process.env.NEO_ROUTER_STORAGE || 'github').toLowerCase();
const statePath = process.env.NEO_ROUTER_STATE_PATH || 'data/router/state.json';

async function ensureDir(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function writeJson(filePath, value) {
  await ensureDir(filePath);
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function loadGithubState() {
  return readJson(statePath, {
    version: 1,
    storage: 'github',
    missions: [],
    updatedAt: null,
  });
}

async function saveGithubState(state) {
  await writeJson(statePath, {
    ...state,
    version: 1,
    storage: 'github',
    updatedAt: new Date().toISOString(),
  });
}

async function runGithubWorker() {
  const state = await loadGithubState();
  const missions = Array.isArray(state.missions) ? state.missions : [];

  const nextState = {
    ...state,
    missions,
    lastRun: {
      at: new Date().toISOString(),
      status: 'healthy',
      processed: 0,
      queued: missions.length,
      backend: 'github-actions',
      frontend: 'github-pages',
    },
  };

  await saveGithubState(nextState);
  console.log(JSON.stringify({
    ok: true,
    service: 'neo-router-worker-v4',
    storage: 'github',
    statePath,
    queued: missions.length,
  }));
}

async function runRedisWorker() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  const key = process.env.NEO_ROUTER_STATE_KEY;

  if (!url || !token || !key) {
    console.warn('Redis configuration is incomplete; falling back to GitHub-native storage.');
    return runGithubWorker();
  }

  const response = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Redis read failed: ${response.status}`);

  const payload = await response.json();
  let state = { version: 1, missions: [] };
  if (payload?.result) {
    try { state = JSON.parse(payload.result); } catch {}
  }

  state.lastRun = {
    at: new Date().toISOString(),
    status: 'healthy',
    processed: 0,
    queued: Array.isArray(state.missions) ? state.missions.length : 0,
    backend: 'github-actions',
    storage: 'redis-failover',
  };

  const save = await fetch(`${url}/set/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(state),
  });
  if (!save.ok) throw new Error(`Redis write failed: ${save.status}`);

  console.log(JSON.stringify({ ok: true, service: 'neo-router-worker-v4', storage: 'redis-failover' }));
}

if (storageMode === 'redis') {
  await runRedisWorker();
} else {
  await runGithubWorker();
}
