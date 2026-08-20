import type { NvsnCapability, NvsnNode, NvsnTransport, RouteHop, RoutePlan } from './types';

const transportPreference: Record<NvsnTransport, number> = {
  internet: 1,
  cellular: 1.15,
  sip: 1.2,
  mesh: 1.35,
  sms: 1.7,
  ussd: 1.75,
  pstn: 1.8,
  radio: 2,
  satellite: 2.2,
};

function capabilityScore(capability: NvsnCapability): number {
  const bandwidthPenalty = 1000 / Math.max(capability.bandwidthKbps, 1);
  const latencyPenalty = capability.latencyMs / 1000;
  const directionPenalty = capability.bidirectional ? 0 : 0.5;
  return transportPreference[capability.transport] + bandwidthPenalty + latencyPenalty + capability.costWeight + directionPenalty;
}

function bestSharedTransport(a: NvsnNode, b: NvsnNode): { transport: NvsnTransport; score: number } | null {
  const bTransports = new Set(b.capabilities.map((c) => c.transport));
  const candidates = a.capabilities
    .filter((c) => bTransports.has(c.transport))
    .map((c) => ({ transport: c.transport, score: capabilityScore(c) + capabilityScore(b.capabilities.find((x) => x.transport === c.transport)!) }));
  candidates.sort((x, y) => x.score - y.score);
  return candidates[0] ?? null;
}

export function planRoute(nodes: NvsnNode[], source: string, destination: string): RoutePlan {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  if (!byId.has(source) || !byId.has(destination)) return { source, destination, hops: [], totalScore: Infinity, reachable: false };

  const dist = new Map<string, number>([[source, 0]]);
  const prev = new Map<string, { node: string; hop: RouteHop }>();
  const queue = new Set(nodes.filter((n) => n.online).map((n) => n.id));

  while (queue.size) {
    let current: string | undefined;
    let best = Infinity;
    for (const id of queue) {
      const d = dist.get(id) ?? Infinity;
      if (d < best) { best = d; current = id; }
    }
    if (!current || best === Infinity) break;
    queue.delete(current);
    if (current === destination) break;

    const node = byId.get(current)!;
    for (const neighborId of node.neighbors) {
      if (!queue.has(neighborId)) continue;
      const neighbor = byId.get(neighborId);
      if (!neighbor?.online) continue;
      const shared = bestSharedTransport(node, neighbor);
      if (!shared) continue;
      const trustPenalty = (2 - node.trustScore - neighbor.trustScore) * 2;
      const hopScore = shared.score + trustPenalty;
      const alt = best + hopScore;
      if (alt < (dist.get(neighborId) ?? Infinity)) {
        dist.set(neighborId, alt);
        prev.set(neighborId, { node: current, hop: { from: current, to: neighborId, transport: shared.transport, score: hopScore } });
      }
    }
  }

  if (!dist.has(destination)) return { source, destination, hops: [], totalScore: Infinity, reachable: false };
  const hops: RouteHop[] = [];
  let cursor = destination;
  while (cursor !== source) {
    const p = prev.get(cursor);
    if (!p) return { source, destination, hops: [], totalScore: Infinity, reachable: false };
    hops.unshift(p.hop);
    cursor = p.node;
  }
  return { source, destination, hops, totalScore: dist.get(destination)!, reachable: true };
}