import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assessCatalog } from '../assess-catalog.mjs';

const load = () => JSON.parse(readFileSync(new URL('../catalog.json', import.meta.url), 'utf8'));
const clone = obj => structuredClone(obj);

test('default catalog is consistent but does not claim Internet is operational', () => {
  const catalog = load();
  const report = assessCatalog(catalog);
  assert.equal(report.catalog_consistent, true);
  assert.equal(report.live_service_count_claimed, 0);
  assert.equal(report.public_internet_live_claimed, false);
  assert.equal(report.actual_runtime_or_physical_acceptance_tested, false);
  assert.equal(catalog.commercial.accepting_customers, false);
  assert.equal(catalog.commercial.accepting_payments, false);
});

test('mesh cannot be marked live before independent handshake and revocation evidence', () => {
  const catalog = clone(load());
  catalog.services.find(s => s.id === 'neofinity-mesh').status = 'live';
  const report = assessCatalog(catalog);
  assert.equal(report.catalog_consistent, false);
  assert.match(report.violations.join(' '), /real_two_peer_handshake/);
  assert.match(report.violations.join(' '), /revocation_verified/);
});

test('public Internet cannot be marked live before authorized backhaul', () => {
  const catalog = clone(load());
  catalog.network.public_internet_live = true;
  const report = assessCatalog(catalog);
  assert.equal(report.catalog_consistent, false);
  assert.match(report.violations.join(' '), /authorized_backhaul_contract/);
});

test('selling cannot be enabled in the catalog while every service is prelaunch', () => {
  const catalog = clone(load());
  catalog.commercial.accepting_payments = true;
  const report = assessCatalog(catalog);
  assert.equal(report.catalog_consistent, false);
  assert.match(report.violations.join(' '), /no live service/);
});

test('independent routing cannot be claimed without public ASN and prefix', () => {
  const catalog = clone(load());
  catalog.network.independent_public_routing_verified = true;
  const report = assessCatalog(catalog);
  assert.equal(report.catalog_consistent, false);
  assert.match(report.violations.join(' '), /assigned ASN and prefix/);
});
