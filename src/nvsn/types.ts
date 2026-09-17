export type NvsnTransport = 'internet' | 'cellular' | 'sms' | 'ussd' | 'pstn' | 'sip' | 'radio' | 'mesh' | 'satellite';
export type TelegramType = 'text' | 'voice' | 'data' | 'payment' | 'telemetry' | 'command';
export type TelegramPriority = 'bulk' | 'normal' | 'urgent' | 'emergency';

export interface NvsnCapability {
  transport: NvsnTransport;
  bandwidthKbps: number;
  latencyMs: number;
  bidirectional: boolean;
  costWeight: number;
}

export interface NvsnNode {
  id: string;
  neoId: string;
  label: string;
  online: boolean;
  trustScore: number;
  capabilities: NvsnCapability[];
  neighbors: string[];
}

export interface TelegramSecurity {
  nonce: string;
  algorithm: 'Ed25519' | 'demo-fnv1a';
  keyId?: string;
}

export interface NvsnTelegram<T = unknown> {
  id: string;
  version: 'NVSN/1.0' | 'NVSN/1.1';
  source: string;
  destination: string;
  type: TelegramType;
  priority: TelegramPriority;
  createdAt: string;
  expiresAt?: string;
  payload: T;
  route?: string[];
  security: TelegramSecurity;
  signature?: string;
}

export interface RouteHop { from: string; to: string; transport: NvsnTransport; score: number; }
export interface RoutePlan { source: string; destination: string; hops: RouteHop[]; totalScore: number; reachable: boolean; }

export interface SettlementInstruction {
  asset: 'BTC' | 'XCP' | string;
  rail: 'bitcoin' | 'lightning' | 'counterparty';
  amount: string;
  memo?: string;
}

export interface QueuedTelegram<T = unknown> {
  telegram: NvsnTelegram<T>;
  attempts: number;
  queuedAt: string;
  nextAttemptAt: string;
}
