import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../apps/neo-pads/web");
const port = Number(process.env.PORT || 10000);
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp" };
const api = "https://neo-pads-api.onrender.com";
const server = http.createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url || "/", "http://localhost").pathname;
    const relative = pathname === "/" ? "index.html" : decodeURIComponent(pathname).replace(/^\/+/, "");
    const target = path.resolve(root, relative);
    if (!target.startsWith(root + path.sep)) { res.writeHead(403); return res.end("Forbidden"); }
    if (pathname === "/healthz") { res.writeHead(200, { "content-type": "application/json" }); return res.end(JSON.stringify({ service: "neo-pads-frontend", status: "ok" })); }
    if (pathname === "/app.js") {
      const script = await fs.readFile(target, "utf8");
      res.writeHead(200, { "content-type": mime[".js"], "cache-control": "no-store", "x-content-type-options": "nosniff" });
      return res.end(`window.NEO_PADS_API = ${JSON.stringify(api)};\n${script}`);
    }
    const data = await fs.readFile(target);
    res.writeHead(200, { "content-type": mime[path.extname(target)] || "application/octet-stream", "x-content-type-options": "nosniff" });
    return res.end(data);
  } catch (error) {
    res.writeHead(error?.code === "ENOENT" ? 404 : 500);
    res.end(error?.code === "ENOENT" ? "Not found" : "Internal error");
  }
});
server.listen(port, "0.0.0.0", () => console.log(`NEO Pads frontend listening on ${port}`));
