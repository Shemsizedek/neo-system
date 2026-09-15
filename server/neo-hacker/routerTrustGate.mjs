import { evaluateToolRequest } from './policy.mjs';

export function evaluateRouterTrust({ registry, deviceId, toolRequest = {} } = {}) {
  if (!registry) throw new TypeError('registry is required');
  const deviceTrust = registry.evaluateTrust(deviceId);
  if (!deviceTrust.trusted) {
    return { allowed: false, stage: 'device-trust', reason: deviceTrust.reason, deviceTrust };
  }
  const toolDecision = evaluateToolRequest(toolRequest);
  if (!toolDecision.allowed) {
    return { allowed: false, stage: 'tool-policy', reason: toolDecision.reason, deviceTrust, toolDecision };
  }
  return { allowed: true, stage: 'authorized', reason: 'trusted-device-and-policy-permitted', deviceTrust, toolDecision };
}
