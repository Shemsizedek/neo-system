export type SiteRegistryEntry = {
  key: string;
  name: string;
  siteId: string;
  domain: string;
  mode: "read-only";
  capabilities: readonly string[];
};

export const SITE_REGISTRY: Record<string, SiteRegistryEntry> = {
  "world-temple": {
    key: "world-temple",
    name: "World Temple",
    siteId: "241770410",
    domain: "holytemples.org",
    mode: "read-only",
    capabilities: ["health", "site-read", "posts-read"] as const,
  },
};

export function getSite(key: string): SiteRegistryEntry | undefined {
  return SITE_REGISTRY[key];
}
