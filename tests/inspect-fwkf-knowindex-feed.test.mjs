import test from "node:test";
import assert from "node:assert/strict";
import {validateFeed,inspectFeed} from "../scripts/inspect-fwkf-knowindex-feed.mjs";
const names=["Registered resources","Source attribution","Publication permissions","Resource availability","Preservation","Community participation","Learning outcomes","Knowledge economy"];
function fixture(){return {title:"Free World Knowledge Index",publisher:"Free World Knowledge Foundation",version:"1.0",status:"definitions only",website:"https://worldcafe.holytemples.org/knowledge.html",library:"https://holytemples.org/world-library/",indicators:names.map(name=>({name,description:"Public method",value:null}))};}
test("public definitions are readable with all values unreported",()=>{const r=validateFeed(fixture());assert.equal(r.definitions,8);assert.equal(r.measurementsPublished,0);assert.equal(r.writesAuthorized,false)});
test("rejects fabricated values and investor/token fields",()=>{const f=fixture();f.indicators[7].value=50;assert.throws(()=>validateFeed(f));f.indicators[7].value=null;f.token={supply:1000};assert.throws(()=>validateFeed(f));});
test("only allowlisted HTTPS GET; never writes",async()=>{let calls=0;const out=await inspectFeed(async (url,opts)=>{calls++;assert.equal(url,"https://worldcafe.holytemples.org/knowledge-index.json");assert.equal(opts.method,"GET");return {ok:true,headers:{get:()=>"application/json"},text:async()=>JSON.stringify(fixture())};});assert.equal(calls,1);assert.equal(out.action,"read_only_review");});
