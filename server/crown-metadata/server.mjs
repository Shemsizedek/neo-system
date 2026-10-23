import http from 'node:http';
import {createHash} from 'node:crypto';
import {buildShowcase} from './showcase-intelligence-v1.mjs';
const icon=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAIAAADYYG7QAAAAUElEQVR4nO3V0QkAEBRAUUsoZTDDmcR2RlCKR526A5y/m0ZvT5XCBf+AcqmBAQEBAQEB3QFtLxMICAgICAgICAgoBnQuICAgIKAPQY8EtGoCuotp2bnuzpcAAAAASUVORK5CYII=','base64');
import {renderCard} from './engine.mjs';
import {createAssetResolver,renderResolvedAsset} from './resolver.mjs';
/** Inject a durable read-only store: { get(asset): Promise<{manifest,enhanced}|null> }. */
export function createMetadataServer({store,resolveAsset=createAssetResolver()}) {
  return http.createServer(async(req,res)=>{
    const send=(status,body,type='application/json')=>{res.writeHead(status,{'content-type':type,'access-control-allow-origin':'*','cache-control':'public, max-age=60','x-content-type-options':'nosniff','content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; img-src 'self' https:; media-src https:; frame-src https: about:; form-action 'self'; base-uri 'none'"});res.end(Buffer.isBuffer(body)||typeof body === 'string'?body:JSON.stringify(body));};
    if(req.method==='OPTIONS'){res.writeHead(204,{'access-control-allow-origin':'*','access-control-allow-methods':'GET,OPTIONS'});return res.end();}
    if(req.method!=='GET')return send(405,{error:'read_only'});
    try {
      const requestUrl=new URL(req.url,'http://localhost'),path=requestUrl.pathname;
      if(path==='/assets/explore'){const asset=requestUrl.searchParams.get('asset')||'KNOWINDEX';if(!/^[A-Za-z0-9_.-]{1,255}$/.test(asset))return send(400,{error:'invalid_asset'});res.writeHead(302,{location:'/assets/'+encodeURIComponent(asset)+'/explore.html'});return res.end();}
      const showcase=path.match(/^\/assets\/([^/]+)\/showcase\.json$/);
      if(showcase){const asset=decodeURIComponent(showcase[1]);if(!/^[A-Za-z0-9_.-]{1,255}$/.test(asset))return send(400,{error:'invalid_asset'});const data=await resolveAsset(asset);const payload=buildShowcase(asset,data);const sha256=createHash('sha256').update(JSON.stringify(payload),'utf8').digest('hex');return send(200,{payload,integrity:{algorithm:'SHA-256',sha256,encoding:'UTF-8 JSON.stringify(payload)',blockchain_anchor_verified:false}});}
      const resolved=path.match(/^\/assets\/([^/]+)\/(resolve\.json|explore\.html)$/);
      if(resolved){const asset=decodeURIComponent(resolved[1]);if(!/^[A-Za-z0-9_.-]{1,255}$/.test(asset))return send(400,{error:'invalid_asset'});let data;try{data=await resolveAsset(asset);}catch(error){if(resolved[2]==='resolve.json')throw error;const published=await store.get(asset);if(published)return send(200,renderAssetPage(published).replace('<main>','<main><p role="status">Live ledger lookup is temporarily unavailable. Showing published Crown information; current on-chain status has not been verified.</p>'),'text/html; charset=utf-8');return send(503,`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NEO Scan · Ledger temporarily unavailable</title><style>body{background:#101517;color:#eee2c7;font:18px system-ui;padding:32px}a{color:#dfbd68}</style><main><h1>${esc(asset)}</h1><p>The live Counterparty ledger lookup is temporarily unavailable. Please retry shortly.</p><p><a href="explore.html">Retry lookup</a> · <a href="https://tokenscan.io/asset/${encodeURIComponent(asset)}" target="_blank" rel="noopener">View on TokenScan</a></p></main></html>`,'text/html; charset=utf-8');}const crown=await store.get(data.canonical_asset)||await store.get(asset);return resolved[2]==='resolve.json'?send(200,{...data,crown_enrichment:crown?{url:'https://crown.holytemples.org/assets/'+encodeURIComponent(crown.manifest.ledger.asset)+'/manifest.json',on_chain_description_points_to_crown:String(data.ledger.description).startsWith('https://crown.holytemples.org/assets/')}:null}):send(200,renderResolvedAsset(data,crown),'text/html; charset=utf-8');}
      if(/^\/icons\/[a-f0-9]{16}\.png$/.test(path))return send(200,icon,'image/png');
      if(path==='/assets/commitment.json'){const root=await store.get('_commitment');return root?send(200,root):send(404,{error:'commitment_unavailable'});}
      const match=path.match(/^\/assets\/([^/]+)\/(info\.json|manifest\.json|card\.svg|card\.json|icon\.png|index\.html|verification\.json|methodology\.txt)$/);
      if(!match)return send(404,{error:'not_found'});
      const asset=decodeURIComponent(match[1]);
      if(!/^[A-Za-z0-9_.-]{1,255}$/.test(asset))return send(400,{error:'invalid_asset'});
      const record=await store.get(asset);
      if(!record)return send(404,{error:'asset_not_published'});
      if(match[2]==='verification.json')return record.verification?send(200,record.verification):send(404,{error:'verification_unavailable'});
      if(match[2]==='methodology.txt')return record.methodology_text?send(200,record.methodology_text,'text/plain; charset=utf-8'):send(404,{error:'methodology_unavailable'});
      if(match[2]==='icon.png')return send(200,record.icon_base64?Buffer.from(record.icon_base64,'base64'):icon,'image/png');
      if(match[2]==='card.json')return send(200,{name:record.manifest.card.primary_title,description:record.enhanced.description,image:record.manifest.image,external_url:record.enhanced.website,properties:{crown:record.manifest}});
      if(match[2]==='index.html')return send(200,renderAssetPage(record),'text/html; charset=utf-8');
      if(match[2]==='card.svg')return send(200,record.card_svg||renderCard(record.manifest),'image/svg+xml');
      return send(200,match[2]==='info.json'?record.enhanced:record.manifest);
    } catch {return send(503,{error:'metadata_unavailable'});}
  });
}

const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderAssetPage(record){
 const m=record.manifest;
 const links=(m.attachments||[]).filter(a=>{try{return new URL(a.url).protocol==='https:';}catch{return false;}});
 return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(m.card.primary_title)} · NEO Crown</title><style>body{margin:0;background:#101517;color:#eee2c7;font:16px system-ui}main{max-width:960px;margin:auto;padding:32px}img{width:min(100%,360px);float:left;margin:0 32px 24px 0}a{color:#e4c578}p{line-height:1.6}li{margin:16px 0}footer{clear:both;padding-top:24px;color:#aaa}</style><main><img src="card.svg" alt="${esc(m.card.primary_title)} Crown card"><h1>${esc(m.card.primary_title)}</h1><p>${esc(m.issuer_claims.description)}</p><h2>Additional information</h2><ul>${links.map(a=>`<li><a rel="noopener noreferrer" href="${esc(a.url)}">${esc(a.title||a.kind)}</a> · ${esc(a.kind)}</li>`).join('')}</ul><p><a href="info.json">Counterparty metadata</a> · <a href="manifest.json">Crown manifest</a> · <a href="card.json">Collectible metadata</a></p><footer>Bitcoin / Counterparty asset presentation. Issuer descriptions and linked materials are attributed claims. Market data is unavailable unless a sourced quote is included. A visual card does not itself establish NFT uniqueness, backing, or legal rights.</footer></main></html>`;
}
