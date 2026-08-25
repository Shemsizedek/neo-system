const modes = [
  'STANDARD', 'NOOLOGICAL', 'INDIGENOUS', 'HISTORICAL', 'NATURE',
  'SCHOLARLY', 'FACTOLOGY', 'GEOGRAPHIC', 'BITCOIN', 'COUNTERPARTY', 'DEEP SEARCH'
];

const endpoints = {
  wikipedia: 'https://en.wikipedia.org/w/api.php',
  openAlex: 'https://api.openalex.org/works',
  archive: 'https://archive.org/advancedsearch.php',
  bitcoin: 'https://mempool.space/api',
  counterparty: 'https://api.counterparty.io:4000/v2'
};

const nav = document.getElementById('modeNav');
const activeMode = document.getElementById('activeMode');
const resultCount = document.getElementById('resultCount');
const results = document.getElementById('results');
const knowledgeCard = document.getElementById('knowledgeCard');
const apiStatus = document.getElementById('apiStatus');
const btcValue = document.getElementById('btcValue');
const xcpValue = document.getElementById('xcpValue');
const btcNetwork = document.getElementById('btcNetwork');
const xcpNetwork = document.getElementById('xcpNetwork');
let mode = 'STANDARD';

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}

function safeUrl(url) {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '#';
  } catch {
    return '#';
  }
}

function setMode(nextMode) {
  mode = nextMode;
  activeMode.textContent = nextMode;
  [...nav.children].forEach(button => button.classList.toggle('active', button.dataset.mode === nextMode));
}

modes.forEach(item => {
  const button = document.createElement('button');
  button.className = 'mode-button';
  button.dataset.mode = item;
  button.textContent = item;
  button.addEventListener('click', () => setMode(item));
  nav.appendChild(button);
});
setMode(mode);

async function fetchJson(url, timeoutMs = 9000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { headers: { accept: 'application/json' }, signal: controller.signal });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function searchWikipedia(query, limit = 7) {
  const params = new URLSearchParams({
    origin: '*', action: 'query', generator: 'search', gsrsearch: query,
    gsrlimit: String(limit), prop: 'extracts|info', inprop: 'url',
    exintro: '1', explaintext: '1', exsentences: '3', format: 'json'
  });
  const data = await fetchJson(`${endpoints.wikipedia}?${params}`);
  return Object.values(data?.query?.pages || {}).map(page => ({
    title: page.title,
    description: page.extract || 'Reference entry.',
    status: 'REFERENCE',
    source: 'Wikipedia',
    url: page.fullurl || `https://en.wikipedia.org/?curid=${page.pageid}`
  }));
}

async function searchOpenAlex(query, limit = 6) {
  const params = new URLSearchParams({ search: query, 'per-page': String(limit) });
  const data = await fetchJson(`${endpoints.openAlex}?${params}`);
  return (data?.results || []).map(work => ({
    title: work.display_name || work.title || 'Scholarly work',
    description: [work.publication_year, work.primary_location?.source?.display_name, work.authorships?.slice(0, 3).map(a => a.author?.display_name).filter(Boolean).join(', ')].filter(Boolean).join(' · '),
    status: work.is_retracted ? 'RETRACTED' : 'SCHOLARLY',
    source: 'OpenAlex',
    url: work.doi || work.primary_location?.landing_page_url || work.id
  }));
}

async function searchArchive(query, limit = 6) {
  const params = new URLSearchParams();
  params.set('q', query);
  ['identifier', 'title', 'description', 'creator', 'date'].forEach(field => params.append('fl[]', field));
  params.set('rows', String(limit));
  params.set('page', '1');
  params.set('output', 'json');
  const data = await fetchJson(`${endpoints.archive}?${params}`);
  return (data?.response?.docs || []).map(doc => ({
    title: doc.title || doc.identifier || 'Archive item',
    description: [Array.isArray(doc.creator) ? doc.creator.join(', ') : doc.creator, doc.date, Array.isArray(doc.description) ? doc.description[0] : doc.description].filter(Boolean).join(' · ').slice(0, 420),
    status: 'ARCHIVE',
    source: 'Internet Archive',
    url: `https://archive.org/details/${encodeURIComponent(doc.identifier)}`
  }));
}

async function searchKnowledge(query) {
  const calls = [];
  if (['SCHOLARLY', 'FACTOLOGY', 'NOOLOGICAL', 'STANDARD', 'NATURE', 'INDIGENOUS'].includes(mode)) calls.push(searchOpenAlex(query));
  if (['HISTORICAL', 'DEEP SEARCH', 'INDIGENOUS', 'STANDARD', 'FACTOLOGY'].includes(mode)) calls.push(searchArchive(query));
  calls.push(searchWikipedia(query));
  const settled = await Promise.allSettled(calls);
  const items = settled.flatMap(item => item.status === 'fulfilled' ? item.value : []);
  const failures = settled.filter(item => item.status === 'rejected').length;
  return { items: dedupe(items), failures };
}

function dedupe(items) {
  const seen = new Set();
  return items.filter(item => {
    const key = `${item.source}:${item.title}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 18);
}

function looksLikeBitcoinAddress(value) {
  return /^(bc1[ac-hj-np-z02-9]{20,}|[13][a-km-zA-HJ-NP-Z1-9]{20,})$/.test(value);
}

function looksLikeTxid(value) {
  return /^[a-fA-F0-9]{64}$/.test(value);
}

async function searchBitcoin(query) {
  const clean = query.trim();
  if (looksLikeTxid(clean)) {
    const tx = await fetchJson(`${endpoints.bitcoin}/tx/${clean}`);
    return [{
      title: `Bitcoin transaction ${clean.slice(0, 12)}…`,
      description: `Fee: ${tx.fee ?? '—'} sats · Size: ${tx.size ?? '—'} bytes · Confirmed: ${tx.status?.confirmed ? 'yes' : 'no'}`,
      status: tx.status?.confirmed ? 'CONFIRMED' : 'MEMPOOL',
      source: 'mempool.space',
      url: `https://mempool.space/tx/${clean}`
    }];
  }
  if (looksLikeBitcoinAddress(clean)) {
    const address = await fetchJson(`${endpoints.bitcoin}/address/${clean}`);
    const funded = address.chain_stats?.funded_txo_sum || 0;
    const spent = address.chain_stats?.spent_txo_sum || 0;
    const balance = funded - spent;
    return [{
      title: `Bitcoin address ${clean.slice(0, 14)}…`,
      description: `Confirmed balance: ${(balance / 1e8).toFixed(8)} BTC · Transactions: ${address.chain_stats?.tx_count ?? 0}`,
      status: 'ON-CHAIN',
      source: 'mempool.space',
      url: `https://mempool.space/address/${clean}`
    }];
  }
  const [fees, prices, knowledge] = await Promise.all([
    fetchJson(`${endpoints.bitcoin}/v1/fees/recommended`),
    fetchJson(`${endpoints.bitcoin}/v1/prices`),
    searchWikipedia(`Bitcoin ${clean}`, 5)
  ]);
  const market = {
    title: 'Bitcoin network live status',
    description: `Recommended fee: ${fees.halfHourFee ?? fees.fastestFee ?? '—'} sat/vB · BTC/USD: ${prices.USD ? `$${Number(prices.USD).toLocaleString()}` : '—'}`,
    status: 'LIVE', source: 'mempool.space', url: 'https://mempool.space/'
  };
  return [market, ...knowledge];
}

async function searchCounterparty(query) {
  const clean = query.trim();
  const server = await fetchJson(`${endpoints.counterparty}/`);
  const networkResult = {
    title: 'Counterparty Core live status',
    description: `Network: ${server.result?.network || 'mainnet'} · Counterparty height: ${server.result?.counterparty_height ?? '—'} · Ledger: ${server.result?.ledger_state || '—'}`,
    status: server.result?.server_ready ? 'LIVE' : 'SYNCING',
    source: 'Counterparty Core API',
    url: 'https://apidocs.counterparty.io/'
  };

  if (looksLikeBitcoinAddress(clean)) {
    const balances = await fetchJson(`${endpoints.counterparty}/addresses/${encodeURIComponent(clean)}/balances`);
    const rows = (balances.result || []).slice(0, 12).map(balance => ({
      title: `${balance.asset || 'Asset'} balance`,
      description: `Quantity: ${balance.quantity_normalized ?? balance.quantity ?? '—'} · Address: ${clean}`,
      status: 'ON-CHAIN', source: 'Counterparty Core API',
      url: `https://tokenscan.io/address/${encodeURIComponent(clean)}`
    }));
    return [networkResult, ...rows];
  }

  const assetName = clean.toUpperCase();
  if (/^[A-Z][A-Z0-9._-]{2,30}$/.test(assetName)) {
    try {
      const asset = await fetchJson(`${endpoints.counterparty}/assets/${encodeURIComponent(assetName)}`);
      const info = asset.result || {};
      return [networkResult, {
        title: `${assetName} — Counterparty asset`,
        description: `Issuer: ${info.issuer || info.owner || '—'} · Supply: ${info.supply_normalized ?? info.supply ?? '—'} · Divisible: ${String(info.divisible ?? '—')} · Locked: ${String(info.locked ?? '—')}`,
        status: 'ON-CHAIN', source: 'Counterparty Core API',
        url: `https://tokenscan.io/asset/${encodeURIComponent(assetName)}`
      }];
    } catch {
      // Fall through to knowledge search while preserving live network status.
    }
  }

  const knowledge = await searchWikipedia(`Counterparty protocol ${clean}`, 5);
  return [networkResult, ...knowledge];
}

function renderItems(items, failures = 0) {
  results.innerHTML = '';
  if (!items.length) {
    results.innerHTML = '<article class="result"><h4>No live results returned.</h4><p>Try a broader query or another search mode. Noogle does not fabricate missing results.</p></article>';
    resultCount.textContent = '0 results';
    return;
  }
  items.forEach(item => {
    const article = document.createElement('article');
    article.className = 'result';
    const href = safeUrl(item.url);
    article.innerHTML = `
      <h4>${href !== '#' ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a>` : escapeHtml(item.title)}</h4>
      <p>${escapeHtml(item.description || 'No description supplied by source.')}</p>
      <div class="result-meta">
        <span class="badge">${escapeHtml(item.status || 'SOURCE')}</span>
        <span class="badge">${escapeHtml(item.source || 'External source')}</span>
      </div>`;
    results.appendChild(article);
  });
  resultCount.textContent = `${items.length} results${failures ? ` · ${failures} source unavailable` : ''}`;
}

async function renderSearch(query) {
  const cleanQuery = query.trim();
  if (!cleanQuery) return;
  results.innerHTML = '<article class="result loading"><h4>Searching live sources…</h4><p>Noogle is querying available public APIs and preserving source provenance.</p></article>';
  resultCount.textContent = 'searching…';
  apiStatus.textContent = 'LIVE QUERY';

  try {
    let payload;
    if (mode === 'BITCOIN') payload = { items: await searchBitcoin(cleanQuery), failures: 0 };
    else if (mode === 'COUNTERPARTY') payload = { items: await searchCounterparty(cleanQuery), failures: 0 };
    else payload = await searchKnowledge(cleanQuery);
    renderItems(payload.items, payload.failures);
    knowledgeCard.innerHTML = `
      <dl>
        <dt>Subject</dt><dd>${escapeHtml(cleanQuery)}</dd>
        <dt>Mode</dt><dd>${escapeHtml(mode)}</dd>
        <dt>Status</dt><dd>Live public-source query</dd>
        <dt>Evidence</dt><dd>Source-specific; inspect each result</dd>
        <dt>Provenance</dt><dd>Displayed per result</dd>
        <dt>Factology</dt><dd>Reference, scholarly, archive and on-chain classes remain distinct</dd>
      </dl>`;
    apiStatus.textContent = 'ONLINE';
  } catch (error) {
    results.innerHTML = `<article class="result error"><h4>Live source unavailable</h4><p>${escapeHtml(error.message || 'The upstream API did not respond.')}</p></article>`;
    resultCount.textContent = 'source error';
    apiStatus.textContent = 'DEGRADED';
  }
}

function connectForm(formId, inputId) {
  const form = document.getElementById(formId);
  const input = document.getElementById(inputId);
  form.addEventListener('submit', event => {
    event.preventDefault();
    renderSearch(input.value);
  });
}

connectForm('searchForm', 'queryInput');
connectForm('heroForm', 'heroInput');

document.getElementById('commandButton').addEventListener('click', () => {
  knowledgeCard.innerHTML = `
    <p><strong>Omnitrix Command Intelligence</strong></p>
    <p>Noogle now performs live read-only queries against public knowledge, Bitcoin and Counterparty APIs. Wallet signing, transaction broadcast, privileged crawling and miner hardware control remain disabled until explicit audited adapters are connected.</p>`;
});

async function hydrateLiveStatus() {
  const tasks = [
    fetchJson(`${endpoints.bitcoin}/v1/prices`).then(data => {
      btcValue.textContent = data.USD ? `$${Number(data.USD).toLocaleString()}` : 'LIVE';
      btcNetwork.textContent = 'mempool.space';
    }),
    fetchJson(`${endpoints.counterparty}/`).then(data => {
      xcpValue.textContent = `Block ${data.result?.counterparty_height ?? '—'}`;
      xcpNetwork.textContent = data.result?.ledger_state || 'Connected';
    })
  ];
  const settled = await Promise.allSettled(tasks);
  apiStatus.textContent = settled.every(item => item.status === 'fulfilled') ? 'ONLINE' : 'DEGRADED';
}

results.innerHTML = '<article class="result"><h4>Noogle live search is ready.</h4><p>Choose a mode and enter a query. Standard knowledge modes federate public reference, scholarly and archival sources; Bitcoin and Counterparty modes query their live networks directly.</p></article>';
hydrateLiveStatus();
