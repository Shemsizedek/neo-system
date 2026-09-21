(() => {
  'use strict';

  const VERSION = '1.4.0';
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
    form{display:grid;gap:12px}.row{display:grid;gap:12px;grid-template-columns:minmax(0,1fr) 170px}.workspace{display:grid;grid-template-columns:240px minmax(0,1fr);gap:14px}.threads{border:1px solid rgba(185,255,208,.13);border-radius:14px;padding:10px;background:rgba(255,255,255,.025);min-height:280px}.thread{display:block;width:100%;text-align:left;border:0;border-radius:10px;padding:9px 10px;margin-bottom:6px;background:transparent;color:#c8f4d4;cursor:pointer}.thread.active,.thread:hover{background:rgba(114,255,158,.1)}.thread small{display:block;color:#6e8e78;margin-top:3px}.thread.archived{opacity:.58}.thread .flags{float:right;font-size:.75rem}.filters{display:grid;gap:7px;margin:10px 0}.thread-actions{display:flex;gap:7px;flex-wrap:wrap;margin:0 0 12px}.danger{border-color:rgba(255,117,117,.25)!important;color:#ffc4c4!important}.shell.fullscreen{min-height:calc(100vh - 32px)}.history{display:grid;gap:9px;max-height:300px;overflow:auto;margin-bottom:12px}.msg{padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.035);white-space:pre-wrap}.msg.user{border-left:3px solid #72ff9e}.msg.assistant{border-left:3px solid #61a7ff}.telemetry{font-size:.72rem;color:#8ab398;margin:8px 0 12px}.field{display:grid;gap:7px}.label{color:#8ab398;font-size:.7rem;font-weight:750;letter-spacing:.1em;text-transform:uppercase}.input,.select,.textarea{width:100%;border:1px solid rgba(185,255,208,.13);border-radius:13px;background:rgba(255,255,255,.035);color:#eafff0;font:inherit;padding:12px 13px;outline:none}.textarea{min-height:118px;resize:vertical;line-height:1.45}.input:focus,.select:focus,.textarea:focus{border-color:rgba(86,255,151,.48);box-shadow:0 0 0 3px rgba(62,255,132,.08)}.actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.button{border:0;border-radius:12px;background:#72ff9e;color:#03220d;font:inherit;font-weight:800;padding:11px 15px;cursor:pointer}.button[disabled]{cursor:not-allowed;opacity:.5}.secondary{background:rgba(255,255,255,.06);color:#c8f4d4;border:1px solid rgba(185,255,208,.13)}
    .notice,.result,.error{margin-top:14px;border-radius:14px;padding:14px 15px;line-height:1.5}.notice{background:rgba(255,176,74,.07);border:1px solid rgba(255,176,74,.22);color:#ffd7aa}.result{background:rgba(71,255,137,.05);border:1px solid rgba(97,255,153,.18);color:#dcffe7;white-space:pre-wrap}.error{background:rgba(255,111,111,.07);border:1px solid rgba(255,117,117,.2);color:#ffc4c4}.meta{color:#7c9f87;font-size:.72rem;margin-top:8px}.foot{display:flex;justify-content:space-between;gap:12px;color:#6e8e78;font-size:.68rem;margin-top:16px}.hidden{display:none!important}@media(max-width:760px){.top{flex-direction:column}.row,.workspace{grid-template-columns:1fr}.foot{flex-direction:column}.threads{min-height:auto}}
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
      this.previousResponseId = null;
      this.threadId = null;
      this.threads = [];
      this.searchTerm = '';
      this.threadFilter = 'active';
      this.root = this.attachShadow ? this.attachShadow({ mode: 'open' }) : this;
      this.render();
    }

    render() {
      const capability = this.getAttribute('capability') || 'reasoning';
      this.root.innerHTML = `<style>${styles}</style><section class="shell ${this.hasAttribute('fullscreen')?'fullscreen':''}">
        <div class="top"><div><div class="eyebrow">NEO AI Gateway</div><div class="title">Temple Intelligence Console</div></div><div class="status"><span class="dot"></span>Router v2</div></div>
        <div class="workspace"><aside class="threads"><div class="label">NEOsync Threads</div><div class="telemetry" data-telemetry>Loading provider telemetry…</div><div class="filters"><input class="input" data-thread-search type="search" placeholder="Search threads…"><select class="select" data-thread-filter><option value="active">Active</option><option value="pinned">Pinned</option><option value="archived">Archived</option><option value="all">All</option></select></div><button class="button secondary" type="button" data-new-thread>+ New thread</button> <button class="button secondary" type="button" data-rename-thread>Rename</button><div data-threads style="margin-top:10px"></div></aside><div><div class="thread-actions"><button class="button secondary" type="button" data-pin-thread>Pin</button><button class="button secondary" type="button" data-archive-thread>Archive</button><button class="button secondary" type="button" data-export-thread>Export</button><button class="button secondary danger" type="button" data-delete-thread>Delete</button></div><div class="history" data-history></div>
        <form novalidate>
          <div class="row">
            <label class="field"><span class="label">Mission objective</span><textarea class="textarea" name="objective" maxlength="12000" required placeholder="Ask the NEO Router to analyze, plan, design, review, or explain..."></textarea></label>
            <label class="field"><span class="label">Capability</span><select class="select" name="capability"><option value="reasoning">Reasoning</option><option value="planning">Planning</option><option value="review">Review</option><option value="frontend">Frontend</option><option value="design">Design</option><option value="backend">Backend</option><option value="multimodal">Multimodal</option><option value="media">Media</option><option value="personalization">Personalization (Muse)</option></select></label>
          </div>
          <div class="actions"><button class="button" type="submit">Run mission</button><button class="button secondary" type="button" data-clear>Clear</button></div>
        </form></div></div>
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
      this.history = this.root.querySelector('[data-history]');
      this.threadList = this.root.querySelector('[data-threads]');
      this.telemetry = this.root.querySelector('[data-telemetry]');
      this.searchInput = this.root.querySelector('[data-thread-search]');
      this.filterInput = this.root.querySelector('[data-thread-filter]');
      this.form.addEventListener('submit', event => this.execute(event));
      this.root.querySelector('[data-clear]').addEventListener('click', () => this.clear());
      this.root.querySelector('[data-new-thread]').addEventListener('click', () => this.newThread());
      this.root.querySelector('[data-rename-thread]').addEventListener('click', () => this.renameThread());
      this.root.querySelector('[data-pin-thread]').addEventListener('click', () => this.togglePin());
      this.root.querySelector('[data-archive-thread]').addEventListener('click', () => this.toggleArchive());
      this.root.querySelector('[data-export-thread]').addEventListener('click', () => this.exportThread());
      this.root.querySelector('[data-delete-thread]').addEventListener('click', () => this.deleteThread());
      this.searchInput.addEventListener('input', () => { this.searchTerm = this.searchInput.value.trim().toLowerCase(); this.renderThreads(); });
      this.filterInput.addEventListener('change', () => { this.threadFilter = this.filterInput.value; this.renderThreads(); });
      this.refreshWorkspace();
    }

    clear() {
      this.form.reset();
      this.hideMessages();
    }

    async api(path, options = {}) {
      const token = await runtimeToken().catch(() => null);
      if (!token) throw new Error('neopass_identity_required');
      const response = await fetch(path, { cache:'no-store', ...options, headers:{ Accept:'application/json', Authorization:`Bearer ${token}`, ...(options.headers||{}) } });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
      return body;
    }

    async refreshWorkspace() {
      try {
        const [threads, providers] = await Promise.all([this.api('/api/ai/threads'), this.api('/api/ai/providers')]);
        this.threads = threads.threads || [];
        const muse = (providers.providers || []).find(p => p.id === 'meta-muse');
        const durable = muse?.durableTelemetry || muse?.telemetry || {};
        this.telemetry.textContent = muse ? `Muse · ${muse.configured?'configured':'offline'} · ${durable.successes||0} successes · ${durable.failures||0} failures · ${providers.telemetryPersistence||'memory'}` : 'Muse telemetry unavailable';
        this.renderThreads();
      } catch (error) {
        this.telemetry.textContent = error.message === 'neopass_identity_required' ? 'Sign in with NEOpass to load workspace.' : 'Workspace unavailable';
      }
    }

    renderThreads() {
      const visible = this.threads.filter(t => {
        const matchesSearch = !this.searchTerm || String(t.title||'').toLowerCase().includes(this.searchTerm) || (t.messages||[]).some(m => String(m.text||'').toLowerCase().includes(this.searchTerm));
        const matchesFilter = this.threadFilter === 'all' || (this.threadFilter === 'active' && !t.archived) || (this.threadFilter === 'archived' && t.archived) || (this.threadFilter === 'pinned' && t.pinned && !t.archived);
        return matchesSearch && matchesFilter;
      });
      this.threadList.innerHTML = visible.map(t => `<button class="thread ${t.id===this.threadId?'active':''} ${t.archived?'archived':''}" data-thread="${escapeHtml(t.id)}"><span class="flags">${t.pinned?'★ ':''}${t.archived?'⌁':''}</span><b>${escapeHtml(t.title)}</b><small>${escapeHtml(t.provider||t.capability||'personalization')}</small></button>`).join('') || '<div class="meta">No matching threads.</div>';
      this.threadList.querySelectorAll('[data-thread]').forEach(btn => btn.addEventListener('click', () => this.openThread(btn.dataset.thread)));
    }

    async newThread() {
      try {
        const title = prompt('Thread name', 'NEOsync Muse Thread') || 'NEOsync Muse Thread';
        const body = await this.api('/api/ai/threads', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ title, capability:'personalization' }) });
        this.threadId = body.thread.id;
        this.previousResponseId = body.thread.lastResponseId || null;
        this.history.innerHTML = '';
        await this.refreshWorkspace();
      } catch (error) { this.error.textContent = error.message; this.error.classList.remove('hidden'); }
    }

    async renameThread() {
      if (!this.threadId) return this.newThread();
      try {
        const current = this.threads.find(t => t.id === this.threadId);
        const title = prompt('Rename thread', current?.title || 'NEOsync Muse Thread');
        if (!title) return;
        await this.api(`/api/ai/threads/${encodeURIComponent(this.threadId)}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({title}) });
        await this.refreshWorkspace();
      } catch (error) { this.error.textContent = error.message; this.error.classList.remove('hidden'); }
    }

    async updateCurrentThread(patch) {
      if (!this.threadId) return;
      await this.api(`/api/ai/threads/${encodeURIComponent(this.threadId)}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(patch) });
      await this.refreshWorkspace();
      await this.openThread(this.threadId);
    }

    async togglePin() {
      const current = this.threads.find(t => t.id === this.threadId);
      if (!current) return;
      try { await this.updateCurrentThread({ pinned: !current.pinned }); }
      catch (error) { this.error.textContent = error.message; this.error.classList.remove('hidden'); }
    }

    async toggleArchive() {
      const current = this.threads.find(t => t.id === this.threadId);
      if (!current) return;
      try { await this.updateCurrentThread({ archived: !current.archived }); }
      catch (error) { this.error.textContent = error.message; this.error.classList.remove('hidden'); }
    }

    async exportThread() {
      if (!this.threadId) return;
      try {
        const payload = await this.api(`/api/ai/threads/${encodeURIComponent(this.threadId)}/export`);
        const name = String(payload.thread?.title || 'neosync-thread').replace(/[^a-z0-9_-]+/gi,'-').replace(/^-|-$/g,'').toLowerCase() || 'neosync-thread';
        const blob = new Blob([JSON.stringify(payload,null,2)], {type:'application/json'});
        const href = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = href; a.download = `${name}.json`; a.click();
        setTimeout(() => URL.revokeObjectURL(href), 1000);
      } catch (error) { this.error.textContent = error.message; this.error.classList.remove('hidden'); }
    }

    async deleteThread() {
      if (!this.threadId || !confirm('Delete this NEOsync thread permanently?')) return;
      try {
        await this.api(`/api/ai/threads/${encodeURIComponent(this.threadId)}`, { method:'DELETE' });
        this.threadId = null; this.previousResponseId = null; this.history.innerHTML = '';
        await this.refreshWorkspace();
      } catch (error) { this.error.textContent = error.message; this.error.classList.remove('hidden'); }
    }

    async openThread(id) {
      try {
        const body = await this.api(`/api/ai/threads/${encodeURIComponent(id)}`);
        const thread = body.thread;
        this.threadId = thread.id;
        this.previousResponseId = thread.lastResponseId || null;
        const pinButton=this.root.querySelector('[data-pin-thread]'); if(pinButton) pinButton.textContent=thread.pinned?'Unpin':'Pin';
        const archiveButton=this.root.querySelector('[data-archive-thread]'); if(archiveButton) archiveButton.textContent=thread.archived?'Restore':'Archive';
        this.history.innerHTML = (thread.messages||[]).map(m => `<div class="msg ${escapeHtml(m.role)}"><b>${m.role==='user'?'You':'NEOsync / '+(m.provider||'Muse')}</b><br>${escapeHtml(m.text||'')}</div>`).join('');
        this.renderThreads();
      } catch (error) { this.error.textContent = error.message; this.error.classList.remove('hidden'); }
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
      if (capability === 'personalization' && !this.threadId) {
        const created = await this.api('/api/ai/threads', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ title: objective.slice(0,72), capability }) }).catch(() => null);
        if (created?.thread) { this.threadId = created.thread.id; this.previousResponseId = created.thread.lastResponseId || null; }
      }
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
            perspectiveContext: capability === 'personalization'
              ? 'Use the NEO / Shemsizedek perspective profile, preserve provenance, distinguish verified facts from interpretation and future plans, and maintain established NEO terminology.'
              : undefined,
            previousResponseId: capability === 'personalization' ? this.previousResponseId : undefined,
            threadId: capability === 'personalization' ? this.threadId : undefined,
          }),
        });
        const payload = await response.json().catch(() => ({}));
        if (response.status === 401) {
          this.authNotice.classList.remove('hidden');
          this.dispatchEvent(new CustomEvent('neo:ai-auth-required', { bubbles: true }));
          return;
        }
        if (!response.ok) throw new Error(payload?.error || `AI gateway returned ${response.status}`);
        if (capability === 'personalization' && payload?.result?.responseId) this.previousResponseId = payload.result.responseId;
        const text = payload?.result?.text || payload?.result?.result?.text || payload?.text || payload?.reason || JSON.stringify(payload, null, 2);
        const session = capability === 'personalization' && this.previousResponseId ? ' · Session: linked' : '';
        this.result.innerHTML = `${escapeHtml(text)}<div class="meta">Route: ${escapeHtml(payload.route || payload?.result?.provider || 'NEO Router')} · Status: ${escapeHtml(payload.status || 'completed')}${escapeHtml(session)}</div>`;
        this.result.classList.remove('hidden');
        if (capability === 'personalization' && this.threadId) await this.openThread(this.threadId).catch(()=>{});
        await this.refreshWorkspace().catch(()=>{});
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
