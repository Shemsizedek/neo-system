import { spawn } from 'node:child_process';
import process from 'node:process';

const port = 18080;
const env = {
  ...process.env,
  PORT: String(port),
  NODE_ENV: 'test',
  TERABOX_API_BASE: 'https://example.invalid/',
  TERABOX_AUTHORIZE_URL: 'https://example.invalid/oauth/authorize',
  TERABOX_TOKEN_URL: 'https://example.invalid/oauth/token',
  TERABOX_CLIENT_ID: 'test-client',
  TERABOX_CLIENT_SECRET: 'test-secret',
  TERABOX_REDIRECT_URI: `http://127.0.0.1:${port}/v1/terabox/callback`,
  NEO_INTERNAL_API_KEY: 'test-neo-key',
  NEO_APPROVAL_TOKEN: 'test-approval'
};

const child = spawn(process.execPath, ['src/index.js'], {
  cwd: new URL('..', import.meta.url),
  env,
  stdio: ['ignore', 'pipe', 'pipe']
});

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

try {
  let response;
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      response = await fetch(`http://127.0.0.1:${port}/health`);
      if (response.ok) break;
    } catch {}
    await wait(100);
  }
  if (!response?.ok) throw new Error('health probe failed');
  const body = await response.json();
  if (body.service !== 'neo-terabox-bridge' || body.ok !== true) throw new Error(`unexpected health payload: ${JSON.stringify(body)}`);

  const ready = await fetch(`http://127.0.0.1:${port}/ready`);
  if (ready.status !== 200) throw new Error(`expected ready=200; got ${ready.status}`);

  const unauthorized = await fetch(`http://127.0.0.1:${port}/v1/terabox/connect`);
  if (unauthorized.status !== 401) throw new Error(`expected 401; got ${unauthorized.status}`);

  console.log('neo-terabox-bridge smoke: PASS');
} finally {
  child.kill('SIGTERM');
}
