import { loadNeoSystemBootstrap } from '../core/neo-bootstrap/context-loader.mjs';

try {
  const loaded = await loadNeoSystemBootstrap({ rootDir: process.cwd() });
  const moduleCount = Array.isArray(loaded.context.modules)
    ? loaded.context.modules.length
    : Object.keys(loaded.context.modules ?? {}).length;
  const routeCount = Object.keys(loaded.router.routing ?? {}).length;

  console.log(JSON.stringify({
    ok: true,
    schema: loaded.context.schema,
    version: loaded.context.version,
    system: loaded.context.system.id,
    architecture: loaded.context.system.architecture,
    modules: moduleCount,
    routes: routeCount,
    humanReviewRequired: loaded.meta.humanReviewRequired,
    autonomousOperationalAuthority: loaded.meta.autonomousOperationalAuthority,
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exitCode = 1;
}
