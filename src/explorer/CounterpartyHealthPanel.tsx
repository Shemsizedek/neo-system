import {useEffect, useState} from 'react'
import {CounterpartyHealthAdapter} from './counterpartyHealthAdapter'
import type {CounterpartyHealth} from './counterpartyHealthAdapter'

/** Independent mainnet health. Never combines XChain testnet and Counterparty balances. */
export function CounterpartyHealthPanel() {
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState<CounterpartyHealth | null>(null)
  const [message, setMessage] = useState('Checking Counterparty mainnet status...')
  useEffect(() => {
    const controller = new AbortController()
    setResult(null)
    setMessage('Checking Counterparty mainnet status...')
    new CounterpartyHealthAdapter().read(controller.signal).then(value => {
      if (controller.signal.aborted) return
      setResult(value)
      setMessage(value.readiness === 'ready' ? 'Counterparty reports ready' :
        value.readiness === 'lagging' ? 'Counterparty is not ready or is catching up' : 'Readiness unconfirmed')
    }).catch(() => {
      if (!controller.signal.aborted) setMessage('Counterparty status unavailable; no readiness claim can be made.')
    })
    return () => controller.abort()
  }, [revision])
  return <section className="card explorer-panel" aria-label="Counterparty Bitcoin mainnet status">
    <div className="explorer-panel-title"><div><span>NEO Core - Counterparty</span><h3>Bitcoin mainnet health</h3></div><em>READ ONLY</em></div>
    <p>Independent Counterparty Core API v2 readiness check. XChain testnet records are never used as Counterparty balances, treasury, ownership, or settlement evidence.</p>
    <div className="explorer-actions"><button type="button" onClick={() => setRevision(n => n + 1)}>Refresh Counterparty status</button></div>
    <p role="status">{message}</p>
    {result && <div><small>Source: <a href={result.source} target="_blank" rel="noreferrer">Counterparty Core API v2</a> - observed {new Date(result.observedAt).toLocaleString()}</small>
      <p>Bitcoin height: {result.bitcoinHeight ?? 'unavailable'} | Counterparty height: {result.counterpartyHeight ?? 'unavailable'} | Ledger: {result.ledgerState ?? 'unavailable'}</p>
    </div>}
  </section>
}
