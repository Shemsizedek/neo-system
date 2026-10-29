import {useEffect, useState} from 'react'
import {XCHAIN_NETWORKS, XChainExplorerAdapter} from './xchainAdapter'
import type {XChainNetwork, XChainResult} from './xchainAdapter'

export function XChainPanel() {
  const [network, setNetwork] = useState<XChainNetwork>('TBTC')
  const [ticker, setTicker] = useState('XCHAIN')
  const [request, setRequest] = useState<{resource: 'status' | 'tokens'; query?: string; revision: number}>({resource: 'status', revision: 0})
  const [result, setResult] = useState<XChainResult | null>(null)
  const [state, setState] = useState('Loading XChain status…')
  useEffect(() => {
    const controller = new AbortController()
    setResult(null)
    setState('Loading XChain testnet data…')
    new XChainExplorerAdapter().read(network, request.resource, request.query, controller.signal).then(value => {
      if (controller.signal.aborted) return
      setResult(value)
      setState(value.freshness === 'live' ? 'Current testnet data' : value.freshness === 'stale' ? 'Stale testnet data' : 'Freshness unconfirmed')
    }).catch(() => {
      if (!controller.signal.aborted) setState('XChain is unavailable. Retry or open the explorer.')
    })
    return () => controller.abort()
  }, [network, request])
  return <section className="card explorer-panel" aria-label="XChain testnet connection">
    <div className="explorer-panel-title"><div><span>NEOChain • XChain Platform</span><h3>XChain testnet explorer</h3></div><em>TESTNET ONLY</em></div>
    <p>Explore XChain independently of Counterparty. Testnet tokens do not establish ownership, backing, or value of NOMNI or other production assets.</p>
    <form className="explorer-actions" onSubmit={event => {event.preventDefault(); setRequest(previous => ({resource: 'tokens', query: ticker.trim(), revision: previous.revision + 1}))}}>
      <label>Test network <select value={network} onChange={event => setNetwork(event.target.value as XChainNetwork)}>{XCHAIN_NETWORKS.map(code => <option key={code}>{code}</option>)}</select></label>
      <label>Token ticker <input value={ticker} onChange={event => setTicker(event.target.value)} maxLength={128} required pattern="[A-Za-z0-9_.-]{1,128}" /></label>
      <button type="submit">Look up token</button>
      <button type="button" onClick={() => setRequest(previous => ({resource: 'status', revision: previous.revision + 1}))}>Refresh status</button>
    </form>
    <p role="status">{state}</p>
    {result && <div><small>Source: <a href={result.source} target="_blank" rel="noreferrer">XChain explorer</a> • {new Date(result.observedAt).toLocaleString()} • {result.network}</small><pre style={{whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: '20rem', overflow: 'auto'}}>{JSON.stringify(result.data, null, 2)}</pre></div>}
    <div className="asset-links"><a href="https://explorer.xchain.io" target="_blank" rel="noreferrer">XChain explorer ↗</a><a href="https://wallet.xchain.io" target="_blank" rel="noreferrer">XChain wallet ↗</a><a href="https://docs.xchain.io" target="_blank" rel="noreferrer">Documentation ↗</a></div>
  </section>
}
