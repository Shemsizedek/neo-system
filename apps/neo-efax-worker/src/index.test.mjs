import test from "node:test";
import assert from "node:assert/strict";
import worker from "./index.mjs";

test("health reports staging with fax disabled", async () => {
  const response = await worker.fetch(new Request("https://example.test/health"), {});
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.fax_transmission_enabled, false);
  assert.equal(body.database, "not_configured");
});

test("fax submission never accepts a document", async () => {
  const response = await worker.fetch(new Request("https://example.test/fax/send", { method: "POST", body: "synthetic-only" }), {});
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, "fax_transmission_disabled");
});
