import type { PropertyRecord } from './server.js';

export interface NeoEligibility {
  neoPads: { configured: boolean; eligible: boolean; source: 'listing' | 'adapter'; detail?: unknown };
  neoPass: { configured: boolean; required: boolean; source: 'listing' | 'adapter'; detail?: unknown };
  homeShares: { enabled: boolean; counterpartyAsset: string | null };
}

const timeoutMs = 5000;

async function readJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`adapter_http_${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchNeoEligibility(property: PropertyRecord): Promise<NeoEligibility> {
  const padsBase = process.env.NEO_PADS_READ_URL?.replace(/\/$/, '') ?? '';
  const passBase = process.env.NEOPASS_READ_URL?.replace(/\/$/, '') ?? '';
  let padsDetail: unknown;
  let passDetail: unknown;

  if (padsBase && property.neo?.neoPadsEligible) {
    padsDetail = await readJson(`${padsBase}/properties/${encodeURIComponent(property.id)}`);
  }
  if (passBase && property.neo?.neoPassRequired) {
    passDetail = await readJson(`${passBase}/health`);
  }

  return {
    neoPads: {
      configured: Boolean(padsBase),
      eligible: Boolean(property.neo?.neoPadsEligible),
      source: padsDetail ? 'adapter' : 'listing',
      ...(padsDetail ? { detail: padsDetail } : {})
    },
    neoPass: {
      configured: Boolean(passBase),
      required: Boolean(property.neo?.neoPassRequired),
      source: passDetail ? 'adapter' : 'listing',
      ...(passDetail ? { detail: passDetail } : {})
    },
    homeShares: {
      enabled: Boolean(property.neo?.homeSharesEnabled),
      counterpartyAsset: property.neo?.counterpartyAsset ?? null
    }
  };
}
