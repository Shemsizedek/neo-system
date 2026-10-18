import http from 'node:http';

const PORT = Number(process.env.PORT || 10000);
const headers = Object.freeze({
  'cache-control': 'no-store, private',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'content-security-policy': "default-src 'none'; frame-ancestors 'none'",
  'x-frame-options': 'DENY'
});
const reply = (res, code, data) => {
  res.writeHead(code, { ...headers, 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
};

/**
 * NEO-MAIL-008: fail-closed staging control-plane entrypoint.
 * This server deliberately does not implement IMAP, SMTP, postmaster login,
 * user provisioning, or message storage. Those require separate certified
 * credentials, tenant isolation, NEO Pass verification and release approvals.
 */
export function createPostmasterServer() {
  return http.createServer((req, res) => {
    let url;
    try { url = new URL(req.url || '/', 'http://localhost'); }
    catch { return reply(res, 400, { error: 'invalid_url' }); }
    if (req.method === 'GET' && url.pathname === '/healthz') {
      return reply(res, 200, {
        ok: true, service: 'neo-mail-postmaster', stage: 'staging',
        mailboxConnected: false, outboundEnabled: false
      });
    }
    if (req.method === 'GET' && url.pathname === '/') {
      return reply(res, 200, {
        service: 'NEO Mail Postmaster', stage: 'staging',
        adminAccess: 'not_configured', nmailAccess: 'not_configured',
        messageSource: 'not_connected', mailDelivery: 'disabled',
        nextGate: 'NEO Pass identity verification and certified Titan read-only adapter'
      });
    }
    if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/api') || url.pathname.startsWith('/nmail')) {
      return reply(res, 403, { error: 'access_not_configured' });
    }
    return reply(res, 404, { error: 'not_found' });
  });
}

if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  createPostmasterServer().listen(PORT, '0.0.0.0', () => {
    console.log('NEO Mail staging control plane listening');
    if (process.env.TITAN_IMAP_APP_PASSWORD && process.env.TITAN_IMAP_USER) {
      import('./titan-adapter.mjs').then(async ({titanConfig,latestTitanMessages}) => {
        try {
          const messages = await latestTitanMessages({config:{...titanConfig(), connectionTimeout:15000, greetingTimeout:15000, socketTimeout:20000},limit:10});
          console.log(JSON.stringify({event:'titan_readonly_probe',result:'authenticated',messageCount:messages.length}));
        } catch (error) {
          const reason = /authentication|login|credential|auth/i.test(error?.message || '') ? 'authentication_failed' : 'connection_or_mailbox_error';
          console.log(JSON.stringify({event:'titan_readonly_probe',result:'failed',reason}));
        }
      }).catch(() => console.log(JSON.stringify({event:'titan_readonly_probe',result:'adapter_unavailable'})));
    } else console.log(JSON.stringify({event:'titan_readonly_probe',result:'credentials_missing'}));
  });
}
