import http from 'node:http';
const icon=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAIAAADYYG7QAAAAUElEQVR4nO3V0QkAEBRAUUsoZTDDmcR2RlCKR526A5y/m0ZvT5XCBf+AcqmBAQEBAQEB3QFtLxMICAgICAgICAgoBnQuICAgIKAPQY8EtGoCuotp2bnuzpcAAAAASUVORK5CYII=','base64');
import {renderCard} from './engine.mjs';
/** Inject a durable read-only store: { get(asset): Promise<{manifest,enhanced}|null> }. */
export function createMetadataServer({store}) {
  return http.createServer(async(req,res)=>{
    const send=(status,body,type='application/json')=>{res.writeHead(status,{'content-type':type,'access-control-allow-origin':'*','cache-control':'public, max-age=60','x-content-type-options':'nosniff','content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; img-src 'self'"});res.end(Buffer.isBuffer(body)||typeof body === 'string'?body:JSON.stringify(body));};
    if(req.method==='OPTIONS'){res.writeHead(204,{'access-control-allow-origin':'*','access-control-allow-methods':'GET,OPTIONS'});return res.end();}
    if(req.method!=='GET')return send(405,{error:'read_only'});
    try {
      const path=new URL(req.url,'http://localhost').pathname;
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
