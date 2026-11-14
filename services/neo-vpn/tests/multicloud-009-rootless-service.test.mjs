import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const script=fileURLToPath(new URL('../diagnostics/multicloud-009-rootless-service.sh',import.meta.url));
const source=readFileSync(script,'utf8');

test('bash syntax is valid without running against any Docker daemon',()=>{
  const r=spawnSync('bash',['-n',script],{encoding:'utf8',timeout:4000});
  assert.equal(r.status,0,r.stderr);
});
test('requires user-owned Codespace and disallows CI',()=>{
  assert.match(source,/CODESPACES/);
  assert.match(source,/GITHUB_ACTIONS/);
  assert.match(source,/HOLD_NOT_AN_APPROVED_INTERACTIVE_CODESPACE/);
  assert.match(source,/\/dev\/tty/);
});
test('requires the existing approved rootless container identity',()=>{
  assert.match(source,/neo-cs-netbird-pilot/);
  assert.match(source,/netbirdio\/netbird:rootless-latest/);
  assert.match(source,/HOLD_UNEXPECTED_CONTAINER_IDENTITY/);
  assert.match(source,/ACTUAL_USER/);
  assert.match(source,/netbird status --check ready/);
});
test('does not create containers, publish ports or change Linux capabilities',()=>{
  const active=source.split('\n').filter(x=>!x.trimStart().startsWith('#')).join('\n');
  for(const keyword of ['docker run','docker create','--privileged','--cap-add','--network=host',
     '--publish','iptables','nft add','ufw','sudo ','docker start','systemctl'])
    assert.ok(!active.includes(keyword),'Forbidden command: '+keyword);
  assert.match(active,/docker exec -d "\$CONTAINER"/);
});
test('requires explicit operator-reviewed narrow peer access rule',()=>{
  assert.match(source,/Type POLICY_REVIEWED/);
  assert.match(source,/HOLD_ACCESS_POLICY_NOT_REVIEWED/);
  assert.match(source,/if \[\[ "\$APPROVAL" != "POLICY_REVIEWED" \]\]/);
});
test('only fixed minimal JSON response is served',()=>{
  assert.match(source,/neo-private-probe/);
  assert.match(source,/NEO-MULTICLOUD-002/);
  assert.match(source,/PRIVATE_APPLICATION_RESPONSE/);
  assert.match(source,/private_tunnel_verified.*false/);
  assert.match(source,/gateway_production_verified.*false/);
  assert.ok(!source.includes('NB_SETUP_KEY'));
  assert.ok(!source.includes('read -r -s -p'));
});
test('inbound listener is confined to Docker container and expires',()=>{
  assert.match(source,/timeout 120 busybox httpd -f -p 0\.0\.0\.0:18443/);
  assert.match(source,/busybox wget -q -O - http:\/\/127\.0\.0\.1:18443/);
  assert.match(source,/LOCAL_CONTAINER_TEST_RESPONSE_OK_ANDROID_REQUEST_AND_HANDSHAKE_NOT_VERIFIED/);
});
test('refuses overwrite of existing test fixture',()=>{
  assert.match(source,/test ! -e \/tmp\/neo-mc009-www\/neo-private-probe/);
  assert.match(source,/HOLD_EXISTING_TEST_RESPONSE_OR_CONTAINER_FILE_ERROR/);
});
test('no private traffic or peer handshake success is fabricated',()=>{
  assert.ok(!source.includes('PRIVATE_WIREGUARD_VERIFIED'));
  assert.match(source,/HOLD_NO_LOCAL_TEST_SERVICE_RESPONSE/);
  assert.match(source,/ANDROID_REQUEST_AND_HANDSHAKE_NOT_VERIFIED/);
});
