import { getSite, SITE_REGISTRY } from "./registry";
import { checkSiteHealth, listRecentPosts, type WordPressEnv } from "./wordpress";

type Env = WordPressEnv;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function methodNotAllowed(): Response {
  return json(
    {
      success: false,
      error: "read_only_adapter",
      message: "This adapter currently exposes GET/HEAD routes only. Draft creation and publishing are disabled.",
    },
    405,
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (!['GET', 'HEAD'].includes(request.method)) return methodNotAllowed();

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (path === "/health") {
      return json({
        success: true,
        service: "neo-wordpress-adapter",
        version: "0.1.0",
        mode: "read-only",
        publishing: "disabled",
        draftCreation: "disabled",
      });
    }

    if (path === "/sites") {
      return json({ success: true, data: Object.values(SITE_REGISTRY) });
    }

    const siteMatch = path.match(/^\/sites\/([^/]+)$/);
    if (siteMatch) {
      const site = getSite(siteMatch[1]);
      return site ? json({ success: true, data: site }) : json({ success: false, error: "site_not_found" }, 404);
    }

    const healthMatch = path.match(/^\/sites\/([^/]+)\/health$/);
    if (healthMatch) {
      const site = getSite(healthMatch[1]);
      if (!site) return json({ success: false, error: "site_not_found" }, 404);
      const health = await checkSiteHealth(env, site);
      return json({ success: health.ok, data: health }, health.ok ? 200 : 503);
    }

    const postsMatch = path.match(/^\/sites\/([^/]+)\/posts$/);
    if (postsMatch) {
      const site = getSite(postsMatch[1]);
      if (!site) return json({ success: false, error: "site_not_found" }, 404);
      try {
        const requested = Number(url.searchParams.get("limit") ?? "5");
        const posts = await listRecentPosts(env, site, Number.isFinite(requested) ? requested : 5);
        return json({ success: true, data: posts });
      } catch (error) {
        return json(
          {
            success: false,
            error: "wordpress_read_failed",
            message: error instanceof Error ? error.message : "Unknown error",
          },
          502,
        );
      }
    }

    return json({ success: false, error: "not_found" }, 404);
  },
} satisfies ExportedHandler<Env>;
