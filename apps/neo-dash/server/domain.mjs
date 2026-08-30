export const SERVICE_TYPES = new Set(['RIDE','FOOD','PACKAGE','GROCERY','COURIER','ERRAND']);
export const SETTLEMENT_ASSETS = new Set(['BTC','XCP','NOMNI']);
export const PROVIDER_ROLES = new Set(['DRIVER','COURIER','MERCHANT','FLEET_OPERATOR']);

export const REQUIRED_ROLE = Object.freeze({
  RIDE: 'DRIVER',
  FOOD: 'COURIER',
  PACKAGE: 'COURIER',
  GROCERY: 'COURIER',
  COURIER: 'COURIER',
  ERRAND: 'COURIER'
});

export const TRANSITIONS = Object.freeze({
  DRAFT: ['QUOTED','CANCELLED'],
  QUOTED: ['MATCHING','EXPIRED','CANCELLED'],
  MATCHING: ['OFFERED','NO_PROVIDER','CANCELLED'],
  OFFERED: ['ACCEPTED','MATCHING','EXPIRED','CANCELLED'],
  ACCEPTED: ['PAYMENT_PENDING','CANCELLED'],
  PAYMENT_PENDING: ['CONFIRMED','CANCELLED'],
  CONFIRMED: ['ARRIVING','CANCELLED'],
  ARRIVING: ['PICKUP_READY','CANCELLED'],
  PICKUP_READY: ['IN_PROGRESS','CANCELLED'],
  IN_PROGRESS: ['COMPLETED','DISPUTED','SUSPENDED'],
  COMPLETED: ['SETTLED','DISPUTED'],
  SETTLED: ['CLOSED','REFUNDED','DISPUTED'],
  CLOSED: [], CANCELLED: [], EXPIRED: [], NO_PROVIDER: [], REFUNDED: [], DISPUTED: [], SUSPENDED: []
});

export function assertServiceType(value){
  if(!SERVICE_TYPES.has(value)) throw new Error('unsupported_service_type');
  return value;
}

export function assertSettlementAsset(value){
  if(!SETTLEMENT_ASSETS.has(value)) throw new Error('unsupported_settlement_asset');
  return value;
}

export function requiredProviderRole(serviceType){
  assertServiceType(serviceType);
  return REQUIRED_ROLE[serviceType];
}

export function canTransition(from,to){
  return Boolean(TRANSITIONS[from]?.includes(to));
}

export function assertTransition(from,to){
  if(!canTransition(from,to)) throw new Error(`invalid_transition:${from}->${to}`);
}

function n(value){
  const parsed=Number(value||0);
  return Number.isFinite(parsed) && parsed>0 ? parsed : 0;
}

export function deriveQuote(input={}){
  const serviceType=assertServiceType(input.serviceType);
  const distanceKm=n(input.distanceKm);
  const durationMinutes=n(input.durationMinutes);
  const merchantSubtotalWorld=n(input.merchantSubtotalWorld);
  const waitMinutes=n(input.waitMinutes);
  const tollsWorld=n(input.tollsWorld);

  const baseByService={RIDE:6,FOOD:3,PACKAGE:4,GROCERY:5,COURIER:5,ERRAND:5};
  const distanceRate={RIDE:1.25,FOOD:0.8,PACKAGE:0.95,GROCERY:0.85,COURIER:1,ERRAND:0.9};
  const timeRate={RIDE:0.28,FOOD:0.1,PACKAGE:0.12,GROCERY:0.12,COURIER:0.15,ERRAND:0.15};

  const components=[
    {code:'BASE',amountWorld:baseByService[serviceType]},
    {code:'DISTANCE',amountWorld:distanceKm*distanceRate[serviceType]},
    {code:'TIME',amountWorld:durationMinutes*timeRate[serviceType]},
    {code:'MERCHANT_SUBTOTAL',amountWorld:merchantSubtotalWorld},
    {code:'WAIT',amountWorld:waitMinutes*0.2},
    {code:'TOLLS',amountWorld:tollsWorld}
  ].filter(item=>item.amountWorld>0).map(item=>({...item,amountWorld:Number(item.amountWorld.toFixed(2))}));

  const commercialAmountWorld=Number(components.reduce((sum,item)=>sum+item.amountWorld,0).toFixed(2));
  return {serviceType,commercialAmountWorld,components};
}

export function providerCanServe(provider,serviceType){
  const requiredRole=requiredProviderRole(serviceType);
  if(provider.status!=='APPROVED') return false;
  if(!provider.roles?.includes(requiredRole)) return false;
  if(provider.suspended) return false;
  if(provider.activeExclusiveJobId) return false;
  if(requiredRole==='DRIVER'){
    return Boolean(provider.authorities?.driverLicense && provider.authorities?.vehicle && provider.authorities?.insurance);
  }
  return true;
}
