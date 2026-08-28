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

  async refresh() {
    const rail = this.shadowRoot.getElementById('rail');
    const state = this.shadowRoot.getElementById('state');
    try {
      const response = await fetch(this.endpoint, { headers: { accept: 'application/json' }, cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const quotes = Array.isArray(payload) ? payload : (payload.quotes || payload.data || []);
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
      } else {
        state.textContent = stale ? 'STALE DATA' : 'LIVE';
        state.className = stale ? 'state stale' : 'state live';
      }
    } catch (error) {
      const onPages = location.hostname.endsWith('github.io') && !this.getAttribute('api-base') && !window.NEO_MARKETS_API_BASE;
      rail.innerHTML = `<div class="empty">${onPages ? 'Live market runtime is not configured for this GitHub Pages session.' : 'Market feed unavailable.'} No placeholder prices are being shown.</div>`;
      state.textContent = onPages ? 'RUNTIME NEEDED' : 'FEED OFFLINE';
      state.className = 'state error';
      this.dispatchEvent(new CustomEvent('neo-market-ticker-error', { detail: { market: this.market, endpoint: this.endpoint, error: String(error) } }));
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
