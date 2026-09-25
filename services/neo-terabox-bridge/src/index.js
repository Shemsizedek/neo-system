import crypto from 'node:crypto';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { loadConfig } from './config/index.js';
import { logger } from './utils/logger.js';
import { requireInternal, productionWriteGate } from './security.js';

const config = await loadConfig();
const app = express();
const sessions = new Map();
const random = () => crypto.randomBytes(32).toString('base64url');

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: false }));
app.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false }));
app.use(express.json({ limit: '1mb' }));
app.use((req, _res, next) => { logger.info('request', { method: req.method, path: req.path }); next(); });

const teraboxConfigured = () => ['TERABOX_API_BASE','TERABOX_AUTHORIZE_URL','TERABOX_TOKEN_URL','TERABOX_CLIENT_ID','TERABOX_CLIENT_SECRET','TERABOX_REDIRECT_URI'].every((k) => !!config[k]);

app.get('/health', (_req, res) => res.json({ ok: true, service: 'neo-terabox-bridge', version: '1.1.0', mode: config.env, time: new Date().toISOString() }));
app.get('/ready', (_req, res) => {
  const ready = teraboxConfigured() && !!config.NEO_INTERNAL_API_KEY;
  res.status(ready ? 200 : 503).json({ ready, teraboxConfigured: teraboxConfigured(), neoConfigured: !!config.NEO_INTERNAL_API_KEY });
});

app.get('/v1/terabox/connect', requireInternal(config), (req, res) => {
  const state = random();
  sessions.set(state, { createdAt: Date.now() });
  const auth = new URL(config.TERABOX_AUTHORIZE_URL);
  auth.searchParams.set('response_type', 'code');
  auth.searchParams.set('client_id', config.TERABOX_CLIENT_ID);
  auth.searchParams.set('redirect_uri', config.TERABOX_REDIRECT_URI);
  auth.searchParams.set('state', state);
  if (config.TERABOX_SCOPES) auth.searchParams.set('scope', config.TERABOX_SCOPES);
  res.json({ authorize_url: auth.toString(), state });
});

app.get('/v1/terabox/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const rec = state && sessions.get(state);
    if (!code || !rec || Date.now() - rec.createdAt > 600_000) return res.status(400).json({ error: 'invalid_oauth_callback' });
    sessions.delete(state);
    const body = new URLSearchParams({ grant_type: 'authorization_code', code, client_id: config.TERABOX_CLIENT_ID, client_secret: config.TERABOX_CLIENT_SECRET, redirect_uri: config.TERABOX_REDIRECT_URI });
    const r = await fetch(config.TERABOX_TOKEN_URL, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body, signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error(`terabox_token_exchange_${r.status}`);
    const token = await r.json();
    const sid = random();
    sessions.set(sid, { accessToken: token.access_token, refreshToken: token.refresh_token, expiresAt: token.expires_in ? Date.now() + Number(token.expires_in) * 1000 : null });
    res.json({ ok: true, session_id: sid, expires_in: token.expires_in || null });
  } catch (err) { logger.error('oauth_callback_failed', { message: err.message }); res.status(502).json({ error: 'oauth_exchange_failed' }); }
});

app.get('/v1/terabox/me', async (req, res) => {
  try {
    const session = sessions.get(String(req.headers['x-neo-terabox-session'] || ''));
    if (!session?.accessToken) return res.status(401).json({ error: 'invalid_session' });
    const r = await fetch(new URL('/openapi/uinfo', config.TERABOX_API_BASE), { headers: { authorization: `Bearer ${session.accessToken}`, accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error(`terabox_api_${r.status}`);
    res.json(await r.json());
  } catch (err) { logger.error('terabox_identity_failed', { message: err.message }); res.status(502).json({ error: 'terabox_request_failed' }); }
});

app.post('/v1/bridge/dispatch', requireInternal(config), productionWriteGate(config), async (req, res) => {
  try {
    const targets = { gateway: config.NEO_GATEWAY_URL, router: config.NEO_ROUTER_URL, neosync: config.NEOSYNC_URL, oracle: config.NEO_ORACLE_URL };
    const base = targets[req.body?.target];
    if (!base) return res.status(400).json({ error: 'invalid_target' });
    const payload = { type: req.body?.type || 'terabox.event', source: 'neo-terabox-bridge', occurred_at: new Date().toISOString(), payload: req.body?.payload ?? {} };
    const r = await fetch(base, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${config.NEO_INTERNAL_API_KEY}`, 'x-neo-source': 'neo-terabox-bridge' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(20000) });
    const text = await r.text();
    if (!r.ok) throw new Error(`neo_dispatch_${r.status}`);
    res.json({ ok: true, result: text ? JSON.parse(text) : null });
  } catch (err) { logger.error('dispatch_failed', { message: err.message }); res.status(502).json({ error: 'dispatch_failed' }); }
});

app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
app.listen(config.port, '0.0.0.0', () => logger.info('service_started', { port: config.port, mode: config.env }));
