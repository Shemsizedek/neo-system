import { NvsnRegistry } from './registry';
import { planRoute } from './router';
import { createTelegram } from './telegram';
import type { NvsnNode, RoutePlan, TelegramType } from './types';

export interface DeliveryResult<T = unknown> {
  telegramId: string;
  delivered: boolean;
  route: RoutePlan;
  payload: T;
}

export class NvsnSimulator {
  readonly registry = new NvsnRegistry();

  addNodes(...nodes: NvsnNode[]): void {
    nodes.forEach((n) => this.registry.register(n));
  }

  send<T>(source: string, destination: string, type: TelegramType, payload: T): DeliveryResult<T> {
    const telegram = createTelegram({ source, destination, type, payload, ttlSeconds: 300 });
    const route = planRoute(this.registry.list(), source, destination);
    telegram.route = route.hops.flatMap((hop, index) => index === 0 ? [hop.from, hop.to] : [hop.to]);
    return { telegramId: telegram.id, delivered: route.reachable, route, payload };
  }
}

export const demoNodes: NvsnNode[] = [
  {
    id: 'NVSN-HOU-001', neoId: 'NEO-00000144', label: 'Houston Gateway', online: true, trustScore: 0.98,
    neighbors: ['NVSN-CHI-001', 'NVSN-ATL-001'],
    capabilities: [
      { transport: 'internet', bandwidthKbps: 100000, latencyMs: 24, bidirectional: true, costWeight: 0.1 },
      { transport: 'mesh', bandwidthKbps: 5000, latencyMs: 70, bidirectional: true, costWeight: 0.2 },
    ],
  },
  {
    id: 'NVSN-CHI-001', neoId: 'NEO-00000333', label: 'Chicago Relay', online: true, trustScore: 0.96,
    neighbors: ['NVSN-HOU-001', 'NVSN-NYC-001'],
    capabilities: [
      { transport: 'internet', bandwidthKbps: 80000, latencyMs: 30, bidirectional: true, costWeight: 0.1 },
      { transport: 'radio', bandwidthKbps: 64, latencyMs: 180, bidirectional: true, costWeight: 0.4 },
    ],
  },
  {
    id: 'NVSN-ATL-001', neoId: 'NEO-00000444', label: 'Atlanta Mesh Relay', online: true, trustScore: 0.93,
    neighbors: ['NVSN-HOU-001', 'NVSN-NYC-001'],
    capabilities: [
      { transport: 'mesh', bandwidthKbps: 4500, latencyMs: 85, bidirectional: true, costWeight: 0.2 },
      { transport: 'satellite', bandwidthKbps: 12000, latencyMs: 620, bidirectional: true, costWeight: 0.8 },
    ],
  },
  {
    id: 'NVSN-NYC-001', neoId: 'NEO-00000721', label: 'New York Destination', online: true, trustScore: 0.97,
    neighbors: ['NVSN-CHI-001', 'NVSN-ATL-001'],
    capabilities: [
      { transport: 'internet', bandwidthKbps: 90000, latencyMs: 20, bidirectional: true, costWeight: 0.1 },
      { transport: 'satellite', bandwidthKbps: 15000, latencyMs: 600, bidirectional: true, costWeight: 0.8 },
      { transport: 'radio', bandwidthKbps: 64, latencyMs: 160, bidirectional: true, costWeight: 0.4 },
    ],
  },
];