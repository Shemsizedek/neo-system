import type { NvsnTransport } from './types';

export interface NodeTelemetry {
  nodeId: string;
  observedAt: string;
  online: boolean;
  queueDepth: number;
  delivered: number;
  failed: number;
  transports: Partial<Record<NvsnTransport, { available: boolean; latencyMs?: number }>>;
}

export class TelemetryStore {
  private readonly latest = new Map<string, NodeTelemetry>();
  record(sample: NodeTelemetry): void { this.latest.set(sample.nodeId, sample); }
  get(nodeId: string): NodeTelemetry | undefined { return this.latest.get(nodeId); }
  snapshot(): NodeTelemetry[] { return [...this.latest.values()]; }
}
