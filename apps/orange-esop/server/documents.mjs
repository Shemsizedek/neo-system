import { createHash, randomUUID } from 'node:crypto';

function hash(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function buildParticipantCertificate({ participant, plan, allocation, vesting, valuation, reconciliation }) {
  if (!participant?.participantId) throw new Error('participant_required');
  if (reconciliation?.status !== 'PASS') throw new Error('reconciliation_pass_required');
  if (!allocation || !vesting || !valuation) throw new Error('allocation_vesting_valuation_required');

  const core = {
    certificateType: 'RCF-013',
    certificateId: `RCF-013-${randomUUID()}`,
    participantId: participant.participantId,
    participantName: participant.templeName || participant.legalName || participant.participantId,
    chaplaincyOffice: participant.chaplaincyOffice || null,
    planId: plan?.planId || 'ORANGE-ESOP-001',
    trustId: plan?.trustId || 'OESOP-TRUST-001',
    underlyingSecurity: allocation.underlyingSecurity || null,
    allocatedEmployerShares: allocation.employerShares,
    neotrustRepresentativeUnits: allocation.neotrustUnits,
    vestedPercent: vesting.vestingPercent,
    vestedUnits: vesting.vestedNeotrust,
    unvestedUnits: vesting.unvestedNeotrust,
    valuationId: valuation.valuationId,
    valuationDate: valuation.valuationDate,
    status: 'ISSUED',
    issuedAt: new Date().toISOString()
  };
  return { ...core, documentHash: hash(core) };
}

export function buildAnnualStatement({ participant, planYear, stewardship = [], allocation, vesting, valuation, reconciliation }) {
  if (!participant?.participantId) throw new Error('participant_required');
  if (reconciliation?.status !== 'PASS') throw new Error('reconciliation_pass_required');

  const core = {
    statementType: 'RCF-015',
    statementId: `RCF-015-${randomUUID()}`,
    participantId: participant.participantId,
    planYear,
    stewardshipSummary: {
      entries: stewardship.length,
      hours: stewardship.reduce((sum, row) => sum + Number(row.hours || 0), 0)
    },
    allocation: allocation || null,
    vesting: vesting || null,
    valuation: valuation || null,
    generatedAt: new Date().toISOString()
  };
  return { ...core, documentHash: hash(core) };
}
