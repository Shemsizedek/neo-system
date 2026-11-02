// Read-only public Knowledge Index definitions validator. No Crown Chain or token writes.
const SOURCE_URL = "https://worldcafe.holytemples.org/knowledge-index.json";
const EXPECTED = [
 "Registered resources","Source attribution","Publication permissions",
 "Resource availability","Preservation","Community participation",
 "Learning outcomes","Knowledge economy"
];
export function validateFeed(feed) {
 if (!feed || typeof feed!=="object" || Array.isArray(feed)) throw Error("Invalid data");
 if (feed.version!=="1.0" || feed.title!=="Free World Knowledge Index" || feed.publisher!=="Free World Knowledge Foundation" || feed.status!=="definitions only") throw Error("Unexpected public index version");
 if (feed.website!=="https://worldcafe.holytemples.org/knowledge.html" || feed.library!=="https://holytemples.org/world-library/") throw Error("Public URL allowlist mismatch");
 if (!Array.isArray(feed.indicators)||feed.indicators.length!==8) throw Error("Expected eight index definitions");
 for (let i=0;i<8;i++) {const x=feed.indicators[i];if(x?.name!==EXPECTED[i] || typeof x.description!=="string" || !x.description.trim() || x.value!==null)throw Error("Unexpected observation or index definition");}
 const forbidden=/issuer|owner|private|secret|wallet|investor|token|asset_id|bitcoin|crown_chain|production_writes|sponsor|partner|email|phone/i;
 function rejectPrivateFields(v){if(!v||typeof v!=="object")return;for(const [key,item] of Object.entries(v)){if(forbidden.test(key))throw Error("Unexpected private or investor field in public knowledge index");rejectPrivateFields(item);}}
 rejectPrivateFields(feed);
 return Object.freeze({source:SOURCE_URL,scope:"public_definitions",definitions:EXPECTED.length,measurementsPublished:0,writesAuthorized:false,action:"read_only_review"});
}
export async function inspectFeed(fetcher=fetch) {
 const r=await fetcher(SOURCE_URL,{method:"GET",redirect:"error",signal:AbortSignal.timeout(10000),headers:{"accept":"application/json"}});
 if(!r.ok)throw Error("Knowledge index fetch failed: "+r.status);
 if(!(r.headers.get("content-type")||"").includes("application/json"))throw Error("Unexpected content type");
 const body=await r.text();if(body.length>32768)throw Error("Data exceeds size limit");
 return validateFeed(JSON.parse(body));
}
if (process.argv[1] && import.meta.url === new URL("file://" + process.argv[1]).href) {
 inspectFeed().then(x=>console.log(JSON.stringify(x,null,2))).catch(e=>{console.error(String(e));process.exitCode=1;});
}
