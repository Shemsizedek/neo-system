export type TxStatus='CREATED'|'QUOTED'|'AUTHORIZED'|'FUNDS_RECEIVED'|'RISK_CHECKED'|'SETTLEMENT_PENDING'|'SETTLED'|'COMPLETED'|'DECLINED'|'FAILED'|'MANUAL_REVIEW'
export type TellerStatus='ONLINE'|'OFFLINE'|'MAINTENANCE'|'SUSPENDED'|'EMERGENCY_LOCK'
export interface Teller{id:string;name:string;city:string;country:string;status:TellerStatus;cashUsd:number;btc:number;xcp:number;heartbeat:string}
export interface Transaction{id:string;tellerId:string;type:string;source:string;destination:string;amount:number;fiatValue:number;status:TxStatus;risk:number;createdAt:string}
export interface LedgerEntry{id:string;transactionId:string;account:string;asset:string;debit:number;credit:number;reference:string}
