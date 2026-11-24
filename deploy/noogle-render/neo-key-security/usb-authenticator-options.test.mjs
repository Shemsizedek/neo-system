import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyNeoKeyUsbOption} from './usb-authenticator-options.mjs';

test('USB Raptor turns ordinary storage into a local Windows lock token, never hardware FIDO2',()=>{
  const r=classifyNeoKeyUsbOption({device:'usb-flash-drive',tool:'usb-raptor'});
  assert.equal(r.windowsUsbLockAvailable,true);
  assert.equal(r.softwareWebAuthnLabAvailable,false);
  assert.equal(r.physicalFido2Certified,false);
  assert.equal(r.canSatisfyPhysicalFido2Gate,false);
  assert.equal(r.productionEnrollmentAuthorized,false);
  assert.equal(r.actionPerformed,false);
  assert.ok(r.warnings.includes('USB_RAPTOR_IS_WINDOWS_LOCK_NOT_WEBAUTHN'));
});

test('Logitech receiver remains peripheral even if an emulator or USB lock utility is present',()=>{
  for(const tool of ['none','usb-raptor','virtual-fido','webauthn-test-emulator']){
    const r=classifyNeoKeyUsbOption({device:'logitech-receiver',tool});
    assert.equal(r.windowsUsbLockAvailable,false);
    assert.equal(r.physicalFido2Detected,false);
    assert.equal(r.canSatisfyPhysicalFido2Gate,false);
    assert.ok(r.warnings.includes('LOGITECH_RECEIVER_IS_PERIPHERAL_NOT_AUTHENTICATOR'));
  }
});

test('virtual FIDO2 software supports lab classification but never hardware certification',()=>{
  for(const tool of ['virtual-fido','webauthn-test-emulator']){
    const r=classifyNeoKeyUsbOption({device:'usb-flash-drive',tool});
    assert.equal(r.softwareWebAuthnLabAvailable,true);
    assert.equal(r.physicalFido2Certified,false);
    assert.equal(r.independentSecurityReviewSatisfied,false);
    assert.equal(r.productionEnrollmentAuthorized,false);
    assert.ok(r.warnings.includes('EMULATED_CTAP_IS_NOT_HARDWARE_BACKED_FIDO2'));
  }
});

test('claimed FIDO2 device and platform passkey remain unverified without local evidence',()=>{
  const key=classifyNeoKeyUsbOption({device:'fido2-hardware'});
  assert.equal(key.physicalFido2Certified,false);
  assert.ok(key.warnings.includes('HARDWARE_CLAIM_REQUIRES_DIRECT_DEVICE_AND_ATTESTATION_VERIFICATION'));
  const platform=classifyNeoKeyUsbOption({device:'platform-passkey'});
  assert.equal(platform.productionEnrollmentAuthorized,false);
  assert.ok(platform.warnings.includes('PLATFORM_PASSKEY_REQUIRES_LOCAL_BROWSER_AND_PROVIDER_ENROLLMENT'));
});

test('unknown software and device types fail closed without any side effects',()=>{
  assert.throws(()=>classifyNeoKeyUsbOption({device:'logitech-receiver',tool:'reflash-firmware'}),
    /unsupported_configuration/);
  assert.throws(()=>classifyNeoKeyUsbOption({device:'unknownUSB',tool:'none'}),
    /unsupported_configuration/);
  const r=classifyNeoKeyUsbOption();
  assert.equal(r.physicalFido2Detected,false);
  assert.equal(r.actionPerformed,false);
  assert.equal(r.canSatisfyPhysicalFido2Gate,false);
});
