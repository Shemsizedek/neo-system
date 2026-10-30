/**
 * Project 144 read-only deployment diagnostics.
 * No API keys, transactions, wallets, writes, or signing.
 * Run only from an environment with network access:
 *   node scripts/neo-explorer-public-smoke.mjs
 */
const SITE = 'https://neo-bitcoin-counterparty-explorer.onrender.com/'
const ORIGIN = new URL(SITE).origin
const REQUESTS = [
  {id:'explorer', url: SITE + '?route=explorer'},
  {id:'counterparty', url:'https://api.counterparty.io:4000/v2/'},
  {id:'xchain-tbtc', url:'https://explorer.xchain.io/TBTC/api/status'},
]
const abort = (timeoutMs = 20000) => AbortSignal.timeout(timeoutMs)
const fail = (reason) => {throw new Error(reason)}
function corsAllowed(response) {
  const allowed = response.headers.get('access-control-allow-origin')
  return allowed === '*' || allowed === ORIGIN
}
function integer(value) {return Number.isSafeInteger(value) && value > 0}
function ensureCounterparty(result, response) {
  const v = result?.result
  if (!v || v.network !== 'mainnet') fail('Counterparty network not verified')
  if (v.server_ready !== true || v.ledger_state !== 'Following') fail('Counterparty API not ready')
  if (!integer(v.backend_height) || !integer(v.counterparty_height)) fail('Counterparty heights invalid')
  if (v.counterparty_height < v.backend_height - 1) fail('Counterparty API lagging')
  if (response.headers.get('x-counterparty-ready')?.toLowerCase() === 'false') fail('Counterparty readiness header refused')
  console.log('PASS Counterparty mainnet ready; heights:',v.backend_height,v.counterparty_height)
}
function ensureXchain(result) {
  const v = result?.data
  if (!v || typeof v !== 'object') fail('XChain status envelope invalid')
  if (!v.available?.TBTC || !integer(v.last_block?.TBTC)) fail('XChain Bitcoin testnet height not available')
  if (v.stale?.TBTC !== false || v.replica_halted?.TBTC !== false) fail('XChain testnet freshness cannot be confirmed')
  console.log('PASS XChain TBTC testnet status, block',v.last_block.TBTC)
}
async function main() {
  const outcome = {}
  for (const req of REQUESTS) {
    const resp = await fetch(req.url,{
      headers: {Accept:req.id === 'explorer' ? 'text/html' : 'application/json',Origin:ORIGIN},
      signal:abort(), redirect:'error', cache:'no-store',
    })
    if (!resp.ok) fail(req.id + ' HTTP ' + resp.status)
    if (req.id === 'explorer') {
      const html = await resp.text()
      if (!/<div[^>]+id=["']root["']/.test(html) || !/script[^>]+src=/.test(html)) fail('Explorer HTML bundle missing')
      console.log('PASS Explorer public HTML and script bundle reference')
    } else {
      if (!corsAllowed(resp)) fail(req.id + ' API lacks CORS permission for '+ORIGIN)
      const json = await resp.json()
      if (req.id === 'counterparty') ensureCounterparty(json,resp)
      if (req.id === 'xchain-tbtc') ensureXchain(json)
    }
    outcome[req.id] = 'pass'
  }
  console.log('PASS all read-only gates:',Object.keys(outcome).join(', '))
}
main().catch(e=>{console.error('FAIL NEO Explorer public smoke:',e.message);process.exitCode=1})
