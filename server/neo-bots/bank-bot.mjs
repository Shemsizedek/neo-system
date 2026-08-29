export const CES_EXCHANGES = {
  NMNI: {
    exchangeId: 'NMNI',
    adminAccount: 'NMNI0000',
    bankAccount: 'NMNIBANK',
    role: 'primary',
  },
  XCPC: {
    exchangeId: 'XCPC',
    adminAccount: 'XCPC0000',
    bankAccount: 'XCPCBANK',
    role: 'connected',
  },
};

export const NEO_BANK_BOT = {
  id: 'neo-bank-bot',
  name: 'NEO Bank Bot',
  type: 'financial-operations',
  status: 'active',
  requiresHumanApproval: true,
  primaryExchange: 'NMNI',
  scopes: [
    'ces.transactions.review',
    'ces.transactions.approve',
    'ces.vdollars.issue',
    'ces.publications.upload',
    'ces.subscriptions.maintain',
    'ces.virtual-trader.review',
    'ces.interexchange.settlement.review',
  ],
  limits: {
    maxSingleVDollarIssue: 10000,
    approvalRequiredForValueMovement: true,
  },
};

export function resolveCesIdentity(exchangeId) {
  const key = String(exchangeId || NEO_BANK_BOT.primaryExchange).toUpperCase();
  const identity = CES_EXCHANGES[key];
  if (!identity) throw new Error(`unregistered CES exchange: ${key}`);
  return identity;
}

export function registerCesExchange({ exchangeId, adminAccount, bankAccount, role = 'connected' }) {
  const key = String(exchangeId || '').trim().toUpperCase();
  if (!key) throw new Error('exchangeId is required');
  if (!adminAccount || !bankAccount) throw new Error('adminAccount and bankAccount are required');
  CES_EXCHANGES[key] = Object.freeze({ exchangeId: key, adminAccount, bankAccount, role });
  return CES_EXCHANGES[key];
}

export function createNeoBankHandler({ cesAdapter }) {
  if (!cesAdapter) throw new Error('cesAdapter is required');

  return async function neoBankHandler(job) {
    const identity = resolveCesIdentity(job.exchangeId || job.payload?.exchangeId);
    const context = { ...job.payload, exchange: identity };

    switch (job.action) {
      case 'ces.transactions.review':
        return cesAdapter.reviewTransaction(context);
      case 'ces.transactions.approve':
        return cesAdapter.approveTransaction(context);
      case 'ces.vdollars.issue': {
        const amount = Number(job.payload?.amount);
        if (!Number.isFinite(amount) || amount <= 0) throw new Error('valid V-Dollar amount is required');
        if (amount > NEO_BANK_BOT.limits.maxSingleVDollarIssue) throw new Error('V-Dollar issuance exceeds bot policy limit');
        return cesAdapter.issueVDollars(context);
      }
      case 'ces.publications.upload':
        return cesAdapter.uploadPublication(context);
      case 'ces.subscriptions.maintain':
        return cesAdapter.maintainSubscription(context);
      case 'ces.virtual-trader.review':
        return cesAdapter.reviewVirtualTrader(context);
      case 'ces.interexchange.settlement.review':
        return cesAdapter.reviewInterexchangeSettlement(context);
      default:
        throw new Error(`unsupported NEO Bank Bot action: ${job.action}`);
    }
  };
}

export function createStubCesAdapter() {
  const unavailable = (operation) => async (payload = {}) => ({
    ok: false,
    mode: 'stub',
    operation,
    exchange: payload.exchange || null,
    message: 'CES live adapter not configured. No external action was taken.',
  });

  return {
    reviewTransaction: unavailable('reviewTransaction'),
    approveTransaction: unavailable('approveTransaction'),
    issueVDollars: unavailable('issueVDollars'),
    uploadPublication: unavailable('uploadPublication'),
    maintainSubscription: unavailable('maintainSubscription'),
    reviewVirtualTrader: unavailable('reviewVirtualTrader'),
    reviewInterexchangeSettlement: unavailable('reviewInterexchangeSettlement'),
  };
}
