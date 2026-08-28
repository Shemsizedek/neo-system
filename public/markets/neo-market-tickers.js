class NEOMarketTicker extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.timer = null;
  }

  connectedCallback() {
    this.market = (this.getAttribute('market') || 'fx').toLowerCase();
    this.endpoint = this.resolveEndpoint();
    this.interval = Math.max(10000, Number(this.getAttribute('refresh-ms')) || 30000);
    this.renderShell();
    this.refresh();
    this.timer = setInterval(() => this.refresh(), this.interval);
  }

  disconnectedCallback() {
    if (this.timer) clearInterval(this.timer);
  }

  resolveEndpoint() {
    const explicit = this.getAttribute('endpoint');
    const path = `/api/markets/tickers?market=${encodeURIComponent(this.market)}`;
    const attrBase = this.getAttribute('api-base');
    const globalBase = window.NEO_MARKETS_API_BASE;
    let storedBase = '';
    let primeBase = '';

    try { storedBase = localStorage.getItem('neoMarketsApiBase') || ''; } catch {}
    try {
      const prime = JSON.parse(localStorage.getItem('neoPrimeState.v2') || '{}');
      if (prime?.endpoint) primeBase = new URL(prime.endpoint).origin;
    } catch {}

    const base = String(attrBase || globalBase || storedBase || primeBase || '').replace(/\/$/, '');
    if (base) return `${base}${path}`;
    return explicit || path;
  }

  get definition() {
    if (this.market === 'dex') {
      return {
        code: 'NEODEX',
        label: 'NEO DEX',
        description: 'Executable Counterparty market activity',
        pairs: ['NOMNI/XCP', 'XCP/BTC', 'NOMNI/BTC']
      };
    }

    return {
      code: 'NEOFX',
      label: 'NEOfx',
      description: 'Reference FX and cross-asset pricing',
      pairs: ['BTC/USD', 'XCP/USD', 'NOMNI/USD', 'NOMNI/BTC']
    };
  }

  renderShell() {
    const d = this.definition;
    this.shadowRoot.innerHTML = `
      <style>
        :host{display:block;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#eafff0}
        .ticker{border:1px solid #1d3a28;border-radius:14px;background:linear-gradient(180deg,rgba(11,23,17,.98),rgba(4,9,6,.98));overflow:hidden}
        .head{display:flex;justify-content:space-between;gap:14px;align-items:center;padding:12px 14px;border-bottom:1px solid #173222}
        .brand{display:flex;align-items:center;gap:10px}.code{font-size:11px;letter-spacing:.16em;color:#65ff8f;font-weight:800}.label{font-weight:800}.desc{font-size:11px;color:#86a792;margin-top:2px}
        .state{font-size:10px;letter-spacing:.12em;color:#86a792;text-transform:uppercase}.state.live{color:#65ff8f}.state.stale{color:#ffd166}.state.error{color:#ff7b84}
        .rail{display:flex;gap:0;overflow:auto;scrollbar-width:none}.rail::-webkit-scrollbar{display:none}.item{min-width:176px;padding:12px 14px;border-right:1px solid #142d1e}.item:last-child{border-right:none}
        .pair{font-size:11px;color:#9dcfb0;font-weight:800;letter-spacing:.06em}.price{font-size:18px;font-weight:800;margin-top:4px}.meta{font-size:10px;color:#718d79;margin-top:3px}.up{color:#65ff8f}.down{color:#ff7b84}.flat{color:#b8cabb}.empty{padding:14px;color:#86a792;font-size:12px}
      </style>
      <section class="ticker" role="region" aria-label="${d.label} market ticker">
        <div class="head">
          <div class="brand"><div><div class="code">${d.code}</div><div class="label">${d.label}</div><div class="desc">${d.description}</div></div></div>
          <div id="state" class="state">CONNECTING</div>
        </div>
        <div id="rail" class="rail"><div class="empty">Loading market data…</div></div>
      </section>`;
  }

  async fetchJson(url) {
    const response = await fetch(url, { headers: { accept: 'application/json' }, cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status} from ${new URL(url, location.href).hostname}`);
    return response.json();
  }

  positive(value) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  orderQuantity(order, side) {
    return this.positive(order?.[`${side}_quantity_normalized`] ?? order?.[`${side}_remaining_normalized`] ?? order?.[`${side}_quantity`] ?? order?.[`${side}_remaining`]);
  }

  dexBook(orders, pair) {
    const [base, quote] = pair.split('/');
    const bids = [];
    const asks = [];
    for (const order of Array.isArray(orders) ? orders : []) {
      if (String(order?.status || '').toLowerCase() !== 'open') continue;
      const giveAsset = String(order?.give_asset || '').toUpperCase();
      const getAsset = String(order?.get_asset || '').toUpperCase();
      const give = this.orderQuantity(order, 'give');
      const get = this.orderQuantity(order, 'get');
      if (!give || !get) continue;
      if (giveAsset === base && getAsset === quote) asks.push(get / give);
      if (giveAsset === quote && getAsset === base) bids.push(give / get);
    }
    const bid = bids.length ? Math.max(...bids) : null;
    const ask = asks.length ? Math.min(...asks) : null;
    const mid = bid !== null && ask !== null ? (bid + ask) / 2 : bid ?? ask;
    return { bid, ask, mid, bidCount: bids.length, askCount: asks.length };
  }

  browserQuote(pair, values = {}) {
    const [base, quote] = pair.split('/');
    return { pair, base, quote, timestamp: new Date().toISOString(), status: 'live', change24h: 0, ...values };
  }

  unavailable(pair, source, reason) {
    return this.browserQuote(pair, { bid: null, ask: null, mid: null, last: null, source, status: 'unavailable', confidence: 'unavailable', reason });
  }

  async browserFallback() {
    const endpoints = {
      btc: 'https://mempool.space/api/v1/prices',
      xcp: 'https://api.coingecko.com/api/v3/simple/price?ids=counterparty&vs_currencies=usd,btc&include_24hr_change=true',
      dex: 'https://api.counterparty.io:4000/v2/orders?status=open&limit=1000'
    };
    const [btcResult, xcpResult, dexResult] = await Promise.allSettled([
      this.fetchJson(endpoints.btc),
      this.fetchJson(endpoints.xcp),
      this.fetchJson(endpoints.dex)
    ]);

    const btc = btcResult.status === 'fulfilled' ? btcResult.value : null;
    const xcp = xcpResult.status === 'fulfilled' ? xcpResult.value?.counterparty : null;
    const orders = dexResult.status === 'fulfilled' ? (dexResult.value?.result || []) : [];
    const btcUsd = this.positive(btc?.USD ?? btc?.usd ?? btc?.price_usd);
    const xcpUsd = this.positive(xcp?.usd);
    const xcpBtc = this.positive(xcp?.btc);
    const xcpChange = Number(xcp?.usd_24h_change ?? 0);

    const books = Object.fromEntries(['NOMNI/XCP', 'XCP/BTC', 'NOMNI/BTC'].map(pair => [pair, this.dexBook(orders, pair)]));

    if (this.market === 'dex') {
      return {
        market: 'dex',
        code: 'NEODEX',
        sourceMode: 'browser-public-fallback',
        quotes: ['NOMNI/XCP', 'XCP/BTC', 'NOMNI/BTC'].map(pair => {
          const book = books[pair];
          if (book.mid === null) return this.unavailable(pair, 'Counterparty Core API v2 orders', dexResult.status === 'rejected' ? 'public DEX endpoint unavailable' : 'no executable open orders');
          return this.browserQuote(pair, {
            bid: book.bid,
            ask: book.ask,
            mid: book.mid,
            last: null,
            source: 'Counterparty Core API v2 orders',
            confidence: book.bid !== null && book.ask !== null ? 'two-sided-book' : 'one-sided-book',
            bidCount: book.bidCount,
            askCount: book.askCount,
            executable: true
          });
        })
      };
    }

    const nomniXcp = this.positive(books['NOMNI/XCP']?.mid);
    const directNomniBtc = this.positive(books['NOMNI/BTC']?.mid);
    const derivedNomniBtc = directNomniBtc ?? (nomniXcp && xcpBtc ? nomniXcp * xcpBtc : null);
    const nomniUsd = nomniXcp && xcpUsd ? nomniXcp * xcpUsd : (directNomniBtc && btcUsd ? directNomniBtc * btcUsd : null);

    return {
      market: 'fx',
      code: 'NEOFX',
      sourceMode: 'browser-public-fallback',
      quotes: [
        btcUsd ? this.browserQuote('BTC/USD', { last: btcUsd, mid: btcUsd, source: 'mempool.space', confidence: 'reference' }) : this.unavailable('BTC/USD', 'mempool.space', 'public BTC price unavailable'),
        xcpUsd ? this.browserQuote('XCP/USD', { last: xcpUsd, mid: xcpUsd, source: 'CoinGecko', confidence: 'reference', change24h: Number.isFinite(xcpChange) ? xcpChange : 0 }) : this.unavailable('XCP/USD', 'CoinGecko', 'public XCP price unavailable'),
        nomniUsd ? this.browserQuote('NOMNI/USD', { mid: nomniUsd, source: nomniXcp ? 'Counterparty DEX × CoinGecko XCP/USD' : 'Counterparty DEX × mempool.space BTC/USD', confidence: 'derived-from-dex' }) : this.unavailable('NOMNI/USD', 'NEOfx cross-rate', 'no defensible NOMNI DEX cross-rate'),
        derivedNomniBtc ? this.browserQuote('NOMNI/BTC', { mid: derivedNomniBtc, source: directNomniBtc ? 'Counterparty DEX' : 'Counterparty DEX × CoinGecko XCP/BTC', confidence: 'derived-from-dex' }) : this.unavailable('NOMNI/BTC', 'Counterparty DEX', 'no defensible NOMNI/BTC cross-rate')
      ]
    };
  }

  renderPayload(payload, mode = 'runtime') {
    const rail = this.shadowRoot.getElementById('rail');
    const state = this.shadowRoot.getElementById('state');
    const quotes = Array.isArray(payload) ? payload : (payload?.quotes || payload?.data || []);
    const wanted = new Set(this.definition.pairs);
    const rows = quotes.filter(q => wanted.has(String(q.pair || `${q.base}/${q.quote}`).toUpperCase()));

    if (!rows.length) {
      rail.innerHTML = '<div class="empty">No verified quotes are available for this ticker.</div>';
      state.textContent = 'NO DATA';
      state.className = 'state stale';
      return;
    }

    rail.innerHTML = rows.map(q => this.renderQuote(q)).join('');
    const available = rows.filter(q => q.status !== 'unavailable');
    const stale = available.some(q => q.status === 'stale');
    if (!available.length) {
      state.textContent = this.market === 'dex' ? 'NO LIQUIDITY' : 'UNAVAILABLE';
      state.className = 'state stale';
    } else if (mode === 'browser') {
      state.textContent = 'LIVE • PUBLIC';
      state.className = 'state live';
    } else {
      state.textContent = stale ? 'STALE DATA' : 'LIVE';
      state.className = stale ? 'state stale' : 'state live';
    }
  }

  async refresh() {
    try {
      const payload = await this.fetchJson(this.endpoint);
      this.renderPayload(payload, 'runtime');
      return;
    } catch (runtimeError) {
      try {
        const payload = await this.browserFallback();
        this.renderPayload(payload, 'browser');
        this.dispatchEvent(new CustomEvent('neo-market-ticker-fallback', { detail: { market: this.market, endpoint: this.endpoint, runtimeError: String(runtimeError) } }));
        return;
      } catch (fallbackError) {
        const rail = this.shadowRoot.getElementById('rail');
        const state = this.shadowRoot.getElementById('state');
        rail.innerHTML = '<div class="empty">Market feed unavailable. No placeholder prices are being shown.</div>';
        state.textContent = 'FEED OFFLINE';
        state.className = 'state error';
        this.dispatchEvent(new CustomEvent('neo-market-ticker-error', { detail: { market: this.market, endpoint: this.endpoint, runtimeError: String(runtimeError), fallbackError: String(fallbackError) } }));
      }
    }
  }

  renderQuote(q) {
    const pair = String(q.pair || `${q.base}/${q.quote}`).toUpperCase();
    const value = q.last ?? q.mid ?? q.price;
    const change = Number(q.change24h ?? q.change ?? 0);
    const cls = change > 0 ? 'up' : change < 0 ? 'down' : 'flat';
    const sign = change > 0 ? '+' : '';
    const price = value == null || value === '' ? 'Unavailable' : this.formatNumber(value);
    const source = q.source ? ` • ${this.escape(q.source)}` : '';
    const confidence = q.confidence ? ` • ${this.escape(q.confidence)}` : '';
    const stamp = q.timestamp ? new Date(q.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'time unknown';
    return `<article class="item"><div class="pair">${this.escape(pair)}</div><div class="price">${this.escape(price)}</div><div class="meta ${cls}">${sign}${Number.isFinite(change) ? change.toFixed(2) : '0.00'}%</div><div class="meta">${this.escape(stamp)}${source}${confidence}</div></article>`;
  }

  formatNumber(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return String(value);
    if (Math.abs(n) >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
    if (Math.abs(n) >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
    return n.toLocaleString(undefined, { maximumSignificantDigits: 8 });
  }

  escape(value) {
    return String(value).replace(/[&<>"']/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[m]));
  }
}

if (!customElements.get('neo-market-ticker')) customElements.define('neo-market-ticker', NEOMarketTicker);
