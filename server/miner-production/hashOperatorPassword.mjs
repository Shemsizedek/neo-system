import {hashOperatorPassword} from './operatorAuth.mjs'

const password=process.argv[2]||''
if(!password){console.error('Usage: npm run miner:operator:hash -- "your-long-passphrase"');process.exit(1)}
try{console.log(hashOperatorPassword(password))}catch(error){console.error(error.message);process.exit(1)}
