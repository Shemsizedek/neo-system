(() => {
  'use strict';

  const VERSION = '1.0.0';
  const DEFAULT_ENDPOINT = 'https://neo.holytemples.org/api/ai/execute';

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[char]);

  const safeHttpsEndpoint = value => {
    try {
      const url = new URL(value || DEFAULT_ENDPOINT, window.location.href);
      if (url.protocol !== 'https:') throw new Error('HTTPS is required');
      return url.href;
    } catch {
      return DEFAULT_ENDPOINT;
    }
  };

  const styles = `
    :host{all:initial;color-scheme:dark;display:block;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    *{box-sizing:border-box}.shell{background:radial-gradient(circle at 85% 0,rgba(78,255,156,.14),transparent 38%),linear-gradient(145deg,#020704,#07150d);border:1px solid rgba(111,255,166,.22);border-radius:22px;color:#eafff0;overflow:hidden;padding:clamp(18px,3vw,30px);box-shadow:0 24px 70px rgba(0,0,0,.28)}
    .top{display:flex;gap:16px;align-items:flex-start;justify-content:space-between;margin-bottom:18px}.eyebrow{color:#7dffad;font-size:.72rem;font-weight:800;letter-spacing:.16em;text-transform:uppercase}.title{font-size:clamp(1.45rem,3.8vw,2.25rem);font-weight:760;letter-spacing:-.035em;line-height:1.08;margin:.35rem 0 0}.status{display:flex;align-items:center;gap:8px;border:1px solid rgba(91,255,151,.25);background:rgba(38,255,119,.08);border-radius:999px;color:#baffd0;font-size:.76rem;font-weight:750;padding:8px 11px;white-space:nowrap}.dot{width:8px;height:8px;border-radius:50%;background:#51ff91;box-shadow:0 0 14px #51ff91}.dot.off{background:#ffb04a;box-shadow:0 0 14px #ffb04a}
    form{display:grid;gap:12px}.row{display:grid;gap:12px;grid-template-columns:minmax(0,1fr) 170px}.field{display:grid;gap:7px}.label{color:#8ab398;font-size:.7rem;font-weight:750;letter-spacing:.1em;text-transform:uppercase}.input,.select,.textarea{width:100%;border:1px solid rgba(185,255,208,.13);border-radius:13px;background:rgba(255,255,255,.035);color:#eafff0;font:inherit;padding:12px 13px;outline:none}.textarea{min-height:118px;resize:vertical;line-height:1.45}.input:focus,.select:focus,.textarea:focus{border-color:rgba(86,255,151,.48);box-shadow:0 0 0 3px rgba(62,255,132,.08)}.actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.button{border:0;border-radius:12px;background:#72ff9e;color:#03220d;font:inherit;font-weight:800;padding:11px 15px;cursor:pointer}.button[disabled]{cursor:not-allowed;opacity:.5}.secondary{background:rgba(255,255,255,.06);color:#c8f4d4;border:1px solid rgba(185,255,208,.13)}
    .notice,.result,.error{margin-top:14px;border-radius:14px;padding:14px 15px;line-height:1.5}.notice{background:rgba(255,176,74,.07);border:1px solid rgba(255,176,74,.22);color:#ffd7aa}.result{background:rgba(71,255,137,.05);border:1px solid rgba(97,255,153,.18);color:#dcffe7;white-space:pre-wrap}.error{background:rgba(255,111,111,.07);border:1px solid rgba(255,117,117,.2);color:#ffc4c4}.meta{color:#7c9f87;font-size:.72rem;margin-top:8px}.foot{display:flex;justify-content:space-between;gap:12px;color:#6e8e78;font-size:.68rem;margin-top:16px}.hidden{display:none!important}@media(max-width:620px){.top{flex-direction:column}.row{grid-template-columns:1fr}.foot{flex-direction:column}}
  `;

  async function runtimeToken() {
    const resolver = window.NeoTempleAIAuth?.getAccessToken || window.NeoPass?.getAccessToken;
    if (typeof resolver !== 'function') return null;
    const token = await resolver();
    return typeof token === 'string' && token.trim() ? token.trim() : null;
  }

  class NeoTempleAI extends HTMLElement {
    connectedCallback() {
      if (this.dataset.neoAiMounted) return;
      this.dataset.neoAiMounted = 'true';
      this.endpoint = safeHttpsEndpoint(this.getAttribute('endpoint'));
      this.root = this.attachShadow ? this.attachShadow({ mode: 'open' }) : this;
      this.render();
    }

    render() {
      const capability = this.getAttribute('capability') || 'reasoning';
      this.root.innerHTML = `<style>${styles}</style><section class="shell">
        <div class="top"><div><div class="eyebrow">NEO AI Gateway</div><div class="title">Temple Intelligence Console</div></div><div class="status"><span class="dot"></span>Router v2</div></div>
        <form novalidate>
          <div class="row">
            <label class="field"><span class="label">Mission objective</span><textarea class="textarea" name="objective" maxlength="12000" required placeholder="Ask the NEO Router to analyze, plan, design, review, or explain..."></textarea></label>
            <label class="field"><span class="label">Capability</span><select class="select" name="capability"><option value="reasoning">Reasoning</option><option value="planning">Planning</option><option value="review">Review</option><option value="frontend">Frontend</option><option value="design">Design</option><option value="backend">Backend</option><option value="multimodal">Multimodal</option><option value="media">Media</option></select></label>
          </div>
          <div class="actions"><button class="button" type="submit">Run mission</button><button class="button secondary" type="button" data-clear>Clear</button></div>
        </form>
        <div class="notice hidden" data-auth>NEOpass authentication is required before the Temple can execute an AI mission.</div>
        <div class="result hidden" data-result></div>
        <div class="error hidden" data-error></div>
        <div class="foot"><span>Trusted execution through NEO Gateway</span><span>AI surface v${VERSION}</span></div>
      </section>`;
      const select = this.root.querySelector('select[name="capability"]');
      if ([...select.options].some(option => option.value === capability)) select.value = capability;
      this.form = this.root.querySelector('form');
      this.submitButton = this.root.querySelector('button[type="submit"]');
      this.authNotice = this.root.querySelector('[data-auth]');
      this.result = this.root.querySelector('[data-result]');
      this.error = this.root.querySelector('[data-error]');
      this.form.addEventListener('submit', event => this.execute(event));
      this.root.querySelector('[data-clear]').addEventListener('click', () => this.clear());
    }

    clear() {
      this.form.reset();
      this.hideMessages();
    }

    hideMessages() {
      for (const node of [this.authNotice, this.result, this.error]) node.classList.add('hidden');
      this.result.textContent = '';
      this.error.textContent = '';
    }

    async execute(event) {
      event.preventDefault();
      this.hideMessages();
      const objective = this.form.elements.objective.value.trim();
      const capability = this.form.elements.capability.value;
      if (!objective) return;

      const token = await runtimeToken().catch(() => null);
      if (!token) {
        this.authNotice.classList.remove('hidden');
        this.dispatchEvent(new CustomEvent('neo:ai-auth-required', { bubbles: true }));
        return;
      }

      this.submitButton.disabled = true;
      this.submitButton.textContent = 'Routing…';
      try {
        const response = await fetch(this.endpoint, {
          method: 'POST',
          cache: 'no-store',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            missionId: `TEMPLE-${Date.now()}`,
            objective,
            capability,
            actions: [],
            maxTokens: 2048,
          }),
        });
        const payload = await response.json().catch(() => ({}));
        if (response.status === 401) {
          this.authNotice.classList.remove('hidden');
          this.dispatchEvent(new CustomEvent('neo:ai-auth-required', { bubbles: true }));
          return;
        }
        if (!response.ok) throw new Error(payload?.error || `AI gateway returned ${response.status}`);
        const text = payload?.result?.text || payload?.result?.result?.text || payload?.text || payload?.reason || JSON.stringify(payload, null, 2);
        this.result.innerHTML = `${escapeHtml(text)}<div class="meta">Route: ${escapeHtml(payload.route || payload?.result?.provider || 'NEO Router')} · Status: ${escapeHtml(payload.status || 'completed')}</div>`;
        this.result.classList.remove('hidden');
        this.dispatchEvent(new CustomEvent('neo:ai-result', { detail: payload, bubbles: true }));
      } catch (error) {
        this.error.textContent = error?.message || 'AI mission failed.';
        this.error.classList.remove('hidden');
      } finally {
        this.submitButton.disabled = false;
        this.submitButton.textContent = 'Run mission';
      }
    }
  }

  if (!customElements.get('neo-temple-ai')) customElements.define('neo-temple-ai', NeoTempleAI);
  window.NeoTempleAI = Object.freeze({ version: VERSION, endpoint: DEFAULT_ENDPOINT });
})();
