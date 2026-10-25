import {createHash} from 'node:crypto';
import {buildCardmasterRecord} from './cardmaster.mjs';

const sha256 = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const currentTime = () => new Date().toISOString();
const MAX_MARKET_AGE_MS = 5 * 60 * 1000;

// Historical design briefs supplied by Project 144. Nothing in this registry is
// evidence of issuer control, an offering, performance, market value, or a trade.
export const CARDMASTER_SEEDS = Object.freeze([
  {
    card_id: 'NEO-CARD-000001', title: 'NOMNI MONETARY INDEX', sector: 'Digital / tokenized assets',
    issuer: 'Shelton Estate & Co.', motif: 'octahedron', market_pair: 'NOMNI/USD',
    visual_concept: 'Radiant obsidian and gold octahedron above a dark treasury vault, with a luminous NEO constellation.',
    financial_claims: {target_value: '$144,000,000 index cap target', current_value: '$1.00/token par target', projected_roi: '14.4% yield target', status: 'ACTIVE (submitted claim)'}
  },
  {
    card_id: 'NEO-CARD-000002', title: 'SHELTON ESTATE REAL ESTATE FUND', sector: 'Real estate',
    issuer: 'Shelton Estate & Co.', motif: 'estate', market_pair: null,
    visual_concept: 'Elegant illuminated glass Houston mixed-use tower, warm gold accents, cinematic dusk skyline.',
    financial_claims: {acquisition_value: '$25,000,000', current_value: '$28,500,000', target_value: '$42,000,000', projected_roi: '18.2% projected', status: 'FUNDING (submitted claim)'}
  },
  {
    card_id: 'NEO-CARD-000003', title: 'CROWN CHAIN PRIVATE EQUITY', sector: 'Private capital',
    issuer: 'Shelton Estate & Co.', motif: 'network', market_pair: null,
    visual_concept: 'Futuristic AI server architecture, metallic gold network threads and a hovering holographic crown.',
    financial_claims: {acquisition_value: '$10,000,000', current_value: '$12,500,000', target_value: '$30,000,000', projected_roi: '24.5% projected', status: 'FOR SALE (submitted claim)'}
  }
]);

const SOURCES = [
  [/counterparty/i, 'https://api.counterparty.io:4000/v2/orders'],
  [/coingecko/i, 'https://www.coingecko.com/en/coins/counterparty'],
  [/mempool/i, 'https://mempool.space/']
];

function unavailable(reason = 'No current attributable quote') {
  return {state: 'unavailable', label: 'NO CURRENT ATTRIBUTED MARKET QUOTE', quote: null, reason};
}

// A ticker timestamp denotes retrieval time, NOT the time of the underlying trade/order.
export function attributeTickerMarket(packet, pair, {now = Date.now(), maxAgeMs = MAX_MARKET_AGE_MS} = {}) {
  if (!pair) return unavailable('This card does not have a publicly traded market pair');
  if (!packet || !Array.isArray(packet.quotes)) return unavailable('Market feed unavailable');
  const retrievedAt = Date.parse(packet.generatedAt);
  const nowMs = now instanceof Date ? now.getTime() : Number(now);
  if (!Number.isFinite(retrievedAt) || !Number.isFinite(nowMs)) return unavailable('Feed timestamp missing');
  if (retrievedAt > nowMs + 30000 || nowMs - retrievedAt > maxAgeMs) return unavailable('Market snapshot expired');
  const row = packet.quotes.find(value => value?.pair === pair);
  if (!row || row.status !== 'live') return unavailable('No available attributed market quote');
  const confidence = String(row.confidence || '');
  if (!['reference', 'derived-from-dex', 'two-sided-book', 'one-sided-book'].includes(confidence)) return unavailable('Quote methodology not supported');
  const price = confidence === 'reference' ? row.last : row.mid;
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) return unavailable('Valid positive quote unavailable');
  if (typeof row.source !== 'string' || !row.source.trim()) return unavailable('Quote source unavailable');
  const source = SOURCES.find(([re]) => re.test(row.source));
  if (!source) return unavailable('Quote provider is not yet registered');
  const kind = confidence === 'reference' ? 'reference' : 'derived_indicative';
  return {
    state: 'indicative',
    label: kind === 'reference' ? 'REFERENCE PRICE — NOT A VALUATION' : 'DERIVED ORDER-BOOK INDICATION — NOT A LAST TRADE',
    quote: {
      pair, price: String(price), quote_currency: pair.split('/')[1],
      source_name: row.source.slice(0,160), source_url: source[1],
      retrieved_at: new Date(retrievedAt).toISOString(),
      price_kind: kind, methodology: confidence,
      upstream_observation_time_verified: false,
      trade_execution_verified: false
    },
    backing_verified: false
  };
}

export function createCardmasterCollection({tickerPacket = null, now = currentTime()} = {}) {
  const generatedAt = now instanceof Date ? now.toISOString() : new Date(now).toISOString();
  const cards = CARDMASTER_SEEDS.map(seed => {
    const source = buildCardmasterRecord({...seed, market: {kind: 'unavailable'}});
    const {content_hash: _previousHash, hash_algorithm: _previousAlgo, ...core} = source;
    const enriched = {
      ...core, motif: seed.motif,
      market_data: attributeTickerMarket(tickerPacket, seed.market_pair, {now: new Date(generatedAt)}),
      artwork: {...core.artwork, status: 'vector_rendered', renderer: 'deterministic_svg', generated_image_url: null},
      provenance: {...core.provenance, artwork_generated: true, vector_artwork_generated: true, ai_artwork_generated: false, financial_claims_verified: false}
    };
    return {...enriched, content_hash: sha256(enriched), hash_algorithm: 'sha256-json-utf8'};
  });
  return {
    schema: 'NEO-CARDMASTER-COLLECTION-V1', generated_at: generatedAt, read_only: true,
    status: tickerPacket ? 'market_feed_attributed' : 'market_feed_unavailable',
    notice: 'Illustrative card art. Submitted financial figures, issuer labels and investment statuses are not independently verified. Market indications are not executed trades, appraisals, promises, or reserve attestations.',
    cards
  };
}

const escapeXml = input => String(input ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&apos;'}[c]));
const ellipsis = (input, max) => {const s = String(input ?? ''); return s.length > max ? s.slice(0, max - 1) + '…' : s;};
const svgText = (x, y, value, size=22, color='#eadab6', extra='') => `<text x="${x}" y="${y}" fill="${color}" font-size="${size}" ${extra}>${escapeXml(value)}</text>`;

function motifArtwork(motif) {
  if (motif === 'octahedron') return `
    <ellipse cx="360" cy="550" rx="160" ry="26" fill="#b99b57" opacity=".16"/>
    <polygon points="360,246 530,429 360,620 190,429" fill="url(#obsidian)" stroke="#e3b95a" stroke-width="8"/>
    <path d="M360 246V620 M190 429H530 M190 429L360 352L530 429 M360 352V620" stroke="#ffe2a1" stroke-width="5" opacity=".75" fill="none"/>
    <circle cx="360" cy="429" r="38" fill="none" stroke="#f6cf69" stroke-width="9"/>
    <path d="M220 625H500V662H220Z M253 663H467V690H253Z" fill="#78603a" stroke="#e7c774" stroke-width="4"/>`;
  if (motif === 'estate') return `
    <path d="M115 665V420L215 375V665 M210 665V290L420 248V665 M432 665V370L580 332V665" stroke="#dfc17b" stroke-width="7" fill="#1f3037"/>
    ${Array.from({length: 5}, (_,row) => Array.from({length: 4}, (_,col) => `<rect x="${244+col*43}" y="${315+row*63}" width="21" height="39" fill="#f0c66d" opacity="${0.45+((row+col)%3)*0.2}"/>`).join('')).join('')}
    <path d="M108 667H590 M140 695H560" stroke="#d8ad63" stroke-width="8"/>`;
  if (motif === 'network') return `
    <path d="M205 560L360 320L515 560L205 560L360 460L515 560 M360 320V630 M205 560L280 680L440 680L515 560" fill="none" stroke="#d1ae6e" stroke-width="6"/>
    ${[[360,320],[205,560],[515,560],[360,460],[280,680],[440,680],[360,630]].map(([x,y]) => `<circle cx="${x}" cy="${y}" r="22" fill="#cba054" stroke="#ffe1a0" stroke-width="4"/>`).join('')}
    <path d="M289 256L360 214L431 256L414 295L360 272L306 295Z" fill="url(#gold)" opacity=".9"/>`;
  return '<circle cx="360" cy="490" r="170" fill="none" stroke="#d4b06e" stroke-width="8"/>';
}

// Pure vector renderer: no scripts, external fonts, remote images, or HTML.
export function renderCardmasterSvg(record, {face='front'}={}) {
  if (!record || !/^NEO-CARD-[A-Z0-9-]{3,80}$/.test(record.card_id || '')) throw new Error('invalid_card');
  if (!['front','back'].includes(face)) throw new Error('invalid_face');
  const title = String(record.title || 'UNTITLED').toUpperCase();
  const lines = title.length <= 27 ? [title] : [ellipsis(title.slice(0,27), 28), ellipsis(title.slice(27), 28)];
  const claims = Object.entries(record.financial_claims || {}).slice(0,5);
  const header = svgText(55,74,'NEO  /  CROWN  /  CARDMASTER',20,'#efd195','letter-spacing="3"') +
    lines.map((line,i) => svgText(55,134+i*36,line,29,'#fff2cd','font-family="Georgia,serif" font-weight="bold"')).join('') +
    svgText(55,220,ellipsis(record.sector || '',46),18,'#baa677');
  const front = `${motifArtwork(record.motif)}<rect x="43" y="741" width="634" height="190" rx="16" fill="#111820" stroke="#94774e"/>
    ${svgText(65,784,'SOURCE-ATTRIBUTED MARKET DATA',15,'#e6c17e','font-weight="bold"')}
    ${svgText(65,833,'FRESH SNAPSHOT IN GALLERY',25,'#fcf0d8')}
    ${svgText(65,870,'PRICE IS NOT EMBEDDED IN STATIC ART',14,'#b8a988')}
    ${svgText(65,910,'ARTWORK IS NOT PROOF OF OWNERSHIP OR BACKING',13,'#b8a988')}`;
  const backRows = claims.map(([key,claim],i) => {
    const y=346+i*90;
    return svgText(60,y,key.replaceAll('_',' ').toUpperCase(),15,'#c8aa71')+
      svgText(60,y+32,ellipsis(claim?.value || '—',40),22,'#f5e8c7')+
      svgText(60,y+54,'SUBMITTED · NOT INDEPENDENTLY VERIFIED',12,'#a9a4a0');
  }).join('');
  const back = `<rect x="43" y="245" width="634" height="575" rx="16" fill="#111820" stroke="#94774e"/>
    ${svgText(60,285,'FINANCIAL SNAPSHOT · UNVERIFIED INPUTS',19,'#edc77a','font-weight="bold"')}
    ${backRows}
    <rect x="43" y="832" width="634" height="98" rx="12" fill="#262124" stroke="#977543"/>
    ${svgText(60,863,'LIVE CONTENT HASH IS IN JSON METADATA',13,'#d2b77f')}
    ${svgText(60,900,'STATIC ART DOES NOT CERTIFY MARKET SNAPSHOTS',14,'#e8dbbc')}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1040" viewBox="0 0 720 1040" role="img" aria-label="${escapeXml(title)} ${face} Crown Card">
  <defs><linearGradient id="bg" x2="0" y2="1"><stop stop-color="#0b141c"/><stop offset="1" stop-color="#05070b"/></linearGradient><linearGradient id="gold" x2="1" y2="1"><stop stop-color="#fff0b0"/><stop offset=".5" stop-color="#b0833b"/><stop offset="1" stop-color="#76522b"/></linearGradient><linearGradient id="obsidian" x2="1" y2="1"><stop stop-color="#162c34"/><stop offset="1" stop-color="#090a10"/></linearGradient></defs>
  <rect x="8" y="8" width="704" height="1024" rx="29" fill="url(#bg)" stroke="url(#gold)" stroke-width="13"/>
  <rect x="31" y="31" width="658" height="978" rx="18" fill="none" stroke="#8f7545" stroke-width="2"/>
  <circle cx="360" cy="465" r="233" fill="none" stroke="#ad8a51" stroke-width="1" opacity=".27"/>
  ${header}${face==='front'?front:back}
  ${svgText(54,966,record.card_id,15,'#d3bf90')}
  ${svgText(54,992,'PROJECT 144 · VECTOR ART · NOT A SECURITIES OFFER',12,'#8d8d86')}
  </svg>`;
}
