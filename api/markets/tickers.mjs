import { createTickerService } from '../../server/markets/ticker-service.mjs';

const service = createTickerService();

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('Cache-Control', 'public, max-age=10, stale-while-revalidate=20');
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET,OPTIONS');
    return res.status(405).json({ error: 'read_only_endpoint' });
  }

  try {
    const market = String(req.query?.market || 'fx').toLowerCase();
    const payload = await service.tickers({ market });
    return res.status(200).json(payload);
  } catch (error) {
    const message = error?.message || 'unknown error';
    const status = error instanceof RangeError ? 400 : 502;
    return res.status(status).json({ error: status === 400 ? 'invalid_market' : 'market_upstream_failure', message });
  }
}
