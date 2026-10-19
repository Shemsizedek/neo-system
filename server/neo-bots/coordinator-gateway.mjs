import { NEO_BANK_BOT, resolveCesIdentity } from './bank-bot.mjs';
import { CES_OPERATION_POLICY } from './ces-interface-policy.mjs';
import { classifyCesBotReceipt } from './coordinator-receipt.mjs';

/**
 * Authorized coordinator facade for the existing NEO Bank Bot.
 * Callers must supply trusted server-side authorization and durable receipt storage.
 */
export function createCoordinatorBotGateway({ runtime, authorize, saveReceipt }) {
  if (!runtime?.execute || typeof authorize !== 'function' || typeof saveReceipt !== 'function') {
    throw new Error('Existing runtime, authorization and receipt persistence are required');
  }
  return async function executeCoordinatorCommand({ commandId, exchangeId, action, payload = {}, approvalId }, actor) {
    if (!commandId || !CES_OPERATION_POLICY[action]) throw new Error('Invalid coordinator command');
    const exchange = resolveCesIdentity(exchangeId);
    const grant = await authorize({ actor, exchangeId: exchange.exchangeId, bankAccount: exchange.bankAccount, action });
    if (grant?.authorized !== true || grant.bankAccount !== exchange.bankAccount || !grant.coordinatorId) {
      throw new Error('Coordinator authorization denied');
    }
    const result = await runtime.execute(NEO_BANK_BOT.id, {
      action,
      exchangeId: exchange.exchangeId,
      risk: CES_OPERATION_POLICY[action].risk,
      payload: { ...payload, commandId, exchangeId: exchange.exchangeId, coordinatorId: grant.coordinatorId }
    }, { actor: grant.coordinatorId, ...(approvalId ? { approval: approvalId } : {}) });
    const receipt = classifyCesBotReceipt(result);
    await saveReceipt({ commandId, exchangeId: exchange.exchangeId, coordinatorId: grant.coordinatorId, action, ...receipt });
    return { commandId, ...receipt, runtimeStatus: result.status };
  };
}
