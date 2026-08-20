export const ORANGE_CHIP_FOUNDATION_ADDRESS='1Ky2wRYYrJzqdQJH64F7TR98fqLxJs7LK8'
export type MarketVenue='XCP_DEX'|'CES'|'EXTERNAL'|'NEO_DEX'
export type MarketQuote={venue:MarketVenue;pair:string;bid?:number;ask?:number;last?:number;volume24h?:number;timestamp:string;source:string}
export interface MarketAdapter{venue:MarketVenue;getQuote(pair:string):Promise<MarketQuote|null>}
export const marketAdapterRoadmap={xcpDex:'Read Counterparty order, match, dispenser and asset data from authorized/public Counterparty endpoints.',ces:'Normalize community-exchange balances, offers and trade activity only through authorized coordinator/API access.',external:'Add venue-specific connectors without treating one venue as canonical for price.',neoDex:'Aggregate attributed quotes and route users to non-custodial Counterparty/Bitcoin execution flows.'} as const
