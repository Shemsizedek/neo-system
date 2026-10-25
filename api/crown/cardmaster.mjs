import {createTickerService} from '../../server/markets/ticker-service.mjs';
import {CARDMASTER_SEEDS, createCardmasterCollection, renderCardmasterSvg} from '../../server/crown-metadata/cardmaster-gallery.mjs';

function headers(res, isSvg) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', isSvg ? 'public, max-age=600' : 'public, max-age=15, stale-while-revalidate=15');
  if (isSvg) res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'none'; style-src 'none'; sandbox");
}

// Read-only Vercel/Node API; market data is source-attributed and fails closed.
export function createCardmasterHandler({tickerService = createTickerService(), now = () => new Date()} = {}) {
  return async function cardmasterHandler(req, res) {
    const format = String(req.query?.format || 'json');
    headers(res, format === 'svg');
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET,OPTIONS');
      return res.status(405).json({error: 'read_only_endpoint'});
    }
    if (!['json', 'svg'].includes(format)) return res.status(400).json({error: 'unsupported_format'});
    if (format === 'svg') {
      const cardId = String(req.query?.card_id || '');
      const face = String(req.query?.face || 'front');
      if (!CARDMASTER_SEEDS.some(card => card.card_id === cardId)) return res.status(404).json({error: 'card_not_found'});
      if (!['front', 'back'].includes(face)) return res.status(400).json({error: 'unsupported_face'});
      const collection = createCardmasterCollection({now: now()});
      const record = collection.cards.find(card => card.card_id === cardId);
      res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
      return res.status(200).send(renderCardmasterSvg(record, {face}));
    }
    let tickerPacket = null;
    // Failure of the upstream price feed must not imply a verified quote.
    try { tickerPacket = await tickerService.fx(); } catch {}
    try {
      return res.status(200).json(createCardmasterCollection({tickerPacket, now: now()}));
    } catch {
      return res.status(503).json({error: 'cardmaster_unavailable'});
    }
  };
}
export default createCardmasterHandler();
