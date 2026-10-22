import http from 'node:http';
const icon=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAIAAADYYG7QAAAAUElEQVR4nO3V0QkAEBRAUUsoZTDDmcR2RlCKR526A5y/m0ZvT5XCBf+AcqmBAQEBAQEB3QFtLxMICAgICAgICAgoBnQuICAgIKAPQY8EtGoCuotp2bnuzpcAAAAASUVORK5CYII=','base64');
import {renderCard} from './engine.mjs';
/** Inject a durable read-only store: { get(asset): Promise<{manifest,enhanced}|null> }. */
export function createMetadataServer({store}) {
  return http.createServer(async(req,res)=>{
    const send=(status,body,type='application/json')=>{res.writeHead(status,{'content-type':type,'access-control-allow-origin':'*','cache-control':'public, max-age=60','x-content-type-options':'nosniff','content-security-policy':"default-src 'none'; style-src 'unsafe-inline'"});res.end(Buffer.isBuffer(body)||typeof body === 'string'?body:JSON.stringify(body));};
    if(req.method==='OPTIONS'){res.writeHead(204,{'access-control-allow-origin':'*','access-control-allow-methods':'GET,OPTIONS'});return res.end();}
    if(req.method!=='GET')return send(405,{error:'read_only'});
    try {
      const path=new URL(req.url,'http://localhost').pathname;
      if(/^\/icons\/[a-f0-9]{16}\.png$/.test(path))return send(200,icon,'image/png');
      const match=path.match(/^\/assets\/([^/]+)\/(info\.json|manifest\.json|card\.svg)$/);
      if(!match)return send(404,{error:'not_found'});
      const asset=decodeURIComponent(match[1]);
      if(!/^[A-Za-z0-9_.-]{1,255}$/.test(asset))return send(400,{error:'invalid_asset'});
      const record=await store.get(asset);
      if(!record)return send(404,{error:'asset_not_published'});
      if(match[2]==='card.svg')return send(200,renderCard(record.manifest),'image/svg+xml');
      return send(200,match[2]==='info.json'?record.enhanced:record.manifest);
    } catch {return send(503,{error:'metadata_unavailable'});}
  });
}
