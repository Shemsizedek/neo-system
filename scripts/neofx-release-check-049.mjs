#!/usr/bin/env node
// NEO-FX-049: production promotion must be an explicit, evidence-based decision.
import { readFileSync, existsSync } from 'node:fs';
const errors=[];
const file=p=>{try{return readFileSync(p,'utf8')}catch{errors.push('missing:'+p);return ''}};
const ci=file('.github/workflows/neofx-release-certification.yml');
const build=file('cloudbuild.neo-edge.yaml');
const docker=file('deploy/neo-edge/Dockerfile');
const router=file('server/neo-edge/production.mjs');
const ui=file('apps/neo-exchange/src/main.jsx');
for(const [name,ok] of [
 ['CI browser source',ci.includes('apps/neo-exchange')],
 ['Docker React build',docker.includes('apps/neo-exchange/dist')],
 ['Cloud Run service',build.includes('neo-edge')],
 ['Cloud Run region',build.includes('us-central1')],
 ['NEO FX market API router',router.includes("host==='neofx.holytemples.org'")],
 ['UX explicitly blocks unverified order review',ui.includes('Orders are disabled pending authorized paper brokerage enrollment')],
]){if(!ok)errors.push('missing_check:'+name);}
if(build.includes('--allow-unauthenticated')) console.log('INFO: public UI is unauthenticated; private OAuth endpoints must have app-layer auth');
if(!existsSync('apps/neo-exchange/dist/index.html'))errors.push('missing_react_build');
const liveRequest=process.env.NEOFX_RELEASE_TO_PROD==='true';
if(liveRequest){
 for(const key of ['NEOFX_CI_RUN_VERIFIED','NEOFX_SHARED_EDGE_REGRESSION_VERIFIED','NEOFX_CLOUD_BUILD_APPROVED','NEOFX_ROLLBACK_REVISION_RECORDED']){
   if(process.env[key]!=='true')errors.push('missing_release_evidence:'+key);
 }
}
if(errors.length){console.error('NEO FX release HOLD\n'+errors.map(s=>' - '+s).join('\n'));process.exit(1);}
console.log(liveRequest?'NEO FX release checks: evidence flags present (verify actual evidence externally)':'NEO FX preflight PASSED (no deploy authorized)');
