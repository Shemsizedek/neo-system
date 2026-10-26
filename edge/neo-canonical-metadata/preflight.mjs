// NCC-019: read-only NEO canonical metadata activation preflight.
// DNS/edge mutation, wallet signing and token issuance are outside this module.
import {createHash} from 'node:crypto';
import {APPROVED_NEO_METADATA,CANONICAL_NEO_METADATA_ROUTE} from '../../edge/neo-canonical-metadata/worker.mjs';

const ORIGIN='https://crown.holytemples.org';
const ROUTE=ORIGIN+'/assets/NOMNI/tokenscan.json';
const MAX=8192;
const contentHash=body=>createHash('sha256').update(body,'utf8').digest('hex');
const expected=JSON.stringify(APPROVED_NEO_METADATA);
const PROBES=Object.freeze([
  {name:'crown_root',path:'/',method:'GET'},
  {name:'crown_identity_readonly',path:'/api/v1/trust/verify',method:'GET'},
  {name:'crown_metadata_unrelated',path:'/assets/NEOBOND/tokenscan.json',method:'GET'}
]);
async function probe(url,method,fetchImpl,timeoutMs){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetchImpl(url,{method,redirect:'manual',signal:controller.signal,headers:{accept:'application/json'}});
    let body='';
    if(method!=='HEAD'&&response.body){
      const len=Number(response.headers.get('content-length')||0);
      if(len>MAX)return {status:response.status,error:'response_too_large'};
      const buffer=await response.arrayBuffer();
      if(buffer.byteLength>MAX)return {status:response.status,error:'response_too_large'};
      body=new TextDecoder().decode(buffer);
    }
    return {status:response.status,content_type:response.headers.get('content-type')||null,
      location:response.headers.get('location')||null,body};
  }catch(error){
    return {status:null,error:error?.name==='AbortError'?'timeout':'connection_unavailable'};
  }finally{clearTimeout(timer);}
}
export async function inspectNeoCanonicalActivation({fetchImpl=fetch,timeoutMs=4500}={}){
  if(!Number.isInteger(timeoutMs)||timeoutMs<100||timeoutMs>15000)throw Error('invalid_probe_timeout');
  const [get,head,...other]=await Promise.all([
    probe(ROUTE,'GET',fetchImpl,timeoutMs),probe(ROUTE,'HEAD',fetchImpl,timeoutMs),
    ...PROBES.map(({path,method})=>probe(ORIGIN+path,method,fetchImpl,timeoutMs))
  ]);
  let json=null;
  try{json=JSON.parse(get.body);}catch{}
  const exactMatch=json!==null&&JSON.stringify(json)===expected;
  const contentType=typeof get.content_type==='string'&&/^application\/json\b/i.test(get.content_type);
  const canonicalReady=get.status===200&&!get.location&&contentType&&exactMatch&&
    head.status===200&&!head.location;
  const results=PROBES.map((item,i)=>({
    name:item.name,
    http_status:other[i].status,
    returned_redirect:!!other[i].location,
    reachable:other[i].status!==null,
    // Original Crown origin may legitimately return 401/403/404/405.
    // A status alone cannot prove that authentication actually works.
    expected_behavior_verified:false
  }));
  return {
    schema:'NEO-CROWN-EDGE-ACTIVATION-PREFLIGHT-V1',
    brand:'NEO canonical metadata',
    technical_asset_id:'NOMNI',
    canonical_url:ROUTE,
    route_binding:CANONICAL_NEO_METADATA_ROUTE.route_pattern,
    canonical:{
      status:canonicalReady?'MATCHES_APPROVED':'BLOCKED',
      get_http_status:get.status,head_http_status:head.status,
      content_type:get.content_type,
      redirected:!!get.location,
      exact_approved_json:exactMatch,
      expected_sha256:contentHash(expected),
      observed_sha256:get.status===200?contentHash(get.body):null,
      error:get.error||null
    },
    other_routes:results,
    authentication_operationally_verified:false,
    tokenscan_enhanced_display_verified:false,
    issuer_authorization_verified:false,
    safe_to_activate_auto_issuance:false,
    recommended_next_step:canonicalReady
      ?'verify_original_auth_origin_and_tokenscan_enrichment_independently'
      :'authorize_and_install_exact_path_route_on_verified_crown_dns_edge',
    mutations_performed:false
  };
}
