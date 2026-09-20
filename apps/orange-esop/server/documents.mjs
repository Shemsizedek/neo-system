export function buildParticipantCertificate({ participant, allocation, vesting, plan }) {
  if (!participant || !allocation || !vesting) throw new Error("participant, allocation and vesting required");
  return {
    form: "RCF-013",
    title: "NEOTRUST ESOP Participant Certificate",
    planId: plan?.planId || "ORANGE-ESOP-001",
    participantId: participant.participantId,
    participantName: participant.legalName || participant.templeName || participant.participantId,
    chaplaincyOffice: participant.chaplaincyOffice || null,
    employerShares: allocation.employerShares,
    neotrustUnits: allocation.neotrustUnits,
    vestedPercent: vesting.vestingPercent,
    vestedUnits: vesting.vestedNeotrust,
    unvestedUnits: vesting.unvestedNeotrust,
    status: "DRAFT",
    notice: "Legal rights are governed by the adopted plan, trust, corporate and participant records. Token possession alone does not supersede those records."
  };
}

export function buildAnnualStatement({ participant, stewardship = [], allocation, vesting, planYear }) {
  return {
    form: "RCF-015",
    title: "Annual ESOP + Holy Stewardship Statement",
    planYear,
    participantId: participant.participantId,
    stewardshipSummary: {
      entries: stewardship.length,
      hours: stewardship.reduce((sum, x) => sum + Number(x.hours || 0), 0),
      categories: [...new Set(stewardship.map(x => x.category))]
    },
    allocation: allocation || null,
    vesting: vesting || null
  };
}
