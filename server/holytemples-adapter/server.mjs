import http from "node:http";
import { timingSafeEqual } from "node:crypto";
import { health, libraryAsset, libraryCatalog, authorizedLibraryCatalog, searchPublicLibrary, searchAuthorizedLibrary } from "./adapter.mjs";
import { createWordPressMediaUploader, WordPressMediaError } from "./wordpress-media.mjs";

const MAX_MEDIA_BYTES = 5 * 1024 * 1024;
const PUBLIC_ORIGINS = new Set(["https://holytemples.org", "https://www.holytemples.org", "https://neo.holytemples.org"]);

function corsHeaders(req) {
  const origin = String(req.headers.origin || "");
  return PUBLIC_ORIGINS.has(origin) ? {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "Authorization, Content-Type, X-NEO-Approved, X-Filename",
    "vary": "Origin",
  } : {};
}

function respond(req, res, status, body, extra = {}) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    ...corsHeaders(req),
    ...extra,
  });
  res.end(JSON.stringify(body));
}

function requestUrl(req) {
  try { return new URL(req.url || "/", "http://localhost"); } catch { return null; }
}

function authorized(req, token) {
  if (!token) return false;
  const supplied = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(supplied);
  const b = Buffer.from(token);
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_MEDIA_BYTES) throw Object.assign(new Error("MEDIA_TOO_LARGE"), { status: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export function createServer(env = process.env, dependencies = {}) {
  const uploadMedia = dependencies.uploadMedia || createWordPressMediaUploader({
    baseUrl: env.WORDPRESS_BASE_URL || "https://holytemples.org",
    username: env.WORDPRESS_USERNAME,
    applicationPassword: env.WORDPRESS_APPLICATION_PASSWORD,
  });

  return http.createServer(async (req, res) => {
    const url = requestUrl(req);
    if (!url) return respond(req, res, 400, { error: "INVALID_REQUEST_TARGET" });
    if (req.method === "OPTIONS") return respond(req, res, 204, {});
    const isAuthorized = authorized(req, env.NEO_TEMPLE_OPERATOR_TOKEN);

    if (req.method === "GET" && url.pathname === "/") return respond(req, res, 200, {
      name: "NEO System API",
      status: "operational",
      version: "1",
      services: ["noogle", "world-library", "neo-algo"],
      endpoints: { health: "/health", search: "/noogle/search?q=", library: "/library" },
    });
    if (req.method === "GET" && url.pathname === "/health") return respond(req, res, 200, health());

    if (url.pathname === "/library") {
      if (req.method !== "GET") return respond(req, res, 405, { error: "METHOD_NOT_ALLOWED" }, { allow: "GET" });
      return respond(req, res, 200, { records: libraryCatalog() });
    }

    if (url.pathname === "/library/authorized") {
      if (req.method !== "GET") return respond(req, res, 405, { error: "METHOD_NOT_ALLOWED" }, { allow: "GET" });
      if (!isAuthorized) return respond(req, res, 401, { error: "UNAUTHORIZED" });
      const accessClass = url.searchParams.get("accessClass") || undefined;
      const collection = url.searchParams.get("collection") || undefined;
      return respond(req, res, 200, { records: authorizedLibraryCatalog({ accessClass, collection }) });
    }

    if (url.pathname === "/noogle/search") {
      if (req.method !== "GET") return respond(req, res, 405, { error: "METHOD_NOT_ALLOWED" }, { allow: "GET" });
      const query = String(url.searchParams.get("q") || "").trim();
      const records = isAuthorized ? searchAuthorizedLibrary(query) : searchPublicLibrary(query);
      return respond(req, res, 200, { query, scope: isAuthorized ? "authorized" : "public", engine: "NEO Algo / Noogle", records });
    }

    const assetMatch = url.pathname.match(/^\/library\/([^/]+)$/);
    if (assetMatch) {
      if (req.method !== "GET") return respond(req, res, 405, { error: "METHOD_NOT_ALLOWED" }, { allow: "GET" });
      const record = libraryAsset(decodeURIComponent(assetMatch[1]), { authorized: isAuthorized });
      if (!record) return respond(req, res, 404, { error: "LIBRARY_ASSET_NOT_FOUND" });
      return respond(req, res, 200, record);
    }

    if (url.pathname === "/media") {
      if (req.method !== "POST") return respond(req, res, 405, { error: "METHOD_NOT_ALLOWED" }, { allow: "POST" });
      if (!isAuthorized) return respond(req, res, 401, { error: "UNAUTHORIZED" });
      if (req.headers["x-neo-approved"] !== "true") return respond(req, res, 403, { error: "APPROVAL_REQUIRED" });
      const filename = String(req.headers["x-filename"] || "").trim();
      const mimeType = String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
      try {
        const body = await readBody(req);
        const result = await uploadMedia({ filename, mimeType, body, approved: true });
        return respond(req, res, 201, result);
      } catch (error) {
        if (error instanceof WordPressMediaError) return respond(req, res, error.status, { error: error.code, message: error.message });
        return respond(req, res, error.status || 500, { error: error.message || "MEDIA_UPLOAD_FAILED" });
      }
    }

    return respond(req, res, 404, { error: "NOT_FOUND" });
  });
}

export function start(env = process.env) {
  const port = Number(env.PORT || 8080);
  return createServer(env).listen(port, "0.0.0.0", () => console.log(`NEO System API listening on ${port}`));
}

if (import.meta.url === `file://${process.argv[1]}`) start();
