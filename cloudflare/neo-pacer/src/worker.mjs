const RAW='https://raw.githubusercontent.com/Shemsizedek/neo-system/main/data/neo-pacer';
const JSON_HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*','access-control-allow-headers':'content-type, mcp-protocol-version','access-control-allow-methods':'GET,POST,OPTIONS'};
const reply=(id,result)=>new Response(JSON.stringify({jsonrpc:'2.0',id,result}),{headers:JSON_HEADERS});
const err=(id,code,message)=>new Response(JSON.stringify({jsonrpc:'2.0',id,error:{code,message}}),{status:code===-32600?400:200,headers:JSON_HEADERS});
async function data(name){const r=await fetch(`${RAW}/${name}.json`,{cf:{cacheTtl:60,cacheEverything:true}});if(!r.ok)throw new Error(`GitHub backend unavailable: ${name}`);return r.json()}
const tools=[
 {name:'list_cases',title:'List NEO-PACER cases',description:'Use this when the user wants to review cases in NEO-PACER.',inputSchema:{type:'object',properties:{status:{type:'string'}},additionalProperties:false},annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false}},
 {name:'get_case',title:'Get NEO-PACER case',description:'Use this when the user wants the full registry summary for a specific NEO-PACER case.',inputSchema:{type:'object',properties:{case_no:{type:'string'}},required:['case_no'],additionalProperties:false},annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false}},
 {name:'search',title:'Search NEO-PACER',description:'Use this when the user wants to search NEO-PACER cases, evidence, or title instruments.',inputSchema:{type:'object',properties:{query:{type:'string'}},required:['query'],additionalProperties:false},annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false}},
 {name:'fetch',title:'Fetch NEO-PACER record',description:'Use this after search when the user wants a specific NEO-PACER case, evidence item, or title instrument.',inputSchema:{type:'object',properties:{id:{type:'string'}},required:['id'],additionalProperties:false},annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false}},
 {name:'get_title_chain',title:'Get NEO Title Auditor chain',description:'Use this when the user wants the title-chain audit for a case.',inputSchema:{type:'object',properties:{case_no:{type:'string'}},required:['case_no'],additionalProperties:false},annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false}}
];
async function callTool(name,args={}){
 const [cases,evidence,title]=await Promise.all([data('cases'),data('evidence'),data('title-chain')]);
 if(name==='list_cases'){const rows=args.status?cases.filter(x=>x.status===args.status):cases;return {content:[{type:'text',text:`Found ${rows.length} NEO-PACER case(s).`}],structuredContent:{cases:rows}}}
 if(name==='get_case'){const c=cases.find(x=>x.case_no===args.case_no);if(!c)throw new Error(`Case not found: ${args.case_no}`);return {content:[{type:'text',text:`${c.case_no}: ${c.caption}`}],structuredContent:{case:c,evidence:evidence.filter(x=>x.case_no===c.case_no),title_chain:title.filter(x=>x.case_no===c.case_no)}}}
 if(name==='get_title_chain'){const rows=title.filter(x=>x.case_no===args.case_no);return {content:[{type:'text',text:`Found ${rows.length} title-chain node(s).`}],structuredContent:{case_no:args.case_no,title_chain:rows}}}
 if(name==='search'){const q=String(args.query||'').toLowerCase();const results=[];for(const c of cases)if(JSON.stringify(c).toLowerCase().includes(q))results.push({id:c.case_no,title:c.caption,text:c.summary||'',url:`neo-pacer://case/${encodeURIComponent(c.case_no)}`});for(const e of evidence)if(JSON.stringify(e).toLowerCase().includes(q))results.push({id:e.evidence_id,title:e.title,text:`${e.case_no} — ${e.notes||''}`,url:`neo-pacer://evidence/${encodeURIComponent(e.evidence_id)}`});for(const n of title)if(JSON.stringify(n).toLowerCase().includes(q))results.push({id:`${n.case_no}-TITLE-${n.seq}`,title:n.instrument_name,text:`${n.node_type} — ${n.notes||''}`,url:`neo-pacer://title/${encodeURIComponent(n.case_no)}/${n.seq}`});return {content:[{type:'text',text:`Found ${results.length} matching record(s).`}],structuredContent:{results}}}
 if(name==='fetch'){const c=cases.find(x=>x.case_no===args.id);if(c)return {content:[{type:'text',text:`${c.case_no}: ${c.caption}`}],structuredContent:{id:c.case_no,title:c.caption,text:c.summary||'',metadata:c}};const e=evidence.find(x=>x.evidence_id===args.id);if(e)return {content:[{type:'text',text:`${e.evidence_id}: ${e.title}`}],structuredContent:{id:e.evidence_id,title:e.title,text:e.notes||'',metadata:e}};const m=String(args.id).match(/^(NEO-.+)-TITLE-(\d+)$/);if(m){const n=title.find(x=>x.case_no===m[1]&&x.seq===Number(m[2]));if(n)return {content:[{type:'text',text:n.instrument_name}],structuredContent:{id:args.id,title:n.instrument_name,text:n.notes||'',metadata:n}}}throw new Error(`Record not found: ${args.id}`)}
 throw new Error(`Unknown tool: ${name}`)
}
export default {async fetch(req){
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:JSON_HEADERS});
 const u=new URL(req.url);if(u.pathname==='/health')return new Response(JSON.stringify({ok:true,service:'neo-pacer-mcp',backend:'github',frontend:'github-pages'}),{headers:JSON_HEADERS});
 if(u.pathname!=='/mcp')return new Response('Not found',{status:404});
 if(req.method==='GET')return new Response(JSON.stringify({name:'NEO-PACER',transport:'streamable-http',tools:tools.map(t=>t.name)}),{headers:JSON_HEADERS});
 if(req.method!=='POST')return new Response('Method not allowed',{status:405});
 let body;try{body=await req.json()}catch{return err(null,-32700,'Parse error')}
 const {id=null,method,params={}}=body||{};
 if(method==='notifications/initialized')return new Response(null,{status:202,headers:JSON_HEADERS});
 if(method==='initialize')return reply(id,{protocolVersion:params.protocolVersion||'2025-06-18',capabilities:{tools:{listChanged:false}},serverInfo:{name:'neo-pacer',version:'1.2.0'},instructions:'Evidence-first NEO-PACER registry. Preserve original records and distinguish allegation, corroboration, authentication, legal effect, and jurisdiction.'});
 if(method==='tools/list')return reply(id,{tools});
 if(method==='tools/call'){try{return reply(id,await callTool(params.name,params.arguments||{}))}catch(e){return reply(id,{content:[{type:'text',text:String(e.message||e)}],isError:true})}}
 if(method==='ping')return reply(id,{});
 return err(id,-32601,`Method not found: ${method}`)
}};
