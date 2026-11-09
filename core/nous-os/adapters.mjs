import { classifyRudwaanIntent } from '../../src/social/rudwaan-nous-bridge.mjs';
import { classifyMetaMuseCapability } from '../../src/social/meta-muse-policy.mjs';

const INPUT = /^[a-z][a-z0-9_]{0,63}$/;

/** Pure existing NEO policy functions. No network calls, message processing or actions. */
export function createReadOnlyAdapters() {
  return Object.freeze({
    list() {
      return [
        { id: 'rudwaan-intent', source: 'src/social/rudwaan-nous-bridge.mjs', status: 'local_read_only' },
        { id: 'meta-muse-capability', source: 'src/social/meta-muse-policy.mjs', status: 'local_read_only' },
      ];
    },
    classify(id, value) {
      if (typeof value !== 'string' || !INPUT.test(value)) {
        return { error: 'invalid_adapter_input', status: 400 };
      }
      if (id === 'rudwaan-intent') {
        const result = classifyRudwaanIntent(value);
        return { adapter: id, intent: result.intent, classification: result.class, readOnly: true };
      }
      if (id === 'meta-muse-capability') {
        return { adapter: id, capability: value, classification: classifyMetaMuseCapability(value), readOnly: true };
      }
      return { error: 'unknown_adapter', status: 404 };
    },
  });
}
