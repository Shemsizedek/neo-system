const SAFE_READ_METHODS = new Set(['GET','HEAD']);

export function inventoryCesForms(html = '', { pageUrl = 'https://www.community-exchange.org/' } = {}) {
  const forms = [];
  const formPattern = /<form\b([^>]*)>([\s\S]*?)<\/form>/gi;
  let match;
  let index = 0;
  while ((match = formPattern.exec(String(html)))) {
    const attrs = parseAttributes(match[1]);
    const action = new URL(attrs.action || pageUrl, pageUrl).toString();
    const method = String(attrs.method || 'GET').toUpperCase();
    const fields = inventoryFields(match[2]);
    forms.push({
      index: index++,
      id: attrs.id || null,
      name: attrs.name || null,
      action,
      method,
      readOnly: SAFE_READ_METHODS.has(method),
      fields,
      fingerprint: fingerprintForm({ action, method, fields }),
    });
  }
  return forms;
}

export function inventoryFields(formHtml = '') {
  const fields = [];
  const tagPattern = /<(input|select|textarea|button)\b([^>]*)>/gi;
  let match;
  while ((match = tagPattern.exec(String(formHtml)))) {
    const tag = match[1].toLowerCase();
    const attrs = parseAttributes(match[2]);
    if (!attrs.name && tag !== 'button') continue;
    fields.push({
      tag,
      name: attrs.name || null,
      type: String(attrs.type || (tag === 'button' ? 'submit' : tag)).toLowerCase(),
      value: attrs.value || '',
      required: Object.prototype.hasOwnProperty.call(attrs, 'required'),
    });
  }
  return fields;
}

export function classifyCesForm(form) {
  if (!form) return 'unknown';
  if (form.readOnly) return 'read-only';
  const names = form.fields.map((field) => String(field.name || '').toLowerCase()).join(' ');
  const action = String(form.action || '').toLowerCase();
  const haystack = `${action} ${names}`;
  if (/approve|authori[sz]|confirm|transaction|payment/.test(haystack)) return 'transaction-approval';
  if (/issue|credit|v.?dollar|balance|allocation/.test(haystack)) return 'value-issuance';
  if (/pub|publication|document|upload/.test(haystack)) return 'publication';
  if (/subscription|member|membership|renew/.test(haystack)) return 'subscription';
  return 'write-other';
}

export function createCesActionAllowlist(entries = []) {
  const map = new Map();
  for (const entry of entries) {
    if (!entry?.action || !entry?.fingerprint) throw new Error('allowlist entries require action and fingerprint');
    map.set(entry.action, Object.freeze({ ...entry }));
  }
  return {
    get(action) { return map.get(action) || null; },
    list() { return [...map.values()]; },
    assert(action, form) {
      const allowed = map.get(action);
      if (!allowed) throw new Error(`CES action is not allowlisted: ${action}`);
      if (!form || form.fingerprint !== allowed.fingerprint) throw new Error(`CES form fingerprint mismatch for ${action}`);
      return allowed;
    },
  };
}

export function buildDryRunSubmission({ action, form, values = {}, allowlist }) {
  if (!allowlist) throw new Error('allowlist is required');
  allowlist.assert(action, form);
  const body = new URLSearchParams();
  for (const field of form.fields) {
    if (!field.name) continue;
    const supplied = values[field.name];
    if (supplied !== undefined) body.set(field.name, String(supplied));
    else if (field.value !== '') body.set(field.name, field.value);
    else if (field.required) throw new Error(`missing required CES field: ${field.name}`);
  }
  return {
    dryRun: true,
    action,
    method: form.method,
    url: form.action,
    body: body.toString(),
    fingerprint: form.fingerprint,
  };
}

function parseAttributes(source = '') {
  const attrs = {};
  const attrPattern = /([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let match;
  while ((match = attrPattern.exec(source))) {
    attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return attrs;
}

function fingerprintForm({ action, method, fields }) {
  const normalized = JSON.stringify({
    action,
    method,
    fields: fields.map((field) => [field.tag, field.name, field.type]).sort((a,b) => String(a[1]).localeCompare(String(b[1]))),
  });
  let hash = 2166136261;
  for (let i = 0; i < normalized.length; i += 1) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}
