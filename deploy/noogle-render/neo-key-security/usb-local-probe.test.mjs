import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

test('Gate 13 Linux USB probe is read-only, noncertifying and emits no identifiers',()=>{
  const script=fileURLToPath(new URL('./usb-local-probe.sh',import.meta.url));
  const source=readFileSync(script,'utf8');
  for(const dangerous of ['sudo ','mkfs','dd if=','fido2-token -S','fido2-token -R','fido2-token -C','apt install','curl | sh']){
    assert.equal(source.includes(dangerous),false,`forbidden side effect: ${dangerous}`);
  }
  const r=spawnSync('sh',[script],{encoding:'utf8',
    env:{...process.env,CODESPACES:'true'},timeout:5000});
  assert.equal(r.status,0,r.stderr);
  assert.match(r.stdout,/NEO_KEY_USB_PROBE=read_only/);
  assert.match(r.stdout,/FIDO2_CERTIFIED=NO/);
  assert.equal(r.stdout.includes('/dev/hidraw'),false);
  assert.equal(r.stdout.includes('serial='),false);
});

test('opt-in Codespaces devcontainer does not install, expose ports or touch production',()=>{
  const file=new URL('../../../.devcontainer/neo-key-lab/devcontainer.json',import.meta.url);
  const config=JSON.parse(readFileSync(file,'utf8'));
  assert.ok(config.name.includes('NEO Key'));
  assert.deepEqual(config.forwardPorts,[]);
  assert.equal(config.portsAttributes['*'].onAutoForward,'ignore');
  assert.equal(config.postCreateCommand,undefined);
  assert.equal(config.postStartCommand,undefined);
  assert.equal(config.initializeCommand,undefined);
  assert.equal(config.features,undefined);
});

test('Gate 14 Windows local device probe cannot modify devices or emit identifiers',()=>{
  const ps=new URL('./usb-windows-local-probe.ps1',import.meta.url);
  const src=readFileSync(ps,'utf8');
  for(const verb of [
    'Set-PnpDevice','Disable-PnpDevice','Enable-PnpDevice',
    'Format-Volume','Initialize-Disk','Clear-Disk','Remove-Item',
    'Set-ExecutionPolicy','Start-Process','Invoke-Expression',
    'Invoke-WebRequest','Export-', 'Set-Content','Out-File'
  ]) assert.equal(src.includes(verb),false,`forbidden mutable action: ${verb}`);
  assert.match(src,/Get-CimInstance -ClassName Win32_DiskDrive/);
  assert.match(src,/Get-CimInstance -ClassName Win32_PnPEntity/);
  assert.match(src,/FIDO2_HARDWARE_VERIFIED=NO/);
  assert.match(src,/NO_DEVICE_CHANGES=TRUE/);
  assert.equal(src.includes('Write-Output $_.PNPDeviceID'),false);
  assert.equal(src.includes('Write-Output $_.SerialNumber'),false);
});
