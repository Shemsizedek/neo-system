import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const path = new URL('../nftables/neo-vpn-segmented.review.nft', import.meta.url);
const rules = readFileSync(path, 'utf8');
const forward = rules.match(/chain forward\s*\{([\s\S]*?)\n  \}/)?.[1];

test('NET-002 remains a review-only replacement and does not auto-deploy', () => {
  assert.match(rules, /NOT FOR DIRECT PRODUCTION APPLY/);
  assert.match(rules, /flush ruleset/);
});

test('incoming and forwarded traffic fail closed by default', () => {
  assert.match(rules, /chain input\s*\{\s*type filter hook input priority 0; policy drop/);
  assert.ok(forward);
  assert.match(forward, /type filter hook forward priority 0; policy drop/);
  assert.match(forward, /ct state invalid drop/);
});

test('each private access class is pinned to a non-overlapping /24', () => {
  const ranges = ['10.144.10.0/24','10.144.20.0/24','10.144.50.0/24','10.144.60.0/24'];
  for (const cidr of ranges) assert.ok(rules.includes(cidr), cidr);
  assert.equal(new Set(ranges).size, 4);
});

test('guest and partner network only reach explicitly named HTTPS proxy targets', () => {
  assert.ok(forward);
  const acceptRules = forward.split('\n').map(x=>x.trim()).filter(x=>x.startsWith('iifname ')&&x.endsWith('accept'));
  assert.equal(acceptRules.length, 4);
  assert.deepEqual(acceptRules.filter(x=>x.includes('$NEO_GUESTS')), [
    'iifname $WG_IF oifname $WG_IF ip saddr $NEO_GUESTS ip daddr $NEO_PUBLIC_PROXY tcp dport 443 accept'
  ]);
  assert.equal(acceptRules.filter(x=>x.includes('$NEO_PARTNERS')).length, 2);
  assert.ok(acceptRules.every(x=>x.includes('tcp dport 443')&&x.includes('oifname $WG_IF')));
  assert.ok(!acceptRules.some(x=>x.includes('$WAN_IF')||x.includes('0.0.0.0/0')));
});

test('no blanket NEO VPN forwarding or Internet NAT is present', () => {
  assert.ok(forward);
  assert.doesNotMatch(forward, /ip saddr\s+\$WG_NET\s+accept/);
  assert.doesNotMatch(forward, /oifname\s+\$WAN_IF.*accept/);
  assert.doesNotMatch(rules, /masquerade/);
  assert.doesNotMatch(forward, /iifname\s+\$WG_IF\s+oifname\s+\$WG_IF\s+accept/);
});

test('remote management access is limited to existing IAP range', () => {
  assert.match(rules, /ip saddr 35\.235\.240\.0\/20 tcp dport 22 accept/);
  const sshRules = rules.split(String.fromCharCode(10)).filter(x => x.trim().endsWith('tcp dport 22 accept'));
  assert.equal(sshRules.length, 1);
});
