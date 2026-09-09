import { createInMemoryTempleRegistry, createTempleCitizenGISSService } from './temple-citizen-giss.mjs';

// Runtime adapter boundary. Production persistence can replace this registry without changing HTTP routes.
export function createTempleGissRuntime({ now = () => new Date().toISOString(), registry } = {}) {
  const activeRegistry = registry || createInMemoryTempleRegistry();
  return { registry: activeRegistry, service: createTempleCitizenGISSService({ registry: activeRegistry, now }) };
}
