import type { PropertyRecord } from './server.js';

export interface MarketFacets {
  minPrice?: number;
  maxPrice?: number;
  minBeds?: number;
  minBaths?: number;
  minUnits?: number;
  maxUnits?: number;
  minCapRate?: number;
  maxCapRate?: number;
}

export function filterMarketFacets(rows: PropertyRecord[], facets: MarketFacets): PropertyRecord[] {
  return rows.filter((p) => {
    const price = p.pricing.askingFiat;
    const beds = p.facts?.beds;
    const baths = p.facts?.baths;
    const units = p.facts?.units;
    const capRate = p.facts?.capRatePct;
    if (facets.minPrice != null && (price == null || price < facets.minPrice)) return false;
    if (facets.maxPrice != null && (price == null || price > facets.maxPrice)) return false;
    if (facets.minBeds != null && (beds == null || beds < facets.minBeds)) return false;
    if (facets.minBaths != null && (baths == null || baths < facets.minBaths)) return false;
    if (facets.minUnits != null && (units == null || units < facets.minUnits)) return false;
    if (facets.maxUnits != null && (units == null || units > facets.maxUnits)) return false;
    if (facets.minCapRate != null && (capRate == null || capRate < facets.minCapRate)) return false;
    if (facets.maxCapRate != null && (capRate == null || capRate > facets.maxCapRate)) return false;
    return true;
  });
}

export interface MapCluster {
  key: string;
  latitude: number;
  longitude: number;
  count: number;
  propertyIds: string[];
}

export function clusterProperties(rows: PropertyRecord[], precision = 2): MapCluster[] {
  const buckets = new Map<string, MapCluster>();
  for (const p of rows) {
    const lat = p.address.latitude;
    const lng = p.address.longitude;
    if (lat == null || lng == null) continue;
    const factor = 10 ** Math.max(0, Math.min(5, precision));
    const roundedLat = Math.round(lat * factor) / factor;
    const roundedLng = Math.round(lng * factor) / factor;
    const key = `${roundedLat}:${roundedLng}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.count += 1;
      existing.propertyIds.push(p.id);
    } else {
      buckets.set(key, { key, latitude: roundedLat, longitude: roundedLng, count: 1, propertyIds: [p.id] });
    }
  }
  return [...buckets.values()].sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}
