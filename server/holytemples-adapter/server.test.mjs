import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "./server.mjs";

async function withServer(run, env = {}, dependencies = {}) {
  const server = createServer(env, dependencies).listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  try { await run(`http://127.0.0.1:${port}`); }
  finally { server.close(); await once(server, "close"); }
}

test("GET /health reports the read-only catalog contract", async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/health`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.mode, "read-only");
  });
});

test("GET /library returns the canonical registry", async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/library`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.ok(Array.isArray(body.records));
  });
});

test("POST /media rejects anonymous callers", async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/media`, { method: "POST", body: "x", headers: { "content-type": "image/jpeg", "x-filename": "x.jpg", "x-neo-approved": "true" } });
    assert.equal(response.status, 401);
  }, { NEO_TEMPLE_OPERATOR_TOKEN: "operator-secret" });
});

test("POST /media requires explicit approval", async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/media`, { method: "POST", body: "x", headers: { authorization: "Bearer operator-secret", "content-type": "image/jpeg", "x-filename": "x.jpg" } });
    assert.equal(response.status, 403);
  }, { NEO_TEMPLE_OPERATOR_TOKEN: "operator-secret" });
});

test("POST /media forwards approved authenticated image", async () => {
  let request;
  await withServer(async (base) => {
    const response = await fetch(`${base}/media`, { method: "POST", body: "image", headers: { authorization: "Bearer operator-secret", "content-type": "image/jpeg", "x-filename": "science-temple.jpg", "x-neo-approved": "true" } });
    const body = await response.json();
    assert.equal(response.status, 201);
    assert.equal(body.attachmentId, 3004);
    assert.equal(request.approved, true);
    assert.equal(request.filename, "science-temple.jpg");
  }, { NEO_TEMPLE_OPERATOR_TOKEN: "operator-secret" }, { uploadMedia: async (input) => { request = input; return { ok: true, attachmentId: 3004, url: "https://holytemples.org/media/3004" }; } });
});

test("Library mutation methods fail closed", async () => {
  await withServer(async (base) => {
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      const response = await fetch(`${base}/library`, { method });
      assert.equal(response.status, 405);
    }
  });
});
