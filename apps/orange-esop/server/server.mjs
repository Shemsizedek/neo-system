import http from "node:http";
import { createStore } from "./store.mjs";
import { buildParticipantCertificate, buildAnnualStatement } from "./documents.mjs";

export function createOrangeEsopServer({ store = createStore() } = {}) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    res.setHeader("content-type", "application/json; charset=utf-8");

    if (req.method === "GET" && url.pathname === "/health") {
      return end(res, 200, { ok: true, service: "orange-esop" });
    }

    if (req.method === "GET" && url.pathname === "/api/esop/participants") {
      return end(res, 200, { participants: store.listParticipants() });
    }

    const participantMatch = url.pathname.match(/^\/api\/esop\/participants\/([^/]+)$/);
    if (req.method === "GET" && participantMatch) {
      const participant = store.getParticipant(decodeURIComponent(participantMatch[1]));
      return participant ? end(res, 200, { participant }) : end(res, 404, { error: "NOT_FOUND" });
    }

    if (req.method === "POST" && url.pathname === "/api/chaplaincy/stewardship") {
      const body = await readJson(req);
      return end(res, 201, { entry: store.addStewardship(body) });
    }

    if (req.method === "GET" && url.pathname === "/api/esop/reconcile/status") {
      return end(res, 200, { reconciliation: store.latestReconciliation() });
    }

    if (req.method === "POST" && url.pathname === "/api/esop/reconcile") {
      const body = await readJson(req);
      return end(res, 201, { reconciliation: store.addReconciliation(body) });
    }

    if (req.method === "POST" && url.pathname === "/api/esop/certificate/preview") {
      const body = await readJson(req);
      return end(res, 200, { certificate: buildParticipantCertificate(body) });
    }

    if (req.method === "POST" && url.pathname === "/api/esop/statement/preview") {
      const body = await readJson(req);
      return end(res, 200, { statement: buildAnnualStatement(body) });
    }

    return end(res, 404, { error: "NOT_FOUND" });
  });
}

function end(res, status, body) {
  res.statusCode = status;
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", chunk => { raw += chunk; if (raw.length > 1_000_000) req.destroy(); });
    req.on("end", () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(e); }
    });
    req.on("error", reject);
  });
}

if (process.argv[1] && process.argv[1].endsWith("server.mjs")) {
  const port = Number(process.env.PORT || 8799);
  createOrangeEsopServer().listen(port, () => console.log(`orange-esop listening on :${port}`));
}
