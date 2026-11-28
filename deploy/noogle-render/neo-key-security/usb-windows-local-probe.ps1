# NEO Key Gate 14 — LOCAL Windows USB inventory, read-only.
# Execute only on a computer you own or are permitted to inspect.
# This does not initialize, flash, format, modify, or enroll a USB device.
# It intentionally does not print PnP IDs, serial numbers or private data.
$ErrorActionPreference = 'Stop'
Write-Output 'NEO_KEY_LOCAL_DEVICE_CHECK=READ_ONLY'
if ($env:CODESPACES -or $env:GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN) {
  Write-Output 'ENVIRONMENT=CLOUD_CODESPACE_NOT_LOCAL_USB'
  Write-Output 'FIDO2_CERTIFIED=NO'
  exit 0
}
if (-not $IsWindows -and $PSVersionTable.PSEdition -eq 'Core') {
  Write-Output 'ENVIRONMENT=NOT_WINDOWS_USE_LINUX_PROBE'
  Write-Output 'FIDO2_CERTIFIED=NO'
  exit 0
}
Write-Output 'ENVIRONMENT=LOCAL_WINDOWS_CHECK'
try {
  $drives = @(Get-CimInstance -ClassName Win32_DiskDrive -ErrorAction Stop |
    Where-Object { $_.InterfaceType -eq 'USB' })
  Write-Output ('USB_STORAGE_CANDIDATE=' + $(if ($drives.Count -gt 0) { 'DETECTED' } else { 'NOT_DETECTED' }))
} catch {
  Write-Output 'USB_STORAGE_CANDIDATE=UNKNOWN_ACCESS_RESTRICTED'
}
try {
  $devices = @(Get-CimInstance -ClassName Win32_PnPEntity -ErrorAction Stop)
  $receiver = @($devices | Where-Object {
    $name = [string]$_.Name
    $name -match '(?i)Logitech.*(Receiver|Unifying|Bolt)'
  })
  Write-Output ('LOGITECH_RECEIVER_CANDIDATE=' + $(if ($receiver.Count -gt 0) { 'DETECTED' } else { 'NOT_DETECTED_OR_UNNAMED' }))
  # A generic USB HID device is not sufficient evidence of FIDO2.
  Write-Output 'FIDO2_HARDWARE_VERIFIED=NO'
} catch {
  Write-Output 'LOGITECH_RECEIVER_CANDIDATE=UNKNOWN_ACCESS_RESTRICTED'
  Write-Output 'FIDO2_HARDWARE_VERIFIED=NO'
}
Write-Output 'NEXT=USE_AUTHORIZED_LOCAL_BROWSER_PASSKEY_FLOW_FOR_GENUINE_AUTHENTICATOR'
Write-Output 'NO_DEVICE_CHANGES=TRUE'
