import type { NvsnTransport, RoutePlan, TelegramType } from './types';

export interface RoutePolicy {
  allowTransports?: NvsnTransport[];
  denyTransports?: NvsnTransport[];
  maxScore?: number;
  maxHops?: number;
  messageTypes?: TelegramType[];
}

export function routeAllowed(plan: RoutePlan, type: TelegramType, policy: RoutePolicy): boolean {
  if (policy.messageTypes && !policy.messageTypes.includes(type)) return false;
  if (policy.maxScore !== undefined && plan.totalScore > policy.maxScore) return false;
  if (policy.maxHops !== undefined && plan.hops.length > policy.maxHops) return false;
  for (const hop of plan.hops) {
    if (policy.denyTransports?.includes(hop.transport)) return false;
    if (policy.allowTransports && !policy.allowTransports.includes(hop.transport)) return false;
  }
  return plan.reachable;
}
