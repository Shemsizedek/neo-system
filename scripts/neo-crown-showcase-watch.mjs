// NEO Crown NCC-017: approved new-asset creation -> automatic Layer 3 staging.
// This is a batch reconciliation entrypoint, never a wallet signer or a public webhook.
import {runNeoShowcaseBatch} from '../server/crown-metadata/neo-showcase-batch.mjs';

const flag=process.argv[2]??'--inspect';
const modes={'--inspect':'inspect','--stage-confirmed':'stage-confirmed'};
if(!Object.hasOwn(modes,flag))throw Error('usage: node scripts/neo-crown-showcase-watch.mjs --inspect|--stage-confirmed');
const result=await runNeoShowcaseBatch({mode:modes[flag]});
console.log(JSON.stringify(result));
if(result.blocked>0)process.exitCode=1;
