import test from "node:test";
import assert from "node:assert/strict";
import { evaluateQueryIntent, sanitizeSecurityEvent, securityStatusFor } from "../src/policy.js";

test("allows ordinary identity discovery", () => {
  const result = evaluateQueryIntent({ query: "Jane Doe", mode: "combined" });
  assert.equal(result.allowed, true);
  assert.equal(result.mode, "combined");
});

test("blocks covert surveillance intent", () => {
  const result = evaluateQueryIntent({ query: "GPS track their location", mode: "public" });
  assert.equal(result.allowed, false);
  assert.equal(result.code, "PROHIBITED_SURVEILLANCE_INTENT");
});

test("unauthorized events do not become security evidence", () => {
  const event = sanitizeSecurityEvent({
    person_id: "neo-person:test",
    severity: "critical",
    authorized_scope: false
  });
  assert.equal(securityStatusFor([event]), "no-evidence");
});

test("authorized high-severity events require review", () => {
  const event = sanitizeSecurityEvent({
    person_id: "neo-person:test",
    severity: "high",
    authorized_scope: true
  });
  assert.equal(securityStatusFor([event]), "review");
});
