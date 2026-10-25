// NCC-016: normalize shared Showcase URLs without weakening asset/instrument selector validation.
// Some sharing clients add harmless tracking keys or HTML-escape '&' as '&amp;'.
// Do not let either become a financial, network, issuer, or asset override.
const CORE_KEYS = Object.freeze([
  'asset','mode','instrument_type','network','title','style','format','face'
]);
const CORE = new Set(CORE_KEYS);
const PASSIVE = new Set([
  'ref','referrer','source','gclid','fbclid','msclkid','igshid','_gl'
]);
export const SHOWCASE_QUERY_CONTRACT='NEO-CROWN-SHOWCASE-QUERY-V1';

function normalKey(raw) {
  // A literal HTML-escaped '&amp;' is parsed as the query key 'amp;format'.
  // Normalize exactly one leading entity prefix, never arbitrary fragments.
  return raw.startsWith('amp;') ? raw.slice(4) : raw;
}
function isPassive(key) {
  return PASSIVE.has(key) || /^utm_[a-z0-9_]{1,32}$/.test(key);
}
function reject(code) {
  const error=new Error(code);
  error.code=code;
  throw error;
}

/**
 * Return a fresh URLSearchParams containing only canonical selectors.
 * Repeated *identical* selectors are idempotent; conflicting duplicates fail closed.
 * Known tracking keys have no effect and are never forwarded to issuer/chain services.
 * Unknown keys still fail rather than silently authorizing an unsupported action.
 */
export function normalizeShowcaseQuery(input) {
  const source=input instanceof URLSearchParams ? input : new URLSearchParams(input);
  if(source.toString().length>2400)reject('showcase_query_too_large');
  const selected=new URLSearchParams();
  let fields=0;
  for(const [rawKey,value] of source) {
    fields++;
    if(fields>24)reject('too_many_showcase_parameters');
    const key=normalKey(rawKey);
    if(isPassive(key))continue;
    if(!CORE.has(key))reject('unsupported_showcase_parameter');
    if(selected.has(key)) {
      if(selected.get(key)!==value)reject('conflicting_showcase_parameter');
      continue;
    }
    selected.set(key,value);
  }
  return selected;
}

/** Canonical links for copying/sharing, never including third-party tracking. */
export function canonicalShowcaseQuery(input) {
  const selected=normalizeShowcaseQuery(input);
  // Rebuild in a stable order so copied URLs do not add accidental duplicates.
  const result=new URLSearchParams();
  for(const name of CORE_KEYS)if(selected.has(name))result.set(name,selected.get(name));
  return result.toString();
}
