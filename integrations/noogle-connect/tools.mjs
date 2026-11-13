import { createConnectReadiness } from '../../deploy/noogle-render/connect-readiness.mjs';

const platforms = Object.freeze({
  phone: { entry: 'Browser companion', limits: 'Mobile OS sandbox and foreground lifecycle apply. No background control is implemented.' },
  tablet: { entry: 'Browser companion', limits: 'Browser permissions and foreground lifecycle apply. No native agent is implemented.' },
  chromebook: { entry: 'Browser companion; optional Linux companion later', limits: 'Linux availability depends on device and administrator policy.' },
  desktop: { entry: 'Browser companion; optional native companion later', limits: 'File and terminal access require a separately installed, approved agent.' },
  terminal: { entry: 'Local Codex MCP client for this prototype', limits: 'This server provides guidance only; it cannot execute terminal commands.' }
});
const empty = { type: 'object', properties: {}, additionalProperties: false };
const annotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
export const tools = [
  { name: 'noogle_connect_overview', description: 'Describe the NEO Suite Noogle Connect Gate 1 prototype and its limits. Does not inspect or connect devices.', inputSchema: empty, annotations, securitySchemes: [{ type: 'noauth' }] },
  { name: 'noogle_connect_readiness', description: 'Return this prototype configuration readiness, not a live deployment or device health check.', inputSchema: empty, annotations, securitySchemes: [{ type: 'noauth' }] },
  { name: 'noogle_connection_guide', description: 'Explain the planned connection path and platform limits for one device category. Does not enroll a device.', inputSchema: { type: 'object', properties: { platform: { type: 'string', enum: Object.keys(platforms) } }, required: ['platform'], additionalProperties: false }, annotations, securitySchemes: [{ type: 'noauth' }] }
];

// Deliberately use unconfigured dependencies. A tool argument or environment flag
// must never promote this development prototype into authenticated readiness.
const readiness = createConnectReadiness({ getIssuerStatus: async () => false, getDatabaseStatus: async () => false });

export async function callTool(name, args = {}) {
  const tool = tools.find(item => item.name === name);
  if (!tool) throw new Error('unknown_tool');
  if (!args || typeof args !== 'object' || Array.isArray(args)) throw new Error('invalid_arguments');
  const keys = Object.keys(args);
  if (name === 'noogle_connection_guide') {
    if (keys.length !== 1 || keys[0] !== 'platform' || !Object.hasOwn(platforms, args.platform)) throw new Error('invalid_arguments');
    return { mode: 'design-guidance', platform: args.platform, ...platforms[args.platform], connected: false,
      steps: ['Use the planned HTTPS companion on the device.', 'Authenticate through the verified NEO identity service when available.', 'Approve a fresh pairing request on the device.', 'Grant only the specific capability needed; revoke access from the device hub.'],
      implementation: 'Pairing, identity, enrollment and companion deployment remain future gates.' };
  }
  if (keys.length) throw new Error('invalid_arguments');
  if (name === 'noogle_connect_readiness') return { ...await readiness(), evidence: 'local-prototype-configuration', liveProbePerformed: false, publicPluginPublished: false };
  return { name: 'Noogle Connect', suite: 'NEO Suite', project: 'Project 144', gate: 1, mode: 'local-read-only-prototype',
    purpose: 'A consent-based bridge between user devices and ChatGPT/Codex.',
    available: tools.map(item => item.name), devicePlatforms: Object.keys(platforms),
    deviceEnrollmentEnabled: false, terminalExecutionEnabled: false, privateDataAccessEnabled: false,
    publicPluginPublished: false, requiresOpenAIAPIKey: false };
}
