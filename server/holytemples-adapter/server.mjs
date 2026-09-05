import http from "node:http";
import { health, libraryAsset, libraryCatalog } from "./adapter.mjs";

function respond(res, status, body, extra = {}) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    ...extra,
  });
  res.end(JSON.stringify(body));
}

function requestUrl(req) {
  try {
    return new URL(req.url || "/", "http://localhost");
  } catch {
    return null;
  }
}

export function createServer() {
  return http.createServer((req, res) => {
    const url = requestUrl(req);
    if (!url) return respond(res, 400, { error: "INVALID_REQUEST_TARGET" });

    if (req.method === "GET" && url.pathname === "/health") {
      return respond(res, 200, health());
    }

    if (url.pathname === "/library") {
      if (req.method !== "GET") return respond(res, 405, { error: "METHOD_NOT_ALLOWED" }, { allow: "GET" });
      return respond(res, 200, { records: libraryCatalog() });
    }

    const assetMatch = url.pathname.match(/^\/library\/([^/]+)$/);
    if (assetMatch) {
      if (req.method !== "GET") return respond(res, 405, { error: "METHOD_NOT_ALLOWED" }, { allow: "GET" });
      const assetId = decodeURIComponent(assetMatch[1]);
      const record = libraryAsset(assetId);
      if (!record) return respond(res, 404, { error: "LIBRARY_ASSET_NOT_FOUND" });
      return respond(res, 200, record);
    }

    return respond(res, 404, { error: "NOT_FOUND" });
  });
}

export function start(env = process.env) {
  const port = Number(env.PORT || 8080);
  return createServer().listen(port, "0.0.0.0", () => {
    console.log(`Holy Temples read-only adapter listening on ${port}`);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) start();
