import { readFile } from 'node:fs/promises';
import path from 'node:path';

const REQUIRED_READINESS = ['capability', 'capacity', 'readiness', 'deployment'];
const REQUIRED_EPISTEMIC_STATES = ['KNOWN', 'UNKNOWN', 'UNVERIFIED', 'DISPUTED', 'ASSESSED'];

function assert(condition, message) {
  if (!condition) throw new Error(`NEO bootstrap validation failed: ${message}`);
}

function parseScalar(raw) {
  const value = raw.trim();
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

export function parseRestrictedYaml(source) {
  assert(typeof source === 'string', 'YAML source must be a string');
  assert(!/[&*!]|<<:|[>|]\s*$/.test(source), 'advanced YAML features are not permitted');

  const root = {};
  const stack = [{ indent: -1, value: root }];
  const lines = source.split(/\r?\n/);

  for (let lineNo = 0; lineNo < lines.length; lineNo += 1) {
    const original = lines[lineNo];
    if (!original.trim() || original.trimStart().startsWith('#')) continue;
    assert(!original.includes('\t'), `tabs are not allowed (line ${lineNo + 1})`);

    const indent = original.match(/^ */)[0].length;
    assert(indent % 2 === 0, `indentation must use two-space increments (line ${lineNo + 1})`);
    const text = original.trim();

    while (stack.length > 1 && indent <= stack.at(-1).indent) stack.pop();
    const parent = stack.at(-1).value;

    if (text.startsWith('- ')) {
      assert(Array.isArray(parent), `list item without list parent (line ${lineNo + 1})`);
      parent.push(parseScalar(text.slice(2)));
      continue;
    }

    const colon = text.indexOf(':');
    assert(colon > 0, `expected key/value mapping (line ${lineNo + 1})`);
    const key = text.slice(0, colon).trim();
    const rawValue = text.slice(colon + 1).trim();
    assert(key && !Object.prototype.hasOwnProperty.call(parent, key), `duplicate key '${key}' (line ${lineNo + 1})`);

    if (rawValue) {
      parent[key] = parseScalar(rawValue);
      continue;
    }

    let nextNonBlank = lineNo + 1;
    while (nextNonBlank < lines.length && !lines[nextNonBlank].trim()) nextNonBlank += 1;
    const nextText = nextNonBlank < lines.length ? lines[nextNonBlank].trim() : '';
    const child = nextText.startsWith('- ') ? [] : {};
    parent[key] = child;
    stack.push({ indent, value: child });
  }

  return root;
}

export function validateContext(context) {
  assert(context && typeof context === 'object' && !Array.isArray(context), 'context must be an object');
  assert(context.schema === 'neo-system-ai-context', 'unexpected context schema');
  assert(context.version === '1.0', 'unsupported context version');
  assert(context.system?.id === 'neo-system', 'system.id must be neo-system');
  assert(String(context.system?.architecture).toLowerCase() === 'additive', 'architecture must remain additive');

  const controls = context.controls ?? context.principles;
  assert(controls && typeof controls === 'object', 'controls/principles are required');
  assert((controls.preserveExisting ?? controls.preserve_existing) === true, 'preserve-existing control must be true');
  assert((controls.provenanceRequired ?? controls.provenance_required) === true, 'provenance must be required');
  assert((controls.humanReviewRequired ?? controls.human_review_required) === true, 'human review must be required');
  assert((controls.fabricateMissingData ?? controls.fabricate_missing_data) === false, 'fabricating missing data must remain disabled');

  const states = context.epistemicStates ?? context.knowledge_states;
  assert(Array.isArray(states), 'epistemic states are required');
  for (const state of REQUIRED_EPISTEMIC_STATES) assert(states.includes(state), `missing epistemic state ${state}`);

  const dimensions = context.readinessDimensions ?? context.readiness?.distinguish;
  assert(Array.isArray(dimensions), 'readiness dimensions are required');
  for (const dimension of REQUIRED_READINESS) assert(dimensions.includes(dimension), `missing readiness dimension ${dimension}`);

  const moduleIds = Array.isArray(context.modules)
    ? context.modules
    : Object.keys(context.modules ?? {}).map((id) => id.replaceAll('_', '-'));
  assert(moduleIds.length > 0, 'at least one NEO module must be declared');

  return { moduleIds: new Set(moduleIds), context };
}

export function validateRouter(router, moduleIds) {
  assert(router && typeof router === 'object' && !Array.isArray(router), 'router must be an object');
  assert(router.version === '1.0', 'unsupported router version');
  assert(router.id === 'neo-system-knowledge-router', 'unexpected router id');
  assert(router.routing && typeof router.routing === 'object', 'routing map is required');

  for (const [domain, targets] of Object.entries(router.routing)) {
    assert(Array.isArray(targets) && targets.length > 0, `route '${domain}' must have targets`);
    for (const target of targets) assert(moduleIds.has(target), `route '${domain}' references undeclared module '${target}'`);
  }

  for (const flag of ['preserve_source', 'preserve_provenance', 'preserve_uncertainty', 'preserve_conflicts', 'human_review']) {
    assert(router.cross_system?.[flag] === true, `router cross_system.${flag} must be true`);
  }

  for (const [rule, value] of Object.entries(router.rules ?? {})) {
    assert(value === 'prohibited', `router rule '${rule}' must remain prohibited`);
  }

  return router;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

export async function loadNeoSystemBootstrap({ rootDir = process.cwd() } = {}) {
  const base = path.join(rootDir, 'bootstrap', 'ai');
  const [contextJson, contextYaml, routerYaml] = await Promise.all([
    readFile(path.join(base, 'neo-system-context.json'), 'utf8'),
    readFile(path.join(base, 'neo-system-context.yaml'), 'utf8'),
    readFile(path.join(base, 'neo-system-router.yaml'), 'utf8'),
  ]);

  const context = JSON.parse(contextJson);
  const yamlContext = parseRestrictedYaml(contextYaml);
  const router = parseRestrictedYaml(routerYaml);

  const jsonValidation = validateContext(context);
  const yamlValidation = validateContext(yamlContext);

  assert(
    JSON.stringify([...jsonValidation.moduleIds].sort()) === JSON.stringify([...yamlValidation.moduleIds].sort()),
    'JSON/YAML module declarations diverge',
  );
  assert(context.system.id === yamlContext.system.id, 'JSON/YAML system identity diverges');
  assert(context.version === yamlContext.version, 'JSON/YAML versions diverge');

  validateRouter(router, jsonValidation.moduleIds);

  return deepFreeze({
    context,
    yamlContext,
    router,
    meta: {
      authority: 'analytical-and-contextual-only',
      humanReviewRequired: true,
      autonomousOperationalAuthority: false,
    },
  });
}
