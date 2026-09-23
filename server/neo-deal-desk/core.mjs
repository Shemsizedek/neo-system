const DEFAULT_PRICING = Object.freeze({
  retail: {
    individual: 49,
    professional: 144,
    creator_business: 333,
    enterprise_seat: 999,
  },
  organization: [5000, 15000],
  institutional: [25000, 100000],
  private_deployment_annual_minimum: 144000,
  white_label_foundation_minimum: 250000,
  white_label_enterprise: [500000, 1250000],
  sovereign_institutional: [1500000, 5000000],
  architecture: {
    strategic: [75000, 144000],
    ai_mvp: [144000, 300000],
    production_ai: [300000, 750000],
    enterprise_os: [750000, 2000000],
    ecosystem: [2000000, 5000000],
    sovereign: [5000000, 25000000],
  },
  acquisition_opening_ask: 50000000,
  acquisition_discussion_floor: 25000000,
  financing_pre_money: [20000000, 35000000],
  financing_raise: [2000000, 5000000],
});

export const DEAL_CLASSES = Object.freeze([
  'retail',
  'organization_saas',
  'institutional_saas',
  'private_deployment',
  'white_label_foundation',
  'white_label_enterprise',
  'sovereign_institutional',
  'systems_architecture',
  'strategic_license',
  'equity_investment',
  'ip_acquisition',
]);

export const DEAL_STAGES = Object.freeze([
  'discovered',
  'enriched',
  'qualified',
  'priced',
  'draft_ready',
  'approval_required',
  'approved_to_send',
  'contacted',
  'engaged',
  'negotiating',
  'won',
  'lost',
  'archived',
]);

export const APPROVAL_REASONS = Object.freeze([
  'securities_solicitation',
  'equity_terms',
  'token_or_revenue_share',
  'discount_below_minimum',
  'binding_commitment',
  'ip_transfer',
  'exclusive_or_perpetual_rights',
  'accept_funds',
]);

const clean = (value, max = 240) => String(value ?? '').trim().slice(0, max);
const clamp = (n, min, max) => Math.max(min, Math.min(max, Number(n) || 0));

export function classifyProspect(input = {}) {
  const sector = clean(input.sector, 80).toLowerCase();
  const intent = clean(input.intent, 120).toLowerCase();
  const size = clean(input.size, 40).toLowerCase();
  if (/acquire|buy.*company|buy.*ip|purchase.*ip/.test(intent)) return 'ip_acquisition';
  if (/invest|equity|seed|venture|capital/.test(intent)) return 'equity_investment';
  if (/white.?label/.test(intent) && /enterprise|large/.test(size)) return 'white_label_enterprise';
  if (/white.?label/.test(intent)) return 'white_label_foundation';
  if (/government|municipal|tribal|sovereign|agency/.test(sector)) return 'sovereign_institutional';
  if (/custom|build|architecture|operating system|platform/.test(intent)) return 'systems_architecture';
  if (/institution|university|healthcare|bank|law|ngo|church|denomination/.test(sector)) return 'institutional_saas';
  if (/private deployment|private cloud|single tenant/.test(intent)) return 'private_deployment';
  if (/company|business|enterprise|organization/.test(sector)) return 'organization_saas';
  return 'retail';
}

export function scoreProspect(input = {}) {
  const budget = Math.max(0, Number(input.budgetUsd) || 0);
  const authority = clean(input.decisionAuthority, 40).toLowerCase();
  const timelineDays = Math.max(0, Number(input.timelineDays) || 365);
  const need = clamp(input.needStrength ?? 0, 0, 10);
  const fit = clamp(input.productFit ?? 0, 0, 10);
  const engagement = clamp(input.engagement ?? 0, 0, 10);

  let score = 0;
  score += fit * 3;
  score += need * 2.5;
  score += engagement * 1.5;
  score += /owner|founder|ceo|cfo|cio|cto|partner|director|procurement|trustee|authorized/.test(authority) ? 15 : 5;
  score += budget >= 2_000_000 ? 15 : budget >= 500_000 ? 12 : budget >= 144_000 ? 9 : budget >= 25_000 ? 5 : 0;
  score += timelineDays <= 30 ? 10 : timelineDays <= 90 ? 7 : timelineDays <= 180 ? 4 : 1;

  const rounded = Math.round(clamp(score, 0, 100));
  const grade = rounded >= 80 ? 'A' : rounded >= 65 ? 'B' : rounded >= 50 ? 'C' : 'D';
  return { score: rounded, grade };
}

export function quoteDeal(input = {}, pricing = DEFAULT_PRICING) {
  const dealClass = input.dealClass || classifyProspect(input);
  const users = Math.max(1, Number(input.users) || 1);
  const complexity = clamp(input.complexity ?? 5, 1, 10);
  let ask = 0;
  let recurring = null;
  let range = null;

  switch (dealClass) {
    case 'retail': ask = pricing.retail.professional; recurring = { cadence:'monthly', amount:ask }; break;
    case 'organization_saas': range = pricing.organization; ask = range[1]; recurring = { cadence:'monthly', amount:ask }; break;
    case 'institutional_saas': range = pricing.institutional; ask = range[1]; recurring = { cadence:'monthly', amount:ask }; break;
    case 'private_deployment': ask = pricing.private_deployment_annual_minimum; recurring = { cadence:'annual', amount:ask }; break;
    case 'white_label_foundation': ask = pricing.white_label_foundation_minimum; recurring = { cadence:'monthly', range:[5000,15000] }; break;
    case 'white_label_enterprise': range = pricing.white_label_enterprise; ask = range[0] + Math.round((range[1]-range[0]) * ((complexity-1)/9)); recurring = { cadence:'monthly', range:[15000,50000] }; break;
    case 'sovereign_institutional': range = pricing.sovereign_institutional; ask = range[0] + Math.round((range[1]-range[0]) * ((complexity-1)/9)); recurring = { cadence:'annual', range:[250000,1000000] }; break;
    case 'systems_architecture': {
      const band = complexity >= 10 ? pricing.architecture.sovereign : complexity >= 8 ? pricing.architecture.ecosystem : complexity >= 6 ? pricing.architecture.enterprise_os : complexity >= 4 ? pricing.architecture.production_ai : pricing.architecture.strategic;
      range = band; ask = band[0] + Math.round((band[1]-band[0]) * ((complexity-1)/9)); break;
    }
    case 'ip_acquisition': ask = pricing.acquisition_opening_ask; range = [pricing.acquisition_discussion_floor, pricing.acquisition_opening_ask]; break;
    case 'equity_investment': return { dealClass, ask:null, recurring:null, range:pricing.financing_raise, valuationRange:pricing.financing_pre_money, approvalRequired:true, approvalReasons:['securities_solicitation','equity_terms'], nonBinding:true };
    case 'strategic_license': ask = Math.max(pricing.white_label_enterprise[0], users * 1000); recurring = { cadence:'annual', amount:Math.max(250000, Math.round(ask*0.2)) }; break;
    default: throw new Error('unsupported_deal_class');
  }

  return { dealClass, ask, recurring, range, approvalRequired:false, approvalReasons:[], nonBinding:true };
}

export function evaluateApproval(input = {}) {
  const reasons = new Set();
  const kind = input.dealClass || classifyProspect(input);
  if (kind === 'equity_investment') reasons.add('securities_solicitation');
  if (input.includesEquityTerms) reasons.add('equity_terms');
  if (input.includesTokenTerms || input.includesRevenueShare) reasons.add('token_or_revenue_share');
  if (input.discountBelowMinimum) reasons.add('discount_below_minimum');
  if (input.binding) reasons.add('binding_commitment');
  if (input.transfersIp) reasons.add('ip_transfer');
  if (input.exclusive || input.perpetual) reasons.add('exclusive_or_perpetual_rights');
  if (input.acceptsFunds) reasons.add('accept_funds');
  return { approvalRequired: reasons.size > 0, reasons:[...reasons] };
}

export function buildOpportunity(input = {}) {
  const dealClass = input.dealClass || classifyProspect(input);
  const qualification = scoreProspect(input);
  const quote = quoteDeal({ ...input, dealClass });
  const approval = evaluateApproval({ ...input, dealClass, includesEquityTerms:dealClass==='equity_investment' });
  const stage = approval.approvalRequired ? 'approval_required' : 'draft_ready';

  return {
    prospect: {
      name: clean(input.name, 100),
      organization: clean(input.organization, 140),
      sector: clean(input.sector, 80),
      geography: clean(input.geography, 100),
      decisionAuthority: clean(input.decisionAuthority, 80),
    },
    dealClass,
    qualification,
    quote: { ...quote, approvalRequired: approval.approvalRequired, approvalReasons:approval.reasons },
    stage,
    nextAction: approval.approvalRequired ? 'route_to_human_approval_queue' : 'prepare_non_binding_outreach',
    crmRecord: {
      type: 'lead',
      name: clean(input.organization || input.name || 'Unnamed prospect', 100),
      status: 'active',
      owner: 'NIA-013 DEALDESK',
      description: clean(`${dealClass} | score ${qualification.score}/100 | ask ${quote.ask ?? 'terms gated'}`, 1000),
      tags: ['dealdesk', dealClass, `grade-${qualification.grade.toLowerCase()}`].join(','),
    },
  };
}
