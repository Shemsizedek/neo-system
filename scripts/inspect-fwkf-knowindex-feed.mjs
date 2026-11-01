// Read-only FWKF KNOWINDEX evidence probe; never signs, stores, anchors, or issues assets.
const URL = "https://worldcafe.holytemples.org/knowindex.json";
const EXPECTED = Array.from({length:8}, (_,i)=>"NK-"+String(i+1).padStart(2,"0"));
export function validateFeed(feed) {
  if (!feed || typeof feed!=="object" || Array.isArray(feed)) throw new Error("Invalid feed object");
  if (feed.version!=="0.1.0-draft" || feed.id!=="fwkf-knowindex-001" || feed.status!=="reference_only") throw new Error("Unexpected feed schema/state");
  if (feed.sources?.foundation!=="https://worldcafe.holytemples.org/" || feed.sources?.world_library!=="https://holytemples.org/world-library/") throw new Error("Source allowlist mismatch");
  if (feed.knowindex?.name!=="KNOWINDEX" || feed.knowindex?.live_asset_verified!==false || feed.knowindex?.asset_rights_verified!==false) throw new Error("Asset-state boundary missing");
  if (feed.knowindex?.transaction_id!==null || feed.knowindex?.asset_id!==null || feed.knowindex?.supply_on_chain!==null) throw new Error("Unverified chain state");
  if (feed.live_observations_available!==false || !Array.isArray(feed.measures) || feed.measures.length!==8) throw new Error("Unreviewed observations");
  if (feed.measures.some((m,i)=>m.code!==EXPECTED[i] || m.value!==null || typeof m.definition!=="string")) throw new Error("Unreviewed measure values or codes");
  if (feed.crown_chain_evidence?.production_writes_approved!==false || feed.crown_chain_evidence?.bitcoin_commitment_verified!==false || feed.crown_chain_evidence?.signatures_present!==false) throw new Error("Crown-chain evidence boundary violated");
  if (feed.crown_chain_evidence?.candidate_feed!==URL) throw new Error("Unexpected candidate source");
  return Object.freeze({
    source:URL,
    status:"methodology_only",
    knowledgeIndexCodes:EXPECTED.slice(0,7),
    knowledgeEconomicIndexCode:"NK-08",
    publicObservations:0,
    knowindexAssetVerified:false,
    bitcoinAnchored:false,
    crownChainWritesApproved:false,
    permittedAction:"read_only_review"
  });
}
export async function inspectFeed(fetcher=fetch) {
  const response = await fetcher(URL,{method:"GET",redirect:"error",signal:AbortSignal.timeout(10000),headers:{"accept":"application/json"}});
  if (!response.ok) throw new Error("Feed fetch failed: "+response.status);
  const ct=response.headers?.get?.("content-type")||"";
  if (!ct.includes("application/json")) throw new Error("Unexpected content type");
  const body=await response.text();
  if (body.length>65536) throw new Error("Feed exceeded 64 KiB");
  return validateFeed(JSON.parse(body));
}
if (process.argv[1] && import.meta.url===new URL("file://"+process.argv[1]).href) {
  inspectFeed().then(x=>console.log(JSON.stringify(x,null,2))).catch(e=>{console.error(String(e));process.exitCode=1;});
}
