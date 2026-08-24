import type { MerchantOpsState } from '../merchant/types';

export type SyncEntity='merchant_ops'|'transaction'|'register_session'|'inventory_adjustment';

export type SyncEnvelope<T=unknown>={
  id:string;
  entity:SyncEntity;
  merchantId:string;
  terminalId:string;
  version:number;
  updatedAt:string;
  payload:T;
};

export type SyncConflict<T=unknown>={
  local:SyncEnvelope<T>;
  remote:SyncEnvelope<T>;
  resolution:'remote_wins'|'local_wins'|'manual';
};

export type SyncSnapshot={
  merchantOps:SyncEnvelope<MerchantOpsState>;
  cursor?:string;
};

export type SyncQueueItem={
  id:string;
  envelope:SyncEnvelope;
  attempts:number;
  queuedAt:string;
  lastError?:string;
};

export interface SyncTransport{
  pull(merchantId:string,afterVersion?:number):Promise<SyncSnapshot|null>;
  push(envelope:SyncEnvelope):Promise<SyncEnvelope>;
}
