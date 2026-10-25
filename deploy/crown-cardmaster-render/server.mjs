import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {dirname, resolve, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createCardmasterHandler} from '../../api/crown/cardmaster.mjs';
import {CARDMASTER_SEEDS} from '../../server/crown-metadata/cardmaster-gallery.mjs';
import {createCounterpartyEvidenceService} from '../../server/crown-metadata/counterparty-order-evidence.mjs';
import {createCrownMetadataReadinessService} from '../../server/crown-metadata/metadata-readiness.mjs';
import {createAssetResolver} from '../../server/crown-metadata/resolver.mjs';
import {normalizeShowcaseInput,createLayer3Observed,createLayer3Preview,LAYER3_TYPES,LAYER3_NETWORKS,LAYER3_STYLES} from '../../server/crown-metadata/layer3-showcase.mjs';
import {renderLayer3Svg} from '../../server/crown-metadata/layer3-artwork.mjs';
import {normalizeShowcaseQuery} from '../../server/crown-metadata/showcase-query.mjs';

const baseDir = dirname(fileURLToPath(import.meta.url));
const DEFAULT_STATIC_ROOT = resolve(baseDir, '../../apps/neoscan/web/cardmaster');
const CARDS = new Set(CARDMASTER_SEEDS.map(card=>card.card_id));
const FILES = new Map([
  ['/', ['index.html','text/html; charset=utf-8']],
  ['/index.html', ['index.html','text/html; charset=utf-8']],
  ['/app.js', ['app.js','text/javascript; charset=utf-8']],
  ['/catalog.js', ['catalog.js','text/javascript; charset=utf-8']],
  ['/styles.css', ['styles.css','text/css; charset=utf-8']],
  ['/studio', ['studio/index.html','text/html; charset=utf-8']],
  ['/studio/', ['studio/index.html','text/html; charset=utf-8']],
  ['/studio/index.html', ['studio/index.html','text/html; charset=utf-8']],
  ['/studio/studio-core.mjs', ['studio/studio-core.mjs','text/javascript; charset=utf-8']],
  ['/studio/studio-app.mjs', ['studio/studio-app.mjs','text/javascript; charset=utf-8']],
  ['/studio/studio.css', ['studio/studio.css','text/css; charset=utf-8']],
  ['/studio/media-core.mjs', ['studio/media-core.mjs','text/javascript; charset=utf-8']],
  ['/studio/media-store.mjs', ['studio/media-store.mjs','text/javascript; charset=utf-8']],
  ['/studio/media-ui.mjs', ['studio/media-ui.mjs','text/javascript; charset=utf-8']],
  ['/metadata', ['metadata/index.html','text/html; charset=utf-8']],
  ['/metadata/', ['metadata/index.html','text/html; charset=utf-8']],
  ['/metadata/index.html', ['metadata/index.html','text/html; charset=utf-8']],
  ['/metadata/app.js', ['metadata/app.js','text/javascript; charset=utf-8']],
  ['/metadata/styles.css', ['metadata/styles.css','text/css; charset=utf-8']],
  ['/showcase', ['showcase/index.html','text/html; charset=utf-8']],
  ['/showcase/', ['showcase/index.html','text/html; charset=utf-8']],
  ['/showcase/index.html', ['showcase/index.html','text/html; charset=utf-8']],
  ['/showcase/app.js', ['showcase/app.js','text/javascript; charset=utf-8']],
  ['/showcase/styles.css', ['showcase/styles.css','text/css; charset=utf-8']]
]);
const BASE_CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

function commonHeaders(res) {
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Cross-Origin-Resource-Policy','same-origin');
  res.setHeader('Content-Security-Policy',BASE_CSP);
  res.setHeader('Cache-Control','no-store');
}
function json(res,status,payload) {
  res.statusCode=status;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  return res.end(JSON.stringify(payload));
}
function bridgeResponse(res) {
  res.status = function(code){this.statusCode=code;return this;};
  res.json = function(payload){this.setHeader('Content-Type','application/json; charset=utf-8');this.end(JSON.stringify(payload));return this;};
  res.send = function(body){this.end(body);return this;};
  return res;
}
function fileRoute(pathname) {
  if(FILES.has(pathname))return FILES.get(pathname);
  // Direct HTTP 200 JSON, never redirect: required by Counterparty enhanced metadata.
  const enhanced=/^\/assets\/([A-Z][A-Z0-9]{0,23})\/(tokenscan|manifest)\.json$/.exec(pathname);
  if(enhanced) return [`assets/${enhanced[1]}/${enhanced[2]}.json`,'application/json; charset=utf-8'];
  const match = /^\/art\/(NEO-CARD-[A-Z0-9-]{3,80})-(front|back)\.svg$/.exec(pathname);
  return match && CARDS.has(match[1]) ? [`art/${match[1]}-${match[2]}.svg`,'image/svg+xml; charset=utf-8'] : null;
}

export function createCrownRenderServer({apiHandler=createCardmasterHandler(),evidenceService=createCounterpartyEvidenceService(),metadataService=createCrownMetadataReadinessService(),showcaseResolver=createAssetResolver(),staticRoot=DEFAULT_STATIC_ROOT}={}) {
  let inflight=0;
  const server=createServer(async (req,res)=>{
    commonHeaders(res);
    if(!req.url || req.url.length > 2048) return json(res,414,{error:'url_too_long'});
    let parsed;
    try {parsed=new URL(req.url,'http://localhost');} catch {return json(res,400,{error:'invalid_url'});}
    const path=parsed.pathname;
    if(path==='/healthz') {
      if(req.method==='GET'||req.method==='HEAD') {
        res.setHeader('Content-Type','application/json; charset=utf-8');
        res.statusCode=200;
        return res.end(req.method==='HEAD'?'':JSON.stringify({service:'neo-crown-cardmaster',gate:'NCC-007',status:'ok',read_only:true,market_data:'source_attributed_only'}));
      }
      res.setHeader('Allow','GET,HEAD');return json(res,405,{error:'read_only_endpoint'});
    }
    if(path==='/robots.txt'){
      res.setHeader('Content-Type','text/plain; charset=utf-8');
      return res.end('User-agent: *\nDisallow: /\n');
    }
    if(path==='/api/crown/showcase') {
      if(req.method!=='GET'){
        res.setHeader('Allow','GET');return json(res,405,{error:'read_only_endpoint'});
      }
      let params;
      try{
        // Sharing clients can insert harmless trackers or HTML-escape '&' as '&amp;'.
        // Strip tracking, fold identical duplicates, reject conflicting selector values.
        params=normalizeShowcaseQuery(parsed.searchParams);
      }catch(error){
        const code=error?.code||'invalid_showcase_parameters';
        return json(res,400,{
          error:code,
          message:'This card link has unsupported or conflicting fields. Open the Layer 3 studio to generate a fresh link.',
          studio_url:'/showcase/',
          issuance_authorized:false
        });
      }
      const request={
        asset:params.get('asset')||'NOMNI',
        mode:params.get('mode')||'observed',
        instrumentType:params.get('instrument_type')||'unclassified',
        network:params.get('network')||'counterparty',
        title:params.get('title')||'',
        style:params.get('style')||'auto'
      };
      const format=params.get('format')||'json';
      const face=params.get('face')||'front';
      if(!['svg','json'].includes(format)||!['front','back'].includes(face))return json(res,400,{error:'unsupported_export_format'});
      if(request.mode==='observed'&&(params.has('instrument_type')||params.has('title')))return json(res,400,{error:'observed_classification_cannot_be_overridden'});
      let validated;
      try{validated=normalizeShowcaseInput(request);}
      catch{return json(res,400,{error:'invalid_showcase_input'});}
      if(inflight>=2)return json(res,503,{error:'gateway_busy'});
      inflight++;
      try{
        const card=validated.mode==='preview'
          ?createLayer3Preview(validated)
          :createLayer3Observed(validated,await showcaseResolver(validated.asset));
        if(format==='svg'){
          res.statusCode=200;
          res.setHeader('Content-Type','image/svg+xml; charset=utf-8');
          res.setHeader('Content-Security-Policy',"default-src 'none'; sandbox");
          res.setHeader('Content-Disposition','inline; filename="NEO-L3-'+card.payload.card_id.slice(-18)+'-'+face+'.svg"');
          return res.end(renderLayer3Svg(card,{face}));
        }
        return json(res,200,{
          ...card,read_only:true,
          on_demand:true,formats:['json','svg','browser_png'],
          supported_instrument_types:LAYER3_TYPES,
          supported_preview_protocols:LAYER3_NETWORKS,
          supported_finishes:LAYER3_STYLES
        });
      }catch(error){
        if(error?.message==='asset_not_found')return json(res,404,{error:'counterparty_asset_not_found'});
        return json(res,503,{error:'showcase_source_unavailable'});
      }finally{inflight--;}
    }
    if(path==='/api/crown/metadata-readiness') {
      if(req.method!=='GET') {
        res.setHeader('Allow','GET');return json(res,405,{error:'read_only_endpoint'});
      }
      const names=parsed.searchParams.getAll('asset');
      if(names.length>1)return json(res,400,{error:'ambiguous_asset'});
      const assetName=names.length?names[0]:'NOMNI';
      if(!/^[A-Z][A-Z0-9]{0,23}$/.test(assetName))return json(res,400,{error:'invalid_asset'});
      if(inflight>=2)return json(res,503,{error:'gateway_busy'});
      inflight++;
      try {
        const local=await readFile(join(staticRoot,'assets',assetName,'tokenscan.json'));
        if(local.length>8192)return json(res,503,{error:'local_metadata_too_large'});
        const approved=JSON.parse(local.toString('utf8'));
        const result=await metadataService.inspect(assetName,approved);
        return json(res,200,result);
      }catch(error){
        if(error?.code==='ENOENT')return json(res,404,{error:'asset_not_published'});
        return json(res,503,{error:'metadata_readiness_unavailable'});
      }finally{inflight--;}
    }
    if(path==='/api/crown/order-evidence') {
      if(req.method!=='GET') {
        res.setHeader('Allow','GET');return json(res,405,{error:'read_only_endpoint'});
      }
      if(inflight>=2)return json(res,503,{error:'gateway_busy'});
      inflight++;
      try {
        const result=await evidenceService.observe();
        return json(res,200,result);
      } catch {return json(res,503,{error:'order_evidence_unavailable'});}
      finally {inflight--;}
    }
    if(path==='/api/crown/cardmaster') {
      if(req.method !== 'GET' && req.method !== 'OPTIONS') {res.setHeader('Allow','GET,OPTIONS');return json(res,405,{error:'read_only_endpoint'});}
      if(req.method==='GET' && inflight>=2) return json(res,503,{error:'gateway_busy'});
      req.query=Object.fromEntries(parsed.searchParams.entries());
      const format=req.query.format||'json';
      if(format==='json') inflight++;
      try {await apiHandler(req,bridgeResponse(res));}
      catch {if(!res.writableEnded)json(res,503,{error:'gateway_unavailable'});}
      finally {if(format==='json')inflight--;}
      return;
    }
    if(req.method!=='GET'&&req.method!=='HEAD') {
      res.setHeader('Allow','GET,HEAD');return json(res,405,{error:'read_only_endpoint'});
    }
    const asset=fileRoute(path);
    if(!asset) return json(res,404,{error:'not_found'});
    try {
      const data=await readFile(join(staticRoot,asset[0]));
      if(data.length>1024*1024) return json(res,503,{error:'asset_too_large'});
      res.statusCode=200;
      res.setHeader('Content-Type',asset[1]);
      res.setHeader('Content-Length',data.length);
      res.setHeader('Cache-Control',path.startsWith('/art/')?'public, max-age=600':'public, max-age=120');
      if(path.endsWith('.svg'))res.setHeader('Content-Security-Policy',"default-src 'none'; sandbox");
      return res.end(req.method==='HEAD'?undefined:data);
    } catch (error) {
      if(path.startsWith('/assets/') && error?.code==='ENOENT')return json(res,404,{error:'asset_not_published'});
      return json(res,503,{error:'asset_unavailable'});
    }
  });
  server.requestTimeout=12000;
  server.headersTimeout=10000;
  server.keepAliveTimeout=5000;
  return server;
}

if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const port=Number(process.env.PORT||10000);
  if(!Number.isInteger(port)||port<1||port>65535)throw new Error('invalid_port');
  const server=createCrownRenderServer();
  server.listen(port,'0.0.0.0',()=>console.log(`NEO Crown CARDMASTER staging running at :${port}`));
}
