import http from "node:http";
import { URL } from "node:url";
import { evaluateQueryIntent, sanitizeSecurityEvent, securityStatusFor } from "./policy.js";

const PORT = Number(process.env.PORT || 8787);

const people = [
  {
    person_id: "neo-person:demo-member",
    display_name: "Demo NEO Member",
    aliases: [],
    relationship: "member",
    identifiers: [{ type: "neo-member-id", value: "DEMO-001", verified: true }],
    sources: [{ source: "neo-directory", visibility: "internal", verified_at: "2026-09-15" }],
    confidence: 1
  },
  {
    person_id: "neo-person:demo-public",
    display_name: "Demo Public Contributor",
    aliases: ["DPC"],
    relationship: "external",
    identifiers: [{ type: "public-handle", value: "demo-public", verified: false }],
    sources: [{ source: "public-profile", visibility: "public", verified_at: "2026-09-15" }],
    confidence: 0.66
  }
];

const securityEvents = [
  sanitizeSecurityEvent({
    event_id: "evt-demo-1",
    person_id: "neo-person:demo-member",
    occurred_at: "2026-09-15T18:00:00-05:00",
    source_system: "neo-guardian",
    event_type: "login-anomaly",
    severity: "medium",
    evidence_ref: "audit:demo-1",
    authorized_scope: true
  })
];

function sendJson(res, status, body) {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
    "access-control-allow-origin": "*"
  });
  res.end(payload);
}

function scoreMatch(person, query) {
  const q = query.toLowerCase();
  const haystack = [
    person.display_name,
    ...(person.aliases || []),
    ...(person.identifiers || []).map((i) => i.value)
  ]
    .join(" ")
    .toLowerCase();
  if (!q) return 1;
  if (haystack === q) return 1;
  if (haystack.includes(q)) return 0.85;
  const terms = q.split(/\s+/).filter(Boolean);
  const hitCount = terms.filter((term) => haystack.includes(term)).length;
  return terms.length ? hitCount / terms.length : 0;
}

function resultFor(person, mode) {
  const events = mode === "security" || mode === "combined"
    ? securityEvents.filter((event) => event.person_id === person.person_id && event.authorized_scope)
    : [];

  return {
    ...person,
    security: {
      status: securityStatusFor(events),
      event_refs: events.map((event) => event.event_id)
    }
  };
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && url.pathname === "/health") {
    return sendJson(res, 200, {
      ok: true,
      service: "neo-people-search",
      version: "0.1.0"
    });
  }

  if (req.method === "GET" && url.pathname === "/api/people/search") {
    const query = url.searchParams.get("q") || "";
    const mode = url.searchParams.get("mode") || "combined";
    const policy = evaluateQueryIntent({ query, mode });

    if (!policy.allowed) {
      return sendJson(res, 400, { ok: false, policy });
    }

    const filtered = people
      .filter((person) => {
        if (policy.mode === "internal") {
          return person.sources.some((s) => s.visibility === "internal");
        }
        if (policy.mode === "public") {
          return person.sources.some((s) => s.visibility === "public");
        }
        if (policy.mode === "security") {
          return securityEvents.some(
            (event) => event.person_id === person.person_id && event.authorized_scope
          );
        }
        return true;
      })
      .map((person) => ({ person, match: scoreMatch(person, query) }))
      .filter(({ match }) => match > 0)
      .sort((a, b) => b.match - a.match)
      .map(({ person, match }) => ({
        ...resultFor(person, policy.mode),
        match_score: Number(match.toFixed(2))
      }));

    return sendJson(res, 200, {
      ok: true,
      query,
      mode: policy.mode,
      count: filtered.length,
      results: filtered,
      notice:
        "Results distinguish source provenance from security evidence. External status alone is not a threat indicator."
    });
  }

  return sendJson(res, 404, {
    ok: false,
    error: "Not found",
    routes: ["GET /health", "GET /api/people/search?q=<name>&mode=<internal|public|combined|security>"]
  });
});

server.listen(PORT, () => {
  console.log(`NEO People Search listening on :${PORT}`);
});
