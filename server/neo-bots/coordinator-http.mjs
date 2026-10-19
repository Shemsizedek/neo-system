import { createCoordinatorBotGateway } from './coordinator-gateway.mjs';

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
});

/**
 * Private NEO Bank API boundary. authenticate() must validate a real server-side
 * session; never trust identity or permissions supplied in request JSON/headers.
 * Durable command reservation must be atomic before any external CES operation.
 */
export function createCoordinatorHttpHandler({ runtime, authenticate, authorize, reserveCommand, saveReceipt }) {
  if (typeof authenticate !== 'function' || typeof reserveCommand !== 'function') {
    throw new Error('Authenticated session and durable command reservation required');
  }
  const dispatch = createCoordinatorBotGateway({ runtime, authorize, saveReceipt });
  return async function handle(request) {
    const url = new URL(request.url);
    if (url.pathname !== '/api/neo-bank/ces/commands' || request.method !== 'POST') return json({ error: 'Not found' }, 404);
    const actor = await authenticate(request);
    if (!actor?.id) return json({ error: 'Unauthorized' }, 401);
    const command = await request.json().catch(() => null);
    if (!command || typeof command.commandId !== 'string' || !/^[a-zA-Z0-9_-]{8,128}$/.test(command.commandId)) {
      return json({ error: 'Invalid command identifier' }, 400);
    }
    if (!command.exchangeId || !command.action || !command.payload || typeof command.payload !== 'object' || Array.isArray(command.payload)) {
      return json({ error: 'Invalid command' }, 400);
    }
    // Reserve atomically by authenticated tenant + command ID; duplicates must never re-execute.
    const reservation = await reserveCommand({ actor, commandId: command.commandId, exchangeId: command.exchangeId, action: command.action });
    if (!reservation?.created) return json({ status: 'duplicate-or-pending', commandId: command.commandId }, 409);
    try {
      const result = await dispatch(command, actor);
      return json(result, result.accountingEligible ? 200 : 202);
    } catch (error) {
      await saveReceipt({ commandId: command.commandId, disposition: 'failed-review-required', accountingEligible: false });
      return json({ error: 'Command could not be completed; review required' }, 422);
    }
  };
}
