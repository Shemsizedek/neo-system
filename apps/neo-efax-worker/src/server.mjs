import http from "node:http";
import worker from "./index.mjs";

const port = Number(process.env.PORT || 10000);
const server = http.createServer(async (req, res) => {
  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 1024) { res.writeHead(413); res.end(); return; }
      chunks.push(chunk);
    }
    const url = new URL(req.url || "/", "http://localhost");
    const request = new Request(url, { method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(chunks) });
    const response = await worker.fetch(request, { DATABASE_URL: process.env.DATABASE_URL });
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch { res.writeHead(500, { "content-type": "application/json" }); res.end('{"error":"internal_error"}'); }
});
server.listen(port, "0.0.0.0");
