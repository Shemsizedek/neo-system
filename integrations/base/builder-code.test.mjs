import test from 'node:test';
import assert from 'node:assert/strict';
import { baseBuilderCodeSuffix, appendBaseBuilderAttribution, ERC8021_MARKER } from './builder-code.mjs';

test('encodes canonical ERC-8021 schema 0 single-code example', () => {
  assert.equal(baseBuilderCodeSuffix('baseapp'),
    '0x07626173656170700080218021802180218021802180218021');
  assert.equal(ERC8021_MARKER, '80218021802180218021802180218021');
});

test('remains disabled by default with zero changes to calldata', () => {
  assert.equal(appendBaseBuilderAttribution('0xdeadbeef'), '0xdeadbeef');
  assert.equal(appendBaseBuilderAttribution('0xdeadbeef', { code: 'example', chainId: 8453 }), '0xdeadbeef');
});

test('attributes only an explicit Base network and valid code', () => {
  const actual = appendBaseBuilderAttribution('0xdeadbeef', { code: 'neo_app', enabled: true, chainId: 84532 });
  assert.equal(actual, '0xdeadbeef' + baseBuilderCodeSuffix('neo_app').slice(2));
  assert.throws(() => appendBaseBuilderAttribution('0x', { code: 'neo_app', enabled: true, chainId: 1 }), /restricted to Base/);
  assert.throws(() => appendBaseBuilderAttribution('0xdeadbeef', { enabled: true, chainId: 8453 }), /Builder Code/);
});

test('rejects malformed input, unapproved characters, and duplicate suffixes', () => {
  for (const code of ['', 'CAPS', 'bad-code', 'x'.repeat(33), 'name,other']) {
    assert.throws(() => baseBuilderCodeSuffix(code), /Builder Code/);
  }
  for (const input of ['deadbeef', '0xabc', '0xg1']) {
    assert.throws(() => appendBaseBuilderAttribution(input, {code:'neo_app', enabled:true, chainId:8453}), /Calldata/);
  }
  const withSuffix = appendBaseBuilderAttribution('0xdeadbeef', { code:'neo_app', enabled:true, chainId:8453 });
  assert.throws(() => appendBaseBuilderAttribution(withSuffix, { code:'neo_app', enabled:true, chainId:8453 }), /already ends/);
});
