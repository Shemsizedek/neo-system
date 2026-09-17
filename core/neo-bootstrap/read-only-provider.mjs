import { loadNeoSystemBootstrap } from './context-loader.mjs';

function clone(value) {
  return structuredClone(value);
}

export async function createNeoBootstrapReadOnlyProvider(options = {}) {
  const bootstrap = await loadNeoSystemBootstrap(options);

  const summary = Object.freeze({
    systemId: bootstrap.context.system.id,
    version: bootstrap.context.version,
    architecture: bootstrap.context.system.architecture,
    authority: bootstrap.meta.authority,
    humanReviewRequired: bootstrap.meta.humanReviewRequired,
    autonomousOperationalAuthority: bootstrap.meta.autonomousOperationalAuthority,
    epistemicStates: Object.freeze([...(bootstrap.context.epistemicStates ?? [])]),
    readinessDimensions: Object.freeze([...(bootstrap.context.readinessDimensions ?? [])]),
  });

  return Object.freeze({
    mode: 'read-only-context-provider',
    summary,
    getSummary() {
      return clone(summary);
    },
    getRouting() {
      return clone(bootstrap.router.routing);
    },
    getCrossSystemControls() {
      return clone(bootstrap.router.cross_system);
    },
    getRules() {
      return clone(bootstrap.router.rules);
    },
    getModuleContext(moduleId) {
      const modules = bootstrap.context.modules ?? [];
      if (!modules.includes(moduleId)) return null;
      const routedDomains = Object.entries(bootstrap.router.routing)
        .filter(([, targets]) => targets.includes(moduleId))
        .map(([domain]) => domain);
      return {
        moduleId,
        routedDomains,
        authority: bootstrap.meta.authority,
        humanReviewRequired: true,
        autonomousOperationalAuthority: false,
      };
    },
  });
}
