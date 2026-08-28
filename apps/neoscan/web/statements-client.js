// NEO Statements service client compatibility layer.
// Keeps the public browser credential-free and consumes the normalized
// neo.statement.service.v1 envelope returned by the server/Worker.
async function scanStatementService(q){
  const cfg=window.NEO_SCAN_CONFIG||{};
  const base=String(cfg.statementsServiceUrl||'').replace(/\/$/,'');
  if(!base)throw new Error('service-not-configured');

  const timeout=Math.max(1000,Number(cfg.statementsServiceTimeoutMs||8000));
  const response=await fetch(`${base}/v1/statements?address=${encodeURIComponent(q)}`,{
    headers:{accept:'application/json'},
    signal:AbortSignal.timeout(timeout)
  });
  if(!response.ok)throw new Error(`statement-service-${response.status}`);

  const envelope=await response.json();
  const statement=envelope?.data||envelope;
  if(!statement?.sources)throw new Error('invalid-statement-envelope');

  const sources=statement.sources;
  const verified=(source)=>source?.status==='verified';
  const entries=(source)=>Array.isArray(source?.entries)?source.entries:[];
  const amount=(entry)=>entry&&entry.amount!==undefined&&entry.unit?`${entry.amount} ${entry.unit}`:null;

  const bitcoinEntries=entries(sources.bitcoin);
  const counterpartyEntries=entries(sources.counterparty);
  const cesEntries=entries(sources.ces);
  const cesBalance=cesEntries.find(entry=>entry?.recordType==='balance');
  const cesTransactions=cesEntries.filter(entry=>entry?.recordType!=='balance');

  const bitcoin=verified(sources.bitcoin)
    ? (amount(bitcoinEntries[0])||`Verified · ${bitcoinEntries.length} record${bitcoinEntries.length===1?'':'s'}`)
    : 'Unavailable';
  const counterparty=verified(sources.counterparty)
    ? `${counterpartyEntries.length} verified asset balance${counterpartyEntries.length===1?'':'s'}`
    : 'Unavailable';
  const ces=verified(sources.ces)
    ? `${amount(cesBalance)||'Verified balance'} · ${cesTransactions.length} transaction${cesTransactions.length===1?'':'s'}`
    : 'Unavailable · CES connector not authenticated/configured';

  const renderRows=window.rows;
  if(typeof renderRows!=='function')throw new Error('statement-renderer-unavailable');
  document.getElementById('result').innerHTML=`${renderRows('NEO Statement — Service Reconciliation',[
    ['Account',statement.account||q],
    ['Bitcoin',bitcoin],
    ['Counterparty',counterparty],
    ['CES',ces],
    ['Offline / off-book','Unavailable · attested source not supplied'],
    ['Reconciliation',statement.reconciliationStatus||'—'],
    ['Cross-ledger total',statement.consolidatedTotal==null?'Not computed — unlike units are never silently summed':statement.consolidatedTotal],
    ['Statement schema',statement.statementSchema||'neo.statement.v1'],
    ['Service schema',statement.schema||'neo.statement.service.v1'],
    ['Generated',statement.generatedAt||'—'],
    ['Request ID',envelope?.requestId||'—']
  ],'STATEMENT')}<div class="empty">Source mode: authenticated NEO Statements service. CES credentials remain server-side. Every ledger retains its native unit and provenance; no cross-ledger valuation is implied.</div>`;
}
