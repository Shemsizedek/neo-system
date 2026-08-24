import type {HashpowerAllocation} from './types'

export type HashpowerOrderStatus='OPEN'|'RESERVED'|'FILLED'|'CANCELLED'
export interface HashpowerOrder{ id:string; side:'ASK'|'BID'; seller:string; hashrateTh:number; termMonths:number; priceUsdPerThMonth:number; currency:string; backing:'VERIFIED'|'PENDING'; slaPct:number; status:HashpowerOrderStatus }
export interface CapacityReservation{ id:string; orderId:string; customer:string; hashrateTh:number; expiresAt:string; status:'ACTIVE'|'CONVERTED'|'EXPIRED'|'CANCELLED' }

export const seedOrders:HashpowerOrder[]=[
{id:'HX-ASK-001',side:'ASK',seller:'NEO Miner Fleet',hashrateTh:25,termMonths:3,priceUsdPerThMonth:4.25,currency:'USD',backing:'VERIFIED',slaPct:97,status:'OPEN'},
{id:'HX-ASK-002',side:'ASK',seller:'NEO Miner Fleet',hashrateTh:100,termMonths:6,priceUsdPerThMonth:4.0,currency:'USD',backing:'VERIFIED',slaPct:98,status:'OPEN'},
{id:'HX-ASK-003',side:'ASK',seller:'NEO Miner Fleet',hashrateTh:250,termMonths:12,priceUsdPerThMonth:3.7,currency:'USD',backing:'VERIFIED',slaPct:98.5,status:'OPEN'},
{id:'HX-BID-001',side:'BID',seller:'Demo Buyer A',hashrateTh:50,termMonths:6,priceUsdPerThMonth:3.65,currency:'USD',backing:'PENDING',slaPct:97,status:'OPEN'}]

export function exchangeAvailableTh(physicalTh:number,allocations:HashpowerAllocation[],reservations:CapacityReservation[]=[]){
 const allocated=allocations.filter(a=>['ALLOCATED','MINING','DEGRADED'].includes(a.status)).reduce((s,a)=>s+a.targetHashrateTh,0)
 const reserved=reservations.filter(r=>r.status==='ACTIVE').reduce((s,r)=>s+r.hashrateTh,0)
 return Math.max(0,physicalTh-allocated-reserved)
}
export function orderNotionalUsd(order:HashpowerOrder){return order.hashrateTh*order.termMonths*order.priceUsdPerThMonth}
export function canReserve(order:HashpowerOrder,availableTh:number){return order.side==='ASK'&&order.status==='OPEN'&&order.backing==='VERIFIED'&&order.hashrateTh<=availableTh}
export function createReservation(order:HashpowerOrder,customer:string,minutes=15):CapacityReservation{
 const expires=new Date(Date.now()+minutes*60_000).toISOString()
 return{id:`HXR-${Date.now()}`,orderId:order.id,customer,hashrateTh:order.hashrateTh,expiresAt:expires,status:'ACTIVE'}
}
