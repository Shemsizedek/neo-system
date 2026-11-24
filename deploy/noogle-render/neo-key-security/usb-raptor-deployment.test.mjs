import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const local=file=>fileURLToPath(new URL('./usb-raptor/'+file,import.meta.url));
const read=file=>readFileSync(local(file),'utf8');
const manifest=JSON.parse(read('package-lock.json'));

test('uploaded USB Raptor archive is pinned to a known Windows-only non-FIDO2 release',()=>{
  assert.equal(manifest.package,'USB Raptor');
  assert.equal(manifest.version,'0.19.94');
  assert.equal(manifest.release,'Cherry2');
  assert.equal(manifest.archive,'USBRaptor_01994_(Cherry2)_Installer.zip');
  assert.equal(manifest.sha256,'ef57166a9f01bb204ef7ec3beb49634cb5f2dd8427d121d21e2bf1fda3a6ee6e');
  assert.equal(manifest.archiveBytes,9941035);
  assert.equal(manifest.operatingSystem,'Windows');
  assert.equal(manifest.fido2Authenticator,false);
  assert.equal(manifest.hardwareSecurityKey,false);
  assert.equal(manifest.compatibleWithCodespacesRuntime,false);
  assert.match(manifest.officialDownload,/^https:\/\/sourceforge\.net\/projects\/usbraptor\/files\//);
});

test('Codespaces script never installs vendor executable or touches local hardware',()=>{
  const source=read('stage-usb-raptor.sh');
  assert.ok(source.includes(manifest.sha256));
  assert.ok(source.includes('9941035'));
  assert.ok(source.includes(manifest.officialDownload));
  for(const unsafe of [
    'sudo ','apk add','apt install','wine ','mono ',
    'fido2-token -S','Start-Process','chmod +x',
    'mkfs','mount ','git push','git reset','git checkout',
    'curl | sh','eval '
  ]) assert.equal(source.includes(unsafe),false,'unexpected action: '+unsafe);
  const help=spawnSync('sh',[local('stage-usb-raptor.sh'),'--help'],
    {encoding:'utf8',timeout:5000});
  assert.equal(help.status,0,help.stderr);
  assert.match(help.stdout,/--verify/);
  assert.match(help.stdout,/--stage/);
  assert.match(help.stdout,/--download/);
});

test('tampered archive cannot pass checksum verification or reach install',()=>{
  const dir=mkdtempSync(join(tmpdir(),'neo-usb-raptor-test-'));
  try {
    const fake=join(dir,'untrusted.zip');
    writeFileSync(fake,'not a vendor archive');
    const r=spawnSync('sh',[local('stage-usb-raptor.sh'),'--verify',fake],
      {encoding:'utf8',timeout:5000});
    assert.notEqual(r.status,0);
    assert.match(r.stderr,/WRONG_BYTE_COUNT|SHA256_MISMATCH/);
    assert.doesNotMatch(r.stdout,/STAGED_ARCHIVE=|INSTALLATION=NOT_PERFORMED/);
  }finally{rmSync(dir,{recursive:true,force:true});}
});

test('Windows installer uses checksum verification and explicit authorization barriers',()=>{
  const src=read('Install-NeoUsbRaptor.ps1');
  assert.ok(src.includes(manifest.sha256));
  assert.match(src,/Get-FileHash -LiteralPath \$archive -Algorithm SHA256/);
  assert.match(src,/\[PlatformID\]::Win32NT/);
  assert.match(src,/AuthorizedWindowsComputer/);
  assert.match(src,/RecoveryUnlockMethodVerified/);
  assert.match(src,/MalwareScanReviewed/);
  assert.match(src,/AllowUnsignedVendorInstaller/);
  assert.match(src,/ShouldProcess/);
  assert.match(src,/Get-AuthenticodeSignature/);
  assert.match(src,/Start-Process -FilePath \$installer -PassThru -Wait/);
  assert.match(src,/FIDO2_SECURITY_KEY=NO/);
  for(const unsafe of ['-Verb RunAs','-ExecutionPolicy Bypass','-WindowStyle Hidden',
    'Set-MpPreference','Format-Volume','Clear-Disk','Set-PnpDevice','Enable-PnpDevice',
    'Disable-PnpDevice','Install-Module','Invoke-Expression']){
    assert.equal(src.includes(unsafe),false,'unreviewed Windows action: '+unsafe);
  }
});
