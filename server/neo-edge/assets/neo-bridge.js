(() => {
  'use strict';

  const VERSION = '3.2.0';
  const DEFAULT_API = 'https://neo.holytemples.org/api';
  const selectors = [
    '[data-neo-temple-dashboard]',
    '#neo-holytemples-root',
    '.wp-block-neo-system-temple-telemetry'
  ];

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[char]);

  const safeEndpoint = value => {
    try {
      const url = new URL(value || DEFAULT_API, window.location.href);
      if (url.protocol !== 'https:') throw new Error('HTTPS is required');
      return url.href;
    } catch {
      return DEFAULT_API;
    }
  };

  const css = `
    :host{all:initial;color-scheme:dark;display:block;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    *{box-sizing:border-box}.shell{background:radial-gradient(circle at 85% 0,rgba(54,255,142,.15),transparent 35%),linear-gradient(145deg,#020704,#07150d);border:1px solid rgba(111,255,166,.22);border-radius:22px;color:#eafff0;overflow:hidden;padding:clamp(18px,3vw,34px);box-shadow:0 24px 70px rgba(0,0,0,.28)}
    .top{align-items:flex-start;display:flex;gap:18px;justify-content:space-between;margin-bottom:24px}.eyebrow{color:#7dffad;font-size:.72rem;font-weight:800;letter-spacing:.16em;text-transform:uppercase}.title{font-size:clamp(1.55rem,4vw,2.55rem);font-weight:760;letter-spacing:-.04em;line-height:1.05;margin:.38rem 0 0}.status{align-items:center;background:rgba(38,255,119,.08);border:1px solid rgba(91,255,151,.25);border-radius:999px;color:#baffd0;display:flex;font-size:.78rem;font-weight:750;gap:8px;padding:8px 12px;white-space:nowrap}.dot{background:#51ff91;border-radius:50%;box-shadow:0 0 14px #51ff91;height:8px;width:8px}.dot.off{background:#ffb04a;box-shadow:0 0 14px #ffb04a}
    .grid{display:grid;gap:12px;grid-template-columns:repeat(4,minmax(0,1fr))}.card{background:rgba(255,255,255,.035);border:1px solid rgba(185,255,208,.11);border-radius:15px;min-height:104px;padding:16px}.label{color:#82a98f;font-size:.71rem;font-weight:700;letter-spacing:.09em;text-transform:uppercase}.value{font-size:1.25rem;font-weight:760;margin-top:10px;overflow-wrap:anywhere}.sub{color:#86a78f;font-size:.76rem;line-height:1.4;margin-top:7px}.services{display:flex;flex-wrap:wrap;gap:7px;margin-top:18px}.service{background:#0a2113;border:1px solid rgba(104,255,160,.16);border-radius:999px;color:#bceecb;font-size:.72rem;padding:6px 9px}.foot{color:#6e8e78;display:flex;font-size:.69rem;gap:12px;justify-content:space-between;margin-top:17px}.error{background:rgba(255,151,69,.08);border:1px solid rgba(255,174,84,.25);border-radius:14px;color:#ffd2a6;padding:16px}.skeleton{animation:pulse 1.3s ease-in-out infinite;background:rgba(255,255,255,.06);border-radius:12px;height:104px}@keyframes pulse{50%{opacity:.45}}@media(max-width:780px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:470px){.top{align-items:stretch;flex-direction:column}.status{align-self:flex-start}.grid{grid-template-columns:1fr}.foot{flex-direction:column}}
  `;

  class NeoTempleDashboard extends HTMLElement {
    connectedCallback() {
      if (this.dataset.neoMounted) return;
      this.dataset.neoMounted = 'true';
      this.endpoint = safeEndpoint(this.dataset.api || this.getAttribute('api-endpoint'));
      const requested = Number.parseInt(this.dataset.refresh || this.getAttribute('refresh-rate') || '4000', 10);
      this.refreshMs = Math.max(4000, Number.isFinite(requested) ? requested : 4000);
      this.root = this.attachShadow ? this.attachShadow({ mode: 'open' }) : this;
      this.renderLoading();
      this.refresh();
      this.timer = window.setInterval(() => this.refresh(), this.refreshMs);
      document.addEventListener('visibilitychange', this.visibilityHandler = () => {
        if (!document.hidden) this.refresh();
      });
    }

    disconnectedCallback() {
      window.clearInterval(this.timer);
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }

    renderLoading() {
      this.root.innerHTML = `<style>${css}</style><section class="shell" aria-busy="true"><div class="top"><div><div class="eyebrow">NEO System</div><div class="title">Temple Executive Telemetry</div></div><div class="status"><span class="dot"></span>Connecting</div></div><div class="grid">${'<div class="skeleton"></div>'.repeat(4)}</div></section>`;
    }

    async refresh() {
      if (this.loading) return;
      this.loading = true;
      try {
        const response = await fetch(this.endpoint, { headers: { Accept: 'application/json' }, cache: 'no-store' });
        if (!response.ok) throw new Error(`API returned ${response.status}`);
        const payload = await response.json();
        this.render(payload);
      } catch (error) {
        this.renderError(error);
      } finally {
        this.loading = false;
      }
    }

    render(payload) {
      const manifest = payload.system || payload;
      const services = Array.isArray(manifest.services) ? manifest.services : [];
      const nomni = manifest.assets?.NOMNI || {};
      const ces = manifest.ces || {};
      const active = services.filter(service => service.api).length;
      const updated = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' }).format(new Date());
      this.root.innerHTML = `<style>${css}</style><section class="shell" aria-live="polite">
        <div class="top"><div><div class="eyebrow">${escapeHtml(manifest.mode || 'live-production')}</div><div class="title">Temple Executive Telemetry</div></div><div class="status"><span class="dot"></span>System online</div></div>
        <div class="grid">
          <article class="card"><div class="label">Connected services</div><div class="value">${active}</div><div class="sub">Public NEO service registry</div></article>
          <article class="card"><div class="label">World currency</div><div class="value">${escapeHtml(nomni.symbol || '∞')} ${escapeHtml(nomni.asset || 'NOMNI')}</div><div class="sub">${escapeHtml(nomni.network || 'Bitcoin · Counterparty')}</div></article>
          <article class="card"><div class="label">Community exchange</div><div class="value">${escapeHtml(ces.name || 'NEO Bank')}</div><div class="sub">${escapeHtml(ces.system || 'Community Exchange System')}</div></article>
          <article class="card"><div class="label">Edge</div><div class="value">${escapeHtml(manifest.edge || 'neo-edge')}</div><div class="sub">Secrets and private keys remain server-side</div></article>
        </div>
        <div class="services">${services.slice(0, 12).map(service => `<span class="service">${escapeHtml(service.name)}</span>`).join('')}</div>
        <div class="foot"><span>Live from ${escapeHtml(new URL(this.endpoint).host)}</span><span>Updated ${escapeHtml(updated)} · Bridge v${VERSION}</span></div>
      </section>`;
      this.dispatchEvent(new CustomEvent('neo:telemetry', { detail: payload, bubbles: true }));
    }

    renderError(error) {
      this.root.innerHTML = `<style>${css}</style><section class="shell"><div class="top"><div><div class="eyebrow">NEO System</div><div class="title">Temple Executive Telemetry</div></div><div class="status"><span class="dot off"></span>Reconnecting</div></div><div class="error" role="status">Live telemetry is temporarily unavailable. The bridge will retry automatically.<div class="sub">${escapeHtml(error.message)}</div></div></section>`;
    }
  }

  if (!customElements.get('neo-temple-dashboard')) customElements.define('neo-temple-dashboard', NeoTempleDashboard);

  const mount = root => {
    if (root.dataset.neoMounted || root.tagName.toLowerCase() === 'neo-temple-dashboard') return;
    const dashboard = document.createElement('neo-temple-dashboard');
    dashboard.dataset.api = root.dataset.api || root.dataset.apiEndpoint || DEFAULT_API;
    dashboard.dataset.refresh = root.dataset.refresh || root.dataset.refreshRate || '4000';
    root.replaceChildren(dashboard);
    root.dataset.neoMounted = 'true';
  };

  const scan = scope => selectors.forEach(selector => scope.querySelectorAll(selector).forEach(mount));
  const boot = () => {
    scan(document);
    new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
      if (node.nodeType !== 1) return;
      if (selectors.some(selector => node.matches?.(selector))) mount(node);
      scan(node);
    }))).observe(document.documentElement, { childList: true, subtree: true });
  };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot, { once: true }) : boot();
  window.NeoTempleBridge = Object.freeze({ version: VERSION, mount, refresh: element => element?.refresh?.() });
})();
