const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" } });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return json({ service: "neo-efax", status: "ok", mode: "staging", fax_transmission_enabled: false, database: env.DATABASE_URL ? "configured" : "not_configured" });
    }
    if (request.method === "POST" && url.pathname === "/fax/send") {
      return json({ error: "fax_transmission_disabled", message: "No carrier configured. No documents accepted." }, 503);
    }
    return json({ error: "not_found" }, 404);
  }
};
