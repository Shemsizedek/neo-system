import type { SiteRegistryEntry } from "./registry";

const API_BASE = "https://public-api.wordpress.com";

export type WordPressEnv = {
  WORDPRESS_ACCESS_TOKEN?: string;
};

export type HealthResult = {
  ok: boolean;
  authenticated: boolean;
  siteReachable: boolean;
  siteId: string;
  domain: string;
  status: number | null;
  error?: string;
};

function authHeaders(env: WordPressEnv): Headers {
  const headers = new Headers({ Accept: "application/json" });
  if (env.WORDPRESS_ACCESS_TOKEN) {
    headers.set("Authorization", `Bearer ${env.WORDPRESS_ACCESS_TOKEN}`);
  }
  return headers;
}

export async function checkSiteHealth(
  env: WordPressEnv,
  site: SiteRegistryEntry,
): Promise<HealthResult> {
  if (!env.WORDPRESS_ACCESS_TOKEN) {
    return {
      ok: false,
      authenticated: false,
      siteReachable: false,
      siteId: site.siteId,
      domain: site.domain,
      status: null,
      error: "WORDPRESS_ACCESS_TOKEN is not configured",
    };
  }

  const url = `${API_BASE}/wp/v2/sites/${encodeURIComponent(site.siteId)}/posts?per_page=1&context=edit`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: authHeaders(env),
    });

    return {
      ok: response.ok,
      authenticated: response.status !== 401 && response.status !== 403,
      siteReachable: response.status < 500,
      siteId: site.siteId,
      domain: site.domain,
      status: response.status,
      ...(response.ok ? {} : { error: `WordPress API returned HTTP ${response.status}` }),
    };
  } catch (error) {
    return {
      ok: false,
      authenticated: false,
      siteReachable: false,
      siteId: site.siteId,
      domain: site.domain,
      status: null,
      error: error instanceof Error ? error.message : "Unknown WordPress API error",
    };
  }
}

export async function listRecentPosts(
  env: WordPressEnv,
  site: SiteRegistryEntry,
  perPage = 5,
): Promise<unknown> {
  if (!env.WORDPRESS_ACCESS_TOKEN) {
    throw new Error("WORDPRESS_ACCESS_TOKEN is not configured");
  }

  const limit = Math.min(Math.max(perPage, 1), 20);
  const url = `${API_BASE}/wp/v2/sites/${encodeURIComponent(site.siteId)}/posts?per_page=${limit}&context=edit`;
  const response = await fetch(url, { method: "GET", headers: authHeaders(env) });

  if (!response.ok) {
    throw new Error(`WordPress API returned HTTP ${response.status}`);
  }

  return response.json();
}
