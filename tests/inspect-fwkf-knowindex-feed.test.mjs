import test from "node:test";
import assert from "node:assert/strict";
import { validateFeed, inspectFeed } from "../scripts/inspect-fwkf-knowindex-feed.mjs";
function fixture(){
  return {
    version:"0.1.0-draft",id:"fwkf-knowindex-001",status:"reference_only",
    live_observations_available:false,
    sources:{foundation:"https://worldcafe.holytemples.org/",world_library:"https://holytemples.org/world-library/"},
    knowindex:{name:"KNOWINDEX",live_asset_verified:false,asset_rights_verified:false,transaction_id:null,asset_id:null,supply_on_chain:null,indexer_observation:{reported_asset_id:2197274275635,reported_supply_units:1000,reported_divisible:false,reported_locked:false,explorer_sources:["https://tokenscan.io/asset/KNOWINDEX","https://xcp.io/asset/KNOWINDEX"]}},
    measures:Array.from({length:8},(_,i)=>({code:"NK-"+String(i+1).padStart(2,"0"),definition:"Test definition",value:null})),
    crown_chain_evidence:{candidate_feed:"https://worldcafe.holytemples.org/knowindex.json",production_writes_approved:false,bitcoin_commitment_verified:false,signatures_present:false}
  };
}
test("public methodology can feed a read-only Crown metadata preview",()=> {
  const r=validateFeed(fixture());assert.equal(r.knowledgeEconomicIndexCode,"NK-08");assert.equal(r.crownChainWritesApproved,false);assert.equal(r.publicObservations,0);assert.equal(r.counterpartyReportedAssetId,2197274275635);
});
test("any fake blockchain certification or unreviewed economic value is rejected",()=>{
  const f=fixture();f.measures[7].value=1;assert.throws(()=>validateFeed(f));f.measures[7].value=null;f.knowindex.live_asset_verified=true;assert.throws(()=>validateFeed(f));
});
test("read-only connector uses allowlisted HTTPS GET and cannot write",async()=>{
  let calls=0;
  const result=await inspectFeed(async (uri,options)=>{
    calls++;assert.equal(uri,"https://worldcafe.holytemples.org/knowindex.json");assert.equal(options.method,"GET");return {ok:true,status:200,headers:{get:()=>"application/json"},text:async()=>JSON.stringify(fixture())};
  });
  assert.equal(calls,1);assert.equal(result.permittedAction,"read_only_review");
});
