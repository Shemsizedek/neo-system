import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import { createPropertyRepository } from './repository.js';

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

const adminToken = process.env.NEO_REALTY_ADMIN_TOKEN ?? '';
const port = Number(process.env.NEO_REALTY_PORT ?? 4310);
const allowedOrigin = process.env.NEO_REALTY_FRONTEND_ORIGIN ?? '';

function routeParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

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
  const repository = createPropertyRepository();
  app.use(express.json({ limit: '256kb' }));
  app.use(cors({ origin: allowedOrigin || false }));

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'neo-realty' }));
  app.get('/ready', async (_req, res) => {
    const ready = await repository.ready();
    res.status(ready ? 200 : 503).json({ ok: ready, service: 'neo-realty', persistence: process.env.DATABASE_URL ? 'postgres' : 'memory' });
  });

  app.get('/properties', async (req, res) => {
    try {
      const rows = await repository.search({
        q: String(req.query.q ?? '').trim(),
        listingType: String(req.query.listingType ?? '').trim() || undefined,
        propertyType: String(req.query.propertyType ?? '').trim() || undefined,
        activeOnly: String(req.query.activeOnly ?? 'true') !== 'false'
      });
      res.json({ data: rows, count: rows.length });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'repository_error' });
    }
  });

  app.get('/properties/:id', async (req, res) => {
    try {
      const property = await repository.get(routeParam(req.params.id));
      if (!property) return res.status(404).json({ error: 'not_found' });
      if (property.status !== 'active' && property.authority.claimStatus !== 'verified') {
        return res.status(404).json({ error: 'not_found' });
      }
      res.json({ data: property });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'repository_error' });
    }
  });

  app.post('/properties', async (req, res) => {
    try {
      const property = normalizePropertyInput(req.body);
      const created = await repository.create(property);
      res.status(201).json({ data: created });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'invalid_request';
      const invalid = ['address_required','invalid_listing_type','invalid_property_type'].includes(message);
      res.status(invalid ? 400 : 500).json({ error: message });
    }
  });

  app.post('/admin/properties/:id/authority', requireAdmin, async (req, res) => {
    try {
      const decision = String(req.body?.decision ?? '');
      if (!['verified','rejected'].includes(decision)) return res.status(400).json({ error: 'invalid_decision' });
      const property = await repository.setAuthority(
        routeParam(req.params.id),
        decision as 'verified' | 'rejected',
        String(req.body?.verificationMethod ?? 'operator_review')
      );
      if (!property) return res.status(404).json({ error: 'not_found' });
      res.json({ data: property });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'repository_error' });
    }
  });

  app.post('/admin/reset', requireAdmin, async (_req, res) => {
    try {
      await repository.clear();
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'repository_error' });
    }
  });

  return app;
}

if (process.env.NODE_ENV !== 'test') {
  createApp().listen(port, () => console.log(`NEO Realty API listening on :${port}`));
}
