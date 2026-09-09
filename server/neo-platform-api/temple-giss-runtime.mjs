import { createTempleCitizenGISSService } from './temple-citizen-giss.mjs';

// Runtime boundary for the Temple/GISS registry.
// Production must inject a managed persistent registry (Firestore target).
// We intentionally do not fall back to process memory because identity,
// Book of Life, enrollment, degree, and portfolio state must survive restarts.
export function createTempleGissRuntime({ now = () => new Date().toISOString(), registry } = {}) {
  if (!registry) {
    throw new Error('temple_giss_persistent_registry_required');
  }

  return {
    registry,
    service: createTempleCitizenGISSService({ registry, now })
  };
}
