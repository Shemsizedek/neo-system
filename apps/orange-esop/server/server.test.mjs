import test from "node:test";
import assert from "node:assert/strict";
import { createOrangeEsopServer } from "./server.mjs";
import { createStore } from "./store.mjs";

async function withServer(fn) {
  const store = createStore({ participants: [{ participantId: "NEO-PART-2026-0001", legalName: "Test Participant" }] });
  const server = createOrangeEsopServer({ store });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    const { port } = server.address();
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

test("health and participant routes work", async () => {
  await withServer(async base => {
    const health = await fetch(base + "/health").then(r => r.json());
    assert.equal(health.ok, true);
    const p = await fetch(base + "/api/esop/participants/NEO-PART-2026-0001").then(r => r.json());
    assert.equal(p.participant.legalName, "Test Participant");
  });
});

test("certificate preview is generated", async () => {
  await withServer(async base => {
    const r = await fetch(base + "/api/esop/certificate/preview", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        participant: { participantId:"P1", legalName:"A" },
        allocation: { employerShares:"10", neotrustUnits:"20" },
        vesting: { vestingPercent:40, vestedNeotrust:"8", unvestedNeotrust:"12" }
      })
    });
    const body = await r.json();
    assert.equal(body.certificate.form, "RCF-013");
  });
});
