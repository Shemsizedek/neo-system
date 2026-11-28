# NEO Key / USB Raptor — explicitly authorized LOCAL Windows installer.
# Never execute in Codespaces; never install automatically on a shared PC.
# This installs a Windows screen-lock helper, NOT a FIDO2 authenticator.
[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'High')]
param(
  [Parameter(Mandatory = $true)][string]$ArchivePath,
  [switch]$Install,
  [switch]$AuthorizedWindowsComputer,
  [switch]$RecoveryUnlockMethodVerified,
  [switch]$MalwareScanReviewed,
  [switch]$AllowUnsignedVendorInstaller
)
$ErrorActionPreference = 'Stop'
if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) {
  throw 'USB_RAPTOR_WINDOWS_ONLY: Codespaces/Linux cannot run this installer'
}
$expectedHash = 'ef57166a9f01bb204ef7ec3beb49634cb5f2dd8427d121d21e2bf1fda3a6ee6e'
$expectedBytes = 9941035
$archive = (Resolve-Path -LiteralPath $ArchivePath -ErrorAction Stop).ProviderPath
$item = Get-Item -LiteralPath $archive -ErrorAction Stop
if ($item.PSIsContainer -or $item.Length -ne $expectedBytes) {
  throw 'USB_RAPTOR_INVALID_ARCHIVE_SIZE'
}
$actualHash = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actualHash -ne $expectedHash) {
  throw 'USB_RAPTOR_CHECKSUM_MISMATCH'
}
Write-Output 'USB_RAPTOR_ARCHIVE=PINNED_SHA256_VERIFIED'
Write-Output 'FIDO2_SECURITY_KEY=NO'
if (-not $Install) {
  Write-Output 'INSTALLATION=NOT_REQUESTED'
  Write-Output 'NEXT=Review_windows_device_authorization_recovery_and_malware_scan'
  return
}
if (-not $AuthorizedWindowsComputer -or
    -not $RecoveryUnlockMethodVerified -or
    -not $MalwareScanReviewed) {
  throw 'USB_RAPTOR_INSTALL_BLOCKED: authorized PC, alternate Windows unlock, and independent malware scan review are required'
}
# Interactive ShouldProcess respects -WhatIf and high-impact confirmation.
if (-not $PSCmdlet.ShouldProcess('authorized local Windows computer',
    'Extract vendor ZIP and launch interactive USB Raptor installer')) {
  Write-Output 'INSTALLATION=CANCELLED'
  return
}
$workDir = Join-Path ([System.IO.Path]::GetTempPath()) ('neo-usb-raptor-' + [Guid]::NewGuid().ToString('N'))
try {
  [System.IO.Directory]::CreateDirectory($workDir) | Out-Null
  Expand-Archive -LiteralPath $archive -DestinationPath $workDir -ErrorAction Stop
  $installer = Join-Path $workDir 'Output\USB Raptor Setup.exe'
  if (-not (Test-Path -LiteralPath $installer -PathType Leaf)) {
    throw 'USB_RAPTOR_EXPECTED_INSTALLER_MISSING'
  }
  # A pinned archive hash is not an executable-signature verification.
  $signature = Get-AuthenticodeSignature -LiteralPath $installer
  if ($signature.Status.ToString() -eq 'NotSigned') {
    if (-not $AllowUnsignedVendorInstaller) {
      throw 'USB_RAPTOR_UNSIGNED_INSTALLER: explicit acceptance required'
    }
    Write-Warning 'Unsigned vendor binary explicitly accepted. Ensure independent malware scan has been reviewed.'
  } elseif ($signature.Status.ToString() -ne 'Valid') {
    throw ('USB_RAPTOR_INVALID_SIGNATURE: ' + $signature.Status.ToString())
  }
  # Keep OS privilege prompts intact; never bypass policy or use silent setup flags.
  $process = Start-Process -FilePath $installer -PassThru -Wait -ErrorAction Stop
  if ($process.ExitCode -ne 0) {
    throw ('USB_RAPTOR_INSTALLER_EXIT_' + $process.ExitCode)
  }
  Write-Output 'INSTALLER_PROCESS=EXITED_SUCCESSFULLY'
  Write-Output 'LOCK_CONFIGURATION=MANUAL_LOCAL_ONLY'
  Write-Output 'HARDWARE_FIDO2=NOT_CREATED'
} finally {
  if (Test-Path -LiteralPath $workDir) {
    Remove-Item -LiteralPath $workDir -Recurse -Force -ErrorAction SilentlyContinue
  }
}
