import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "./server.mjs";

async function withServer(run) {
  const server = createServer().listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    server.close();
    await once(server, "close");
  }
}

test("GET /health reports the read-only adapter contract", async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/health`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.mode, "read-only");
    assert.equal(body.mutations, false);
  });
});

test("GET /library returns the canonical registry", async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/library`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.ok(Array.isArray(body.records));
    assert.ok(body.records.some((record) => record.assetId === "world-library-neo-codex"));
  });
});

test("GET /library/:assetId returns one canonical asset", async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/library/world-library-neo-codex`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.driveFileId, "0B-oe5yNz2jy4VlVfTVJrNGFYczA");
  });
});

test("unknown assets return 404", async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/library/missing`);
    assert.equal(response.status, 404);
  });
});

test("Library mutation methods fail closed", async () => {
  await withServer(async (base) => {
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      const catalog = await fetch(`${base}/library`, { method });
      assert.equal(catalog.status, 405);
      assert.equal(catalog.headers.get("allow"), "GET");

      const asset = await fetch(`${base}/library/world-library-neo-codex`, { method });
      assert.equal(asset.status, 405);
      assert.equal(asset.headers.get("allow"), "GET");
    }
  });
});
