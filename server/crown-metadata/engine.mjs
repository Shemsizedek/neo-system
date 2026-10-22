import { createHash } from 'node:crypto';
const digest = value => createHash('sha256').update(value).digest('hex');
const text = (value, fallback = '', max = 2048) => typeof value === 'string' ? value.slice(0, max) : fallback;
export function publicUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.port) throw new Error('https_url_required');
  return url;
}
/** Remote descriptions never select arbitrary network destinations. Hosts must be operator controlled. */
export async function resolveDescription(description, { allowedOrigins = [], fetchImpl = fetch } = {}) {
  if (typeof description !== 'string' || Buffer.byteLength(description) > 65536) throw new Error('invalid_description');
  let result;
  if (description.trim().startsWith('{')) result = JSON.parse(description);
  else {
    const url = publicUrl(description);
    if (!allowedOrigins.includes(url.origin)) throw new Error('manifest_origin_not_allowed');
    const response = await fetchImpl(url, { redirect:'error', signal:AbortSignal.timeout(5000), headers:{accept:'application/json'} });
    if (response.status !== 200 || !response.headers.get('content-type')?.includes('application/json')) throw new Error('invalid_manifest_response');
    const chunks=[]; let size=0;
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > 65536) { await response.body.cancel?.().catch(()=>{}); throw new Error('manifest_too_large'); }
      chunks.push(Buffer.from(chunk));
    }
    result = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }
  if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('manifest_object_required');
  return result;
}
export function createAssetRecord(raw, extra = {}, {origin, issuerLabel, observedAt, sourceUrl} = {}) {
  const base = publicUrl(origin).origin;
  if (!/^[A-Za-z0-9_.-]{1,255}$/.test(raw.asset || '')) throw new Error('invalid_asset');
  if (typeof raw.supply !== 'string' || !/^\d+$/.test(raw.supply)) throw new Error('supply_integer_string_required');
  if (typeof raw.owner !== 'string' || !raw.owner || typeof raw.locked !== 'boolean' || typeof raw.divisible !== 'boolean') throw new Error('invalid_ledger_fields');
  if (!observedAt || !Number.isFinite(Date.parse(observedAt))) throw new Error('observed_at_required');
  if (extra.asset && extra.asset !== raw.asset) throw new Error('manifest_asset_mismatch');
  const id = digest(`bitcoin:mainnet:counterparty:${raw.asset}`);
  if (`${base}/icons/${id.slice(0,16)}.png`.length > 100 || raw.asset.length > 24) throw new Error('legacy_enhanced_limits_exceeded');
  const assetPath = `/assets/${encodeURIComponent(raw.asset)}`;
  const ledger = {chain:'bitcoin', network:'mainnet', protocol:'counterparty', asset:raw.asset, asset_longname:text(raw.asset_longname), owner:raw.owner, supply:raw.supply, divisible:raw.divisible, locked:raw.locked, description:text(raw.description), observed_at:observedAt, source_url:publicUrl(sourceUrl).href};
  const card = {schema:'NEO-CROWN-CARD-V1', primary_title:text(extra.primary_title, raw.asset_longname || raw.asset, 120), subtitle:text(extra.subtitle, 'Bitcoin / Counterparty · Crown metadata', 180), issuer:text(issuerLabel, 'Issuer not verified', 120), status:text(extra.status, 'UNDER REVIEW', 40), sector:text(extra.sector, 'Digital assets', 120), neo_score:Number.isFinite(extra.neo_score) && extra.neo_score >= 0 && extra.neo_score <= 100 ? extra.neo_score : null};
  const manifest = {schema:'NEO-CROWN-MANIFEST-V1', card_id:`NEO-CARD-${id}`, ledger, card, issuer_claims:{description:text(extra.description)}, market_data:null, provenance:{metadata_authority:'operator_curated', wallet_control_verified:false, issuance_verified:false, bitcoin_anchor:null}, image:`${base}${assetPath}/card.svg`, external_url:`https://tokenscan.io/asset/${encodeURIComponent(raw.asset)}`};
  const content_hash = digest(JSON.stringify(manifest));
  return {manifest:{...manifest,content_hash,hash_algorithm:'sha256-json-utf8'}, enhanced:{asset:raw.asset,description:`${text(extra.description, raw.asset, 1400)}\nCrown metadata: ${base}${assetPath}/manifest.json`,image:`${base}/icons/${id.slice(0,16)}.png`,website:base}};
}
const escape = value => String(value).replace(/[&<>"']/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch]));
export function renderCard(manifest) {
  const c=manifest.card, l=manifest.ledger;
  const rows=[['ASSET',l.asset],['ISSUER',c.issuer],['SUPPLY (RAW UNITS)',l.supply],['SUPPLY LOCKED',String(l.locked)],['STATUS · ISSUER LABEL',c.status],['NEO SCORE',c.neo_score === null ? 'NOT RATED' : `${c.neo_score}/100`],['MARKET PRICE','NO VERIFIED QUOTE']];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1040" viewBox="0 0 720 1040"><rect x="8" y="8" width="704" height="1024" rx="30" fill="#15181b" stroke="#b99b57" stroke-width="12"/><text x="48" y="85" fill="#d8bb73" font-size="28" font-family="serif">${escape(c.primary_title.slice(0,32))}</text><text x="48" y="125" fill="#bbb" font-size="16">BITCOIN / COUNTERPARTY / NEO CROWN</text><path d="M260 200 L460 200 L460 370 L260 370 Z M285 225 L435 225 L435 345 L285 345 Z" fill="none" stroke="#b99b57" stroke-width="8"/><circle cx="360" cy="285" r="32" fill="none" stroke="#b99b57" stroke-width="6"/>${rows.map(([k,v],i)=>`<text x="48" y="${440+i*64}" fill="#a99976" font-size="13">${escape(k)}</text><text x="48" y="${465+i*64}" fill="#f0e5ca" font-size="19">${escape(String(v).slice(0,52))}</text>`).join('')}<text x="48" y="950" fill="#bbb" font-size="14">Metadata presentation · No backing inferred</text><text x="48" y="980" fill="#a99976" font-size="12">SHA256 ${escape(manifest.content_hash.slice(0,32))}…</text></svg>`;
}
/** Paginated issued-asset discovery is injected; holdings are not issuance evidence. */
export async function inventoryIssuedAssets(wallets, listIssuedAssets) {
  const assets = new Map();
  for (const wallet of wallets) {
    if (!wallet.address || !['world-treasury','security'].includes(wallet.role)) throw new Error('invalid_wallet_configuration');
    let cursor=null; const seen=new Set();
    do {
      const page=await listIssuedAssets(wallet.address,cursor);
      if (!Array.isArray(page.items)) throw new Error('invalid_issuance_page');
      for (const item of page.items) {
        if (item.issuer !== wallet.address) continue;
        const previous=assets.get(item.asset) || {asset:item.asset,issuances:[]};
        previous.issuances.push({issuer:item.issuer,role:wallet.role,tx_hash:item.tx_hash}); assets.set(item.asset,previous);
      }
      cursor=page.next_cursor ?? null;
      if (cursor !== null && seen.has(cursor)) throw new Error('pagination_loop');
      seen.add(cursor);
    } while(cursor !== null);
  }
  return [...assets.values()].sort((a,b)=>a.asset.localeCompare(b.asset));
}
