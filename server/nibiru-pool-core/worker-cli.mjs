import {onboardWorker} from './workerOnboarding.mjs'

const args=Object.fromEntries(process.argv.slice(2).map(item=>{
  const i=item.indexOf('=')
  return i>0?[item.slice(0,i).replace(/^--/,''),item.slice(i+1)]:[item.replace(/^--/,''),true]
}))

if(!args.worker||!args.member){
  process.stderr.write('usage: node server/nibiru-pool-core/worker-cli.mjs --worker=<worker-id> --member=<member-id> [--pool=<pool-id>] [--db=<sqlite-path>]\n')
  process.exitCode=2
}else{
  const result=onboardWorker({poolId:String(args.pool||process.env.NIBIRU_POOL_ID||'world-mint-genesis'),workerId:String(args.worker),memberId:String(args.member),dbPath:String(args.db||process.env.NEO_MINER_DB_PATH||'./data/neo-miner.sqlite')})
  process.stdout.write(`${JSON.stringify({...result,warning:'Store this secret securely. It is shown once and is not recoverable from the credential record.'},null,2)}\n`)
}
