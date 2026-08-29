export const NEO_BANK_BOT = {
  id: 'neo-bank-bot',
  name: 'NEO Bank Bot',
  type: 'financial-operations',
  status: 'active',
  requiresHumanApproval: true,
  scopes: [
    'ces.transactions.review',
    'ces.transactions.approve',
    'ces.vdollars.issue',
    'ces.publications.upload',
    'ces.subscriptions.maintain',
  ],
  limits: {
    maxSingleVDollarIssue: 10000,
    approvalRequiredForValueMovement: true,
  },
};

export function createNeoBankHandler({ cesAdapter }) {
  if (!cesAdapter) throw new Error('cesAdapter is required');

  return async function neoBankHandler(job) {
    switch (job.action) {
      case 'ces.transactions.review':
        return cesAdapter.reviewTransaction(job.payload);
      case 'ces.transactions.approve':
        return cesAdapter.approveTransaction(job.payload);
      case 'ces.vdollars.issue': {
        const amount = Number(job.payload?.amount);
        if (!Number.isFinite(amount) || amount <= 0) throw new Error('valid V-Dollar amount is required');
        if (amount > NEO_BANK_BOT.limits.maxSingleVDollarIssue) throw new Error('V-Dollar issuance exceeds bot policy limit');
        return cesAdapter.issueVDollars(job.payload);
      }
      case 'ces.publications.upload':
        return cesAdapter.uploadPublication(job.payload);
      case 'ces.subscriptions.maintain':
        return cesAdapter.maintainSubscription(job.payload);
      default:
        throw new Error(`unsupported NEO Bank Bot action: ${job.action}`);
    }
  };
}

export function createStubCesAdapter() {
  const unavailable = (operation) => async () => ({
    ok: false,
    mode: 'stub',
    operation,
    message: 'CES live adapter not configured. No external action was taken.',
  });

  return {
    reviewTransaction: unavailable('reviewTransaction'),
    approveTransaction: unavailable('approveTransaction'),
    issueVDollars: unavailable('issueVDollars'),
    uploadPublication: unavailable('uploadPublication'),
    maintainSubscription: unavailable('maintainSubscription'),
  };
}
