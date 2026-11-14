import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

import {mkdtempSync, writeFileSync, chmodSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

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

function mockDockerStatus(envOverrides={}) {
  const dir=mkdtempSync(join(tmpdir(),'neo-mc011-docker-'));
  const command=join(dir,'docker');
  const scriptText=[
    '#!/bin/sh',
    'case "$1" in',
    ' info) exit 0 ;;',
    ' container) exit 0 ;;',
    ' inspect)',
    '   case "$3" in',
    "     '{{.Config.Image}}') printf '%s\\n' 'netbirdio/netbird:rootless-latest' ;;",
    "     '{{.Config.User}}') printf '%s\\n' 'netbird:netbird' ;;",
    "     '{{.HostConfig.NetworkMode}}') printenv MOCK_NET_MODE ;;",
    "     '{{.HostConfig.Privileged}}') printenv MOCK_PRIVILEGED ;;",
    "     '{{json .HostConfig.PortBindings}}') printenv MOCK_PORTS ;;",
    "     '{{json .HostConfig.CapAdd}}') printenv MOCK_CAPS ;;",
    '     *) exit 99 ;;',
    '   esac ;;',
    ' exec) exit 0 ;;',
    ' *) exit 99 ;;',
    'esac',
  ].join('\n')+'\n';
  writeFileSync(command,scriptText);
  chmodSync(command,0o700);
  try {
    const env={...process.env,
      PATH:dir+':'+process.env.PATH,
      CODESPACES:'true',CI:'',GITHUB_ACTIONS:'',
      MOCK_NET_MODE:'bridge',MOCK_PRIVILEGED:'false',
      MOCK_PORTS:'{}',MOCK_CAPS:'null',...envOverrides};
    return spawnSync('bash',[script,'status'],{env,encoding:'utf8',timeout:5000});
  } finally { rmSync(dir,{recursive:true,force:true}); }
}
test('existing container must have an unexposed unprivileged Docker runtime',()=>{
  const r=mockDockerStatus();
  assert.equal(r.status,0,r.stdout+' '+r.stderr);
  assert.match(r.stdout,/LOCAL_CONTAINER_TEST_RESPONSE_OK_ANDROID_REQUEST_AND_HANDSHAKE_NOT_VERIFIED/);
});
test('published host port blocks private probe before any container service attempt',()=>{
  const r=mockDockerStatus({MOCK_PORTS:'{"18443/tcp":[{"HostIp":"0.0.0.0","HostPort":"18443"}]}'});
  assert.equal(r.status,2);
  assert.match(r.stdout,/HOLD_CONTAINER_EXPOSURE_OR_PRIVILEGE_POLICY/);
});
test('privileged container cannot host this purported rootless pilot',()=>{
  const r=mockDockerStatus({MOCK_PRIVILEGED:'true'});
  assert.equal(r.status,2);
  assert.match(r.stdout,/HOLD_CONTAINER_EXPOSURE_OR_PRIVILEGE_POLICY/);
});
test('host networking is rejected even if no explicit port publishing',()=>{
  const r=mockDockerStatus({MOCK_NET_MODE:'host'});
  assert.equal(r.status,2);
  assert.match(r.stdout,/HOLD_CONTAINER_EXPOSURE_OR_PRIVILEGE_POLICY/);
});
test('extra Docker network capabilities are rejected before the probe',()=>{
  const r=mockDockerStatus({MOCK_CAPS:'["NET_ADMIN"]'});
  assert.equal(r.status,2);
  assert.match(r.stdout,/HOLD_CONTAINER_EXPOSURE_OR_PRIVILEGE_POLICY/);
});
