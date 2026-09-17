import type { NvsnTelegram, NvsnTransport } from './types';

export interface TransportHealth { available: boolean; latencyMs?: number; bandwidthKbps?: number; detail?: string; }
export interface TransportReceipt { accepted: boolean; transport: NvsnTransport; externalId?: string; detail?: string; }

export interface NvsnTransportAdapter {
  readonly id: string;
  readonly transport: NvsnTransport;
  health(): Promise<TransportHealth>;
  send(telegram: NvsnTelegram): Promise<TransportReceipt>;
}

export class TransportAdapterRegistry {
  private readonly adapters = new Map<NvsnTransport, NvsnTransportAdapter[]>();
  register(adapter: NvsnTransportAdapter): void {
    const current = this.adapters.get(adapter.transport) ?? [];
    if (current.some((item) => item.id === adapter.id)) throw new Error(`Adapter already registered: ${adapter.id}`);
    this.adapters.set(adapter.transport, [...current, adapter]);
  }
  list(transport?: NvsnTransport): NvsnTransportAdapter[] {
    return transport ? [...(this.adapters.get(transport) ?? [])] : [...this.adapters.values()].flat();
  }
  async healthy(transport: NvsnTransport): Promise<NvsnTransportAdapter[]> {
    const candidates = this.list(transport);
    const checks = await Promise.all(candidates.map(async (adapter) => ({ adapter, health: await adapter.health() })));
    return checks.filter(({ health }) => health.available).map(({ adapter }) => adapter);
  }
}
