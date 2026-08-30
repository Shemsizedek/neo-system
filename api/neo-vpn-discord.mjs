import { handleDiscordInteraction } from '../services/neo-vpn/discord/interaction-adapter.mjs';

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('allow', 'POST');
    return res.status(405).json({ error: 'method-not-allowed' });
  }

  try {
    const rawBody = await readRawBody(req);
    const headers = Object.fromEntries(
      Object.entries(req.headers).map(([key, value]) => [key.toLowerCase(), Array.isArray(value) ? value[0] : value])
    );

    const result = handleDiscordInteraction({
      rawBody,
      headers,
      env: process.env,
      infrastructureLive: process.env.NEO_VPN_INFRASTRUCTURE_LIVE === 'true'
    });

    if (result.controlRecord) {
      console.info(JSON.stringify({
        event: 'neo-vpn-discord-control-record',
        correlationId: result.controlRecord.correlationId,
        command: result.controlRecord.command,
        actor: result.controlRecord.actor,
        state: result.controlRecord.state,
        role: result.resolvedRole,
        requestedAt: result.controlRecord.requestedAt
      }));
    }

    return res.status(result.status).json(result.body);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'interaction-error';
    const status = message.includes('signature') || message.includes('timestamp') ? 401 : 400;
    return res.status(status).json({ error: message });
  }
}
