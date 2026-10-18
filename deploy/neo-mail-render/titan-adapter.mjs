/**
 * Titan Mail read-only adapter. Credentials must come from a secret manager.
 * Never place real credentials in source, browser URLs, or GitHub issues.
 */
export function titanConfig(env = process.env) {
  const user = env.TITAN_IMAP_USER;
  const pass = env.TITAN_IMAP_APP_PASSWORD;
  if (!user || !pass) throw new Error('titan_credentials_not_configured');
  const host = env.TITAN_IMAP_HOST || 'imap.titan.email';
  if (!/^([a-z0-9-]+\.)+titan\.email$/i.test(host)) throw new Error('unsupported_titan_host');
  return { host, port: 993, secure: true, auth: { user, pass }, tls: { rejectUnauthorized: true }, logger: false };
}
export async function latestTitanMessages({ config, clientFactory, limit = 10 }) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw new Error('invalid_limit');
  const client = clientFactory ? await clientFactory(config) : new (await import('imapflow')).ImapFlow(config);
  let connected = false;
  try {
    await client.connect();
    connected = true;
    const lock = await client.getMailboxLock('INBOX', { readOnly: true });
    try {
      const count = client.mailbox?.exists ?? 0;
      if (!count) return [];
      const start = Math.max(1, count - limit + 1);
      const messages = [];
      for await (const msg of client.fetch(`${start}:${count}`, { uid:true, envelope:true, internalDate:true }, { uid:false })) {
        messages.push({
          uid: msg.uid,
          subject: msg.envelope?.subject || '',
          from: (msg.envelope?.from || []).map(x => x.address).filter(Boolean),
          date: (msg.internalDate || msg.envelope?.date || null)?.toISOString?.() || null
        });
      }
      return messages.sort((a,b) => (b.date || '').localeCompare(a.date || '')).slice(0, limit);
    } finally { lock.release(); }
  } finally {
    if (connected) await client.logout().catch(() => {});
  }
}
