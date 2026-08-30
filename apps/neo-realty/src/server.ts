import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';

export type ListingType = 'sale' | 'rent' | 'both';
export type PropertyType = 'house' | 'condo' | 'townhome' | 'multifamily' | 'apartment' | 'land' | 'commercial' | 'other';
export type PropertyStatus = 'draft' | 'pending_verification' | 'active' | 'under_contract' | 'leased' | 'sold' | 'off_market';
export type AuthorityStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export interface PropertyRecord {
  id: string;
  listingType: ListingType;
  propertyType: PropertyType;
  status: PropertyStatus;
  address: {
    line1: string;
    line2?: string;
    city: string;
    region: string;
    postalCode: string;
    country: string;
    latitude?: number;
    longitude?: number;
  };
  facts?: {
    beds?: number;
    baths?: number;
    areaSqFt?: number;
    lotSqFt?: number;
    units?: number;
    yearBuilt?: number;
    occupancyPct?: number;
    annualNoi?: number;
    capRatePct?: number;
  };
  pricing: {
    askingFiat?: number;
    fiatCurrency?: string;
    monthlyRentFiat?: number;
    displayWorldCurrency?: string;
    btcQuote?: string;
  };
  authority: {
    claimStatus: AuthorityStatus;
    verifiedAt: string | null;
    verificationMethod: string | null;
  };
  neo?: {
    neoPadsEligible?: boolean;
    neoPassRequired?: boolean;
    counterpartyAsset?: string | null;
    homeSharesEnabled?: boolean;
    settlementAssets?: string[];
  };
  createdAt: string;
  updatedAt: string;
}

const properties = new Map<string, PropertyRecord>();
const adminToken = process.env.NEO_REALTY_ADMIN_TOKEN ?? '';
const port = Number(process.env.NEO_REALTY_PORT ?? 4310);
const allowedOrigin = process.env.NEO_REALTY_FRONTEND_ORIGIN ?? '';

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!adminToken) return res.status(503).json({ error: 'admin_not_configured' });
  const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, '') ?? '';
  if (!bearer || bearer !== adminToken) return res.status(401).json({ error: 'unauthorized' });
  next();
}

function normalizePropertyInput(body: any): PropertyRecord {
  if (!body?.address?.line1 || !body?.address?.city || !body?.address?.region || !body?.address?.postalCode || !body?.address?.country) {
    throw new Error('address_required');
  }
  if (!['sale','rent','both'].includes(body.listingType)) throw new Error('invalid_listing_type');
  if (!['house','condo','townhome','multifamily','apartment','land','commercial','other'].includes(body.propertyType)) throw new Error('invalid_property_type');

  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    listingType: body.listingType,
    propertyType: body.propertyType,
    status: 'pending_verification',
    address: {
      line1: String(body.address.line1),
      line2: body.address.line2 ? String(body.address.line2) : undefined,
      city: String(body.address.city),
      region: String(body.address.region),
      postalCode: String(body.address.postalCode),
      country: String(body.address.country),
      latitude: Number.isFinite(body.address.latitude) ? Number(body.address.latitude) : undefined,
      longitude: Number.isFinite(body.address.longitude) ? Number(body.address.longitude) : undefined
    },
    facts: body.facts ?? undefined,
    pricing: {
      askingFiat: Number.isFinite(body.pricing?.askingFiat) ? Number(body.pricing.askingFiat) : undefined,
      fiatCurrency: body.pricing?.fiatCurrency ? String(body.pricing.fiatCurrency).toUpperCase() : undefined,
      monthlyRentFiat: Number.isFinite(body.pricing?.monthlyRentFiat) ? Number(body.pricing.monthlyRentFiat) : undefined,
      displayWorldCurrency: body.pricing?.displayWorldCurrency ? String(body.pricing.displayWorldCurrency) : undefined,
      btcQuote: body.pricing?.btcQuote ? String(body.pricing.btcQuote) : undefined
    },
    authority: { claimStatus: 'pending', verifiedAt: null, verificationMethod: null },
    neo: {
      neoPadsEligible: Boolean(body.neo?.neoPadsEligible),
      neoPassRequired: Boolean(body.neo?.neoPassRequired),
      counterpartyAsset: body.neo?.counterpartyAsset ? String(body.neo.counterpartyAsset) : null,
      homeSharesEnabled: Boolean(body.neo?.homeSharesEnabled),
      settlementAssets: Array.isArray(body.neo?.settlementAssets) ? body.neo.settlementAssets.map(String) : []
    },
    createdAt: now,
    updatedAt: now
  };
}

export function createApp() {
  const app = express();
  app.use(express.json({ limit: '256kb' }));
  app.use(cors({ origin: allowedOrigin || false }));

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'neo-realty' }));

  app.get('/properties', (req, res) => {
    const q = String(req.query.q ?? '').trim().toLowerCase();
    const listingType = String(req.query.listingType ?? '').trim();
    const propertyType = String(req.query.propertyType ?? '').trim();
    const activeOnly = String(req.query.activeOnly ?? 'true') !== 'false';

    const rows = [...properties.values()].filter((p) => {
      if (activeOnly && p.status !== 'active') return false;
      if (listingType && p.listingType !== listingType && p.listingType !== 'both') return false;
      if (propertyType && p.propertyType !== propertyType) return false;
      if (q) {
        const haystack = `${p.address.line1} ${p.address.city} ${p.address.region} ${p.address.postalCode}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
    res.json({ data: rows, count: rows.length });
  });

  app.get('/properties/:id', (req, res) => {
    const property = properties.get(req.params.id);
    if (!property) return res.status(404).json({ error: 'not_found' });
    if (property.status !== 'active' && property.authority.claimStatus !== 'verified') {
      return res.status(404).json({ error: 'not_found' });
    }
    res.json({ data: property });
  });

  app.post('/properties', (req, res) => {
    try {
      const property = normalizePropertyInput(req.body);
      properties.set(property.id, property);
      res.status(201).json({ data: property });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'invalid_request' });
    }
  });

  app.post('/admin/properties/:id/authority', requireAdmin, (req, res) => {
    const property = properties.get(req.params.id);
    if (!property) return res.status(404).json({ error: 'not_found' });
    const decision = String(req.body?.decision ?? '');
    if (!['verified','rejected'].includes(decision)) return res.status(400).json({ error: 'invalid_decision' });

    property.authority = {
      claimStatus: decision as AuthorityStatus,
      verifiedAt: decision === 'verified' ? new Date().toISOString() : null,
      verificationMethod: String(req.body?.verificationMethod ?? 'operator_review')
    };
    property.status = decision === 'verified' ? 'active' : 'off_market';
    property.updatedAt = new Date().toISOString();
    properties.set(property.id, property);
    res.json({ data: property });
  });

  app.post('/admin/reset', requireAdmin, (_req, res) => {
    properties.clear();
    res.status(204).end();
  });

  return app;
}

if (process.env.NODE_ENV !== 'test') {
  createApp().listen(port, () => console.log(`NEO Realty API listening on :${port}`));
}
