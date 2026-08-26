import { createRemoteJWKSet, jwtVerify } from 'jose';

const html = (email = 'authorized executive') => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>NEO Government Hub</title><style>:root{--bg:#010503;--p:#06110b;--line:#245c3b;--g:#65ff8a;--text:#effff3;--muted:#89a491}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 50% 0,#0b2819,#010503 54%);color:var(--text);font-family:system-ui,-apple-system,Segoe UI,sans-serif}.wrap{max-width:1100px;margin:auto;padding:22px}.head{display:flex;justify-content:space-between;gap:16px;align-items:center;border-bottom:1px solid var(--line);padding-bottom:18px}.seal,.status{color:var(--g);font-weight:900}.status{font-size:11px;letter-spacing:.1em}.identity{margin:18px 0;padding:12px 14px;border:1px solid #2d7046;border-radius:14px;background:#041009;color:#caffd5}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.card{border:1px solid var(--line);border-radius:18px;background:var(--p);padding:18px;min-height:152px}.card p{color:var(--muted);font-size:13px}.card a{display:inline-block;text-decoration:none;border:1px solid #35794e;background:#0a1c12;color:#d9ffe3;border-radius:10px;padding:9px 12px}.foot{margin-top:30px;color:#506b58;font-size:10px}@media(max-width:700px){.grid{grid-template-columns:1fr}}</style></head><body><main class="wrap"><header class="head"><div><div class="seal">∞ NEO SYSTEMS</div><h1>Government Hub</h1></div><div class="status">AUTHENTICATED CONTROL PLANE</div></header><div class="identity">Signed in through Cloudflare Access as ${escapeHtml(email)}</div><section class="grid"><article class="card"><div class="status">EXECUTIVE</div><h2>Command Center</h2><p>Executive directives, approvals, operational controls and private administration.</p><a href="/command">Open Command Center</a></article><article class="card"><div class="status">NEOSYNC</div><h2>Private AI Operations</h2><p>Private NEOsync workspace and administrative orchestration.</p><a href="/neosync">Open NEOsync</a></article><article class="card"><div class="status">SYSTEM</div><h2>Operations</h2><p>Deployment, health, infrastructure and service administration.</p><a href="/operations">Open Operations</a></article></section><div class="foot">NEO GOVERNMENT · PRIVATE EXECUTIVE SURFACE · ACCESS ENFORCED AT THE EDGE</div></main></body></html>`;

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

async function authorize(request, env) {
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) {
    return { ok: false, status: 503, message: 'Government access is not configured.' };
  }
  const token = request.headers.get('CF-Access-Jwt-Assertion');
  if (!token) return { ok: false, status: 401, message: 'Authentication required.' };
  try {
    const issuer = `https://${env.ACCESS_TEAM_DOMAIN}`;
    const jwks = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
    const { payload } = await jwtVerify(token, jwks, { issuer, audience: env.ACCESS_AUD });
    const email = String(payload.email || request.headers.get('Cf-Access-Authenticated-User-Email') || '').toLowerCase();
    const allow = String(env.ADMIN_EMAILS || '').split(',').map(v => v.trim().toLowerCase()).filter(Boolean);
    if (allow.length && !allow.includes(email)) return { ok: false, status: 403, message: 'Executive authorization required.' };
    return { ok: true, email, payload };
  } catch {
    return { ok: false, status: 401, message: 'Invalid or expired access session.' };
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store' } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/health') return json({ ok: true, service: 'neo-government', auth: 'cloudflare-access' });
    const auth = await authorize(request, env);
    if (!auth.ok) return json({ ok:false, error:auth.message }, auth.status);

    if (url.pathname === '/' || url.pathname === '/home') {
      return new Response(html(auth.email), { headers: { 'content-type':'text/html; charset=utf-8', 'cache-control':'no-store', 'x-robots-tag':'noindex, nofollow' } });
    }
    if (url.pathname === '/api/session') return json({ ok:true, email:auth.email, role:'executive-admin' });
    if (url.pathname === '/command') return json({ ok:true, surface:'command-center', state:'authenticated', message:'Command modules are ready for live operation wiring.' });
    if (url.pathname === '/neosync') return json({ ok:true, surface:'neosync-private', state:'authenticated' });
    if (url.pathname === '/operations') return json({ ok:true, surface:'operations', state:'authenticated' });
    return json({ ok:false, error:'Not found' }, 404);
  }
};
