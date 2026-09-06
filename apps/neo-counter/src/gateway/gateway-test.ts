import assert from "node:assert/strict";
import { formatGatewayDisplay, gatewayRails } from "./money.js";

assert.equal(formatGatewayDisplay(50_000, "WORLD_CURRENCY"), "∞500");
assert.equal(formatGatewayDisplay(50_050, "world_currency"), "∞500.5");
assert.equal(formatGatewayDisplay(50_000, "USD"), "$500.00");
assert.equal(formatGatewayDisplay(Number.MAX_SAFE_INTEGER + 1, "WORLD_CURRENCY"), "—");
assert.deepEqual(gatewayRails("WORLD_CURRENCY"), ["BTC", "XCP", "NOMNI"]);
assert.deepEqual(gatewayRails("USD"), ["BTC", "XCP", "NOMNI", "USD"]);

console.log("NEO Counter gateway money tests passed");
