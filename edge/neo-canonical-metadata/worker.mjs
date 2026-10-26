// NCC-018: EXACT-path NEO canonical metadata responder for an optional HTTP edge route.
// This code is deliberately NOT deployed or bound to a hostname by the repository.
// The existing Crown auth, session, enrollment, and API routes are untouched.
const HOST='crown.holytemples.org';
const PATH='/assets/NOMNI/tokenscan.json';
export const CANONICAL_NEO_METADATA_ROUTE=Object.freeze({
  hostname:HOST,path:PATH,brand:'NEO canonical metadata',
  technical_asset_code:'NOMNI',
  route_pattern:'crown.holytemples.org/assets/NOMNI/tokenscan.json*'
});
// Byte-level authoritative input is the already reviewed compatibility file in Crown staging.
// Avoid substituting the richer unreviewed main-branch NOMNI attachment.
export const APPROVED_NEO_METADATA={
  asset:'NOMNI',
  description:'NOMNI is a Bitcoin/Counterparty token. This metadata is issuer-supplied information for asset discovery, not evidence of ownership, reserves, investment returns, or a verified market price. The on-chain issuer and owner may differ; check Counterparty transaction history.',
  website:'https://neo-crown-cardmaster-runtime.onrender.com/'
};
const BYTES=JSON.stringify(APPROVED_NEO_METADATA);
const ENCODER=new TextEncoder();
const DATA=ENCODER.encode(BYTES);

function reply(data,status,headers={}){
  return new Response(data,{status,headers:{
    'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'public, max-age=120',
    'X-Content-Type-Options':'nosniff',
    'X-Robots-Tag':'noindex',
    ...headers
  }});
}

/**
 * Usable as a Cloudflare Worker fetch handler WHEN an authorized DNS/edge owner
 * installs the exact-route binding. Unlike blanket DNS repointing, other routes
 * continue to their current origin, preserving Crown authentication services.
 * Invoking this handler does not broadcast or modify any Bitcoin transaction.
 */
export async function handleNeoCanonicalRequest(request,{passthrough=fetch}={}){
  const url=new URL(request.url);
  if(url.protocol!=='https:'||url.hostname.toLowerCase()!==HOST||url.port||url.pathname!==PATH){
    // Never rewrite or redirect authenticated endpoints or other token paths.
    return passthrough(request);
  }
  if(request.method!=='GET'&&request.method!=='HEAD'){
    return reply(JSON.stringify({error:'read_only_neo_canonical_metadata'}),405,{
      'Allow':'GET, HEAD','Cache-Control':'no-store'
    });
  }
  // No query parameter can affect the metadata file. Do not allow clients to
  // override issuer, asset, source, image, or publication status by URL fields.
  if(url.search)return reply(JSON.stringify({error:'canonical_metadata_requires_exact_url'}),400,{
    'Cache-Control':'no-store'
  });
  const headers={
    'Content-Length':String(DATA.byteLength),
    'Access-Control-Allow-Origin':'*'
  };
  return reply(request.method==='HEAD'?null:DATA,200,headers);
}
export default {fetch:handleNeoCanonicalRequest};
