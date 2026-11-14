import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const filepath=fileURLToPath(new URL('../diagnostics/multicloud-008-rootless-codespace.sh',import.meta.url));
const source=readFileSync(filepath,'utf8');

test('operator shell parses without execution',()=>{
  const r=spawnSync('bash',['-n',filepath],{encoding:'utf8',timeout:5000});
  assert.equal(r.status,0,r.stderr);
});
test('uses official unprivileged rootless image only',()=>{
  assert.match(source,/netbirdio\/netbird:rootless-latest/);
  assert.match(source,/docker run --rm --detach/);
  for(const forbidden of ['--privileged','--cap-add','--network=host','--network host','--publish','--restart=always'])
    assert.ok(!source.includes(forbidden),'forbidden option '+forbidden);
});
test('setup key entered privately, hidden and not passed as a command argument',()=>{
  assert.match(source,/read -r -s -p .* NB_SETUP_KEY <\/dev\/tty/);
  assert.match(source,/--env NB_SETUP_KEY\s*\\/);
  assert.doesNotMatch(source,/--env NB_SETUP_KEY="/);
  assert.match(source,/unset NB_SETUP_KEY/);
});
test('blocks CI and non-Codespaces host environments',()=>{
  assert.match(source,/CI_RUNNER_NOT_APPROVED_FOR_NETBIRD_ENROLLMENT/);
  assert.match(source,/HOLD_NOT_VERIFIED_AS_CODESPACE/);
});
test('will not reuse existing container or volume',()=>{
  assert.match(source,/container_exists \|\| volume_exists/);
  assert.match(source,/HOLD_EXISTING_PILOT_CONTAINER_OR_STATE_REQUIRES_REVIEW/);
});
test('status checks daemon only, not a WireGuard handshake claim',()=>{
  assert.match(source,/docker exec "\$CONTAINER" netbird status --check ready/);
  assert.match(source,/PILOT_NETBIRD_DAEMON_READY_CHECK_ANDROID_PEERS/);
});
test('stop removes only its own pilot and secret-bearing volume',()=>{
  assert.match(source,/docker stop "\$CONTAINER"/);
  assert.match(source,/docker volume rm "\$VOLUME"/);
  assert.ok(!source.includes('sentinelx-cloud-core'));
});
test('does not publish a port or mutate DNS/routes/firewall',()=>{
  assert.doesNotMatch(source,/--publish|--expose|\s-p\s+\d+:/);
  assert.doesNotMatch(source,/\biptables\b|\bnft\b|\bufw\b|docker\s+network\s+create/);
});
test('explicit operator command and console required',()=>{
  assert.match(source,/start\|status\|stop/);
  assert.match(source,/HOLD_OPERATOR_PRIVATE_TERMINAL_REQUIRED/);
});
