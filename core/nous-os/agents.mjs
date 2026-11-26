// Explicit routing catalog for the existing N.I.A. registry. No remote adapters are active.
export const AGENTS = Object.freeze([
  { id: 'NIA-001', name: 'NEOsync Prime', capabilities: ['project.plan', 'knowledge.read'] },
  { id: 'NIA-006', name: 'Treasury Intelligence Agent', capabilities: ['finance.review'] },
  { id: 'NIA-007', name: 'Education Intelligence Agent', capabilities: ['education.read', 'project.plan'] },
  { id: 'NIA-008', name: 'Technology Intelligence Agent', capabilities: ['development.plan', 'project.plan'] },
  { id: 'NIA-013', name: 'Rudwaan Instagram Nous Agent', capabilities: ['knowledge.read'] },
]);

export const agentById = (id) => AGENTS.find(agent => agent.id === id);
