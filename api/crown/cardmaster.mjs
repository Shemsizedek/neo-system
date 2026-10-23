import {createTickerService} from '../../server/markets/ticker-service.mjs';
import {CARDMASTER_SEEDS, createCardmasterCollection, renderCardmasterSvg} from '../../server/crown-metadata/cardmaster-gallery.mjs';

const TRUSTED_WEB_ORIGINS=new Set([
  'https://neo-crown-cardmaster-runtime.onrender.com',
  'https://neo-crown-cardmaster-staging.onrender.com'
]);
const CACHE_MS=15000;
function headers(req,res,isSvg) {
  const origin=String(req.headers?.origin||'');
  if(TRUSTED_WEB_ORIGINS.has(origin)) res.setHeader('Access-Control-Allow-Origin',origin);
  res.setHeader('Vary','Origin');
  res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','content-type');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Cache-Control',isSvg?'public, max-age=600':'public, max-age=15');
  res.setHeader('Content-Security-Policy',isSvg?"default-src 'none'; sandbox":"default-src 'none'");
}
export function createCardmasterHandler({tickerService=createTickerService(),now=()=>new Date()}={}) {
  let cached=null;
  let pending=null;
  async function collection() {
    const timestamp=now();
    const nowMs=new Date(timestamp).getTime();
    if(cached && Number.isFinite(nowMs) && nowMs-cached.at >= 0 && nowMs-cached.at<CACHE_MS) return cached.payload;
    if(pending)return pending;
    pending=(async()=>{
      let tickerPacket=null;
      try {tickerPacket=await tickerService.fx();}catch{}
      const payload=createCardmasterCollection({tickerPacket,now:now()});
      cached={at:new Date(payload.generated_at).getTime(),payload};
      return payload;
    })();
    try{return await pending;}finally{pending=null;}
  }
  return async function cardmasterHandler(req,res) {
    const format=String(req.query?.format||'json');
    headers(req,res,format==='svg');
    if(req.method==='OPTIONS')return res.status(204).end();
    if(req.method!=='GET'){
      res.setHeader('Allow','GET,OPTIONS');
      return res.status(405).json({error:'read_only_endpoint'});
    }
    if(!['json','svg'].includes(format))return res.status(400).json({error:'unsupported_format'});
    if(format==='svg'){
      const cardId=String(req.query?.card_id||'');
      const face=String(req.query?.face||'front');
      if(!CARDMASTER_SEEDS.some(card=>card.card_id===cardId))return res.status(404).json({error:'card_not_found'});
      if(!['front','back'].includes(face))return res.status(400).json({error:'unsupported_face'});
      const record=createCardmasterCollection({now:now()}).cards.find(card=>card.card_id===cardId);
      res.setHeader('Content-Type','image/svg+xml; charset=utf-8');
      return res.status(200).send(renderCardmasterSvg(record,{face}));
    }
    try{return res.status(200).json(await collection());}
    catch{return res.status(503).json({error:'cardmaster_unavailable'});}
  };
}
export default createCardmasterHandler();
