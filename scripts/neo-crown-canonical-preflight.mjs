import {inspectNeoCanonicalActivation} from '../edge/neo-canonical-metadata/preflight.mjs';
const result=await inspectNeoCanonicalActivation();
console.log(JSON.stringify(result,null,2));
if(result.canonical.status!=='MATCHES_APPROVED')process.exitCode=2;
