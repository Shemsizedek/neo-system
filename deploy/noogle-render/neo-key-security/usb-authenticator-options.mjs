// NEO Key Gate 18 — security capability classification for devices and
// optional software. Advisory, fail-closed, and entirely offline.
// A GitHub repo, USB file, or software CTAP emulator is NOT evidence that
// an ordinary USB drive or peripheral receiver became secure FIDO2 hardware.
const devices=new Set(['usb-flash-drive','logitech-receiver','fido2-hardware','platform-passkey','unknown']);
const software=new Set(['none','usb-raptor','virtual-fido','webauthn-test-emulator']);
export function classifyNeoKeyUsbOption({device='unknown',tool='none'}={}) {
  if(!devices.has(device)||!software.has(tool))
    throw Error('neo_key_usb_unsupported_configuration');
  const localWindowsLock=device==='usb-flash-drive'&&tool==='usb-raptor';
  const softwareFidoLab=tool==='virtual-fido'||tool==='webauthn-test-emulator';
  // These are mutually independent capabilities. Do not conflate a
  // software CTAP transport, a Windows screen-lock file and physical FIDO2.
  return Object.freeze({
    device,tool,
    windowsUsbLockAvailable:localWindowsLock,
    softwareWebAuthnLabAvailable:softwareFidoLab,
    physicalFido2Detected:false,
    physicalFido2Certified:false,
    independentSecurityReviewSatisfied:false,
    canSatisfyPhysicalFido2Gate:false,
    productionEnrollmentAuthorized:false,
    actionPerformed:false,
    warnings:Object.freeze([
      ...(localWindowsLock?['USB_RAPTOR_IS_WINDOWS_LOCK_NOT_WEBAUTHN']:[]),
      ...(softwareFidoLab?['EMULATED_CTAP_IS_NOT_HARDWARE_BACKED_FIDO2']:[]),
      ...(device==='logitech-receiver'?['LOGITECH_RECEIVER_IS_PERIPHERAL_NOT_AUTHENTICATOR']:[]),
      ...(device==='usb-flash-drive'?['FLASH_DRIVE_HAS_NO_DEDICATED_FIDO2_SECURE_ELEMENT']:[]),
      ...(device==='platform-passkey'?['PLATFORM_PASSKEY_REQUIRES_LOCAL_BROWSER_AND_PROVIDER_ENROLLMENT']:[]),
      ...(device==='fido2-hardware'?['HARDWARE_CLAIM_REQUIRES_DIRECT_DEVICE_AND_ATTESTATION_VERIFICATION']:[])
    ])
  });
}
