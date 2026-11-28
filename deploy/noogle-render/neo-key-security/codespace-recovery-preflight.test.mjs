import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

test('Gate 17 recovery preflight detects state without changing the Codespace',()=>{
  const script=fileURLToPath(new URL('./codespace-recovery-preflight.sh',import.meta.url));
  const source=readFileSync(script,'utf8');
  // A human must explicitly authorize every package install, git sync,
  // rebuild or container mutation. This script is a pure inventory.
  for(const action of [
    'sudo ','apk add','apt-get install','curl ','wget ',
    'git fetch','git pull','git checkout','git reset',
    'npm install','npm ci','docker run','docker build',
    'rm -','mkfs','fido2-token -S','fido2-token -R'
  ]){
    assert.equal(source.includes(action),false,`must not invoke ${action}`);
  }
  const r=spawnSync('sh',[script],{
    encoding:'utf8',timeout:10000,
    env:{...process.env,CODESPACES:'true'}
  });
  assert.equal(r.status,0,r.stderr);
  assert.match(r.stdout,/NEO_KEY_CODESPACE_PREFLIGHT=READ_ONLY/);
  assert.match(r.stdout,/ENVIRONMENT=CLOUD_OR_CONTAINER/);
  assert.match(r.stdout,/FIDO2_CERTIFIED=NO/);
  assert.match(r.stdout,/USB_LOCAL_PASSTHROUGH=NOT_VERIFIED/);
  assert.match(r.stdout,/PRODUCTION_MODIFIED=NO/);
  assert.doesNotMatch(r.stdout,/TOKEN=|PASSWORD=|SECRET=/);
});
