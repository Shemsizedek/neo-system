# Project 144 — NEO Key Gate 18: USB Raptor, virtual FIDO and real passkey paths

**Date:** 2026-11-24 · **PR:** [#1435](https://github.com/Shemsizedek/neo-system/pull/1435)  
**Security/release:** Development only, draft and unmerged; production, spending, connected USB peripherals, account security settings and active browser unchanged.

## Objective and hardware facts

The user currently reports two locally attached devices: an ordinary USB flash drive and a Logitech peripheral receiver. Neither contains a verified CTAP2 secure authenticator, and **no flash-file download, Windows app, Linux Codespace or firmware-free software installation can turn either device into dedicated hardware-backed FIDO2 key hardware**.

Do not mislabel software FIDO2 emulation as physical hardware certification. To make practical progress, separate THREE distinct options:

| Capability | Technology | Can work with current reported equipment? | FIDO2 status |
| --- | --- | --- | --- |
| Auto-lock personal Windows session on removing flash drive | USB Raptor | **Potentially yes**, on a personally owned/authorized Windows PC with backup unlock | **NOT FIDO2/WebAuthn** |
| Lab-only FIDO2 USB/IP emulation or browser WebAuthn testing | Virtual FIDO; Chromium/WebDevAuthn virtual authenticator | Can run on a suitable authorized host with OS permissions; credential file **could** reside on flash storage, but that remains cloneable host-software material. Logitech receiver is not used. | Software emulation, **NOT hardware-backed or independently certified** |
| Real provider-supported phishing-resistant passkey | Windows Hello, a supported personal phone, or genuine FIDO2 security key | Windows Hello/personal phone may require **no new USB hardware**; a genuine roaming USB key is a distinct device | Provider-supported WebAuthn/FIDO2 only after genuine local browser registration and authentication |

## Reviewed upstream projects (verify releases before use)

### USB Raptor — Windows lock key

- **Official distribution:** https://sourceforge.net/projects/usbraptor/files/
- **Upstream overview/FAQ:** https://sourceforge.net/p/usbraptor/wiki/FAQ/
- At research time the SourceForge file listing offered `USBRaptor_01994_(Cherry2)_Installer.zip`, released 2026-08-11, as the latest 0.19.94 download.
- USB Raptor watches for a small encrypted unlock file on the normal flash drive and can automatically lock/unlock the **local Windows desktop**. It does not register a WebAuthn credential, store a nonextractable FIDO2 private key, or add CTAP2 HID capability. It also does not convert a Logitech Unifying/Bolt dongle.
- **Never install on a library, institutional or shared machine without its owner/administrator permission.** Do not disable built-in Windows locking, antivirus, security policies or recovery methods.
- Before any installation on an authorized personal PC: independently confirm publisher/download provenance and antivirus result; prepare a separate Windows PIN/password fallback; back up personal files from the flash drive; ensure you can unlock the PC **without** the flash drive. Test the Windows lock only on a machine you can recover.
- No USB Raptor download, installation, lock-file generation, or Windows device change occurred in this gate.

### Virtual FIDO — virtual USB/IP test authenticator

- https://github.com/bulwarkid/virtual-fido
- This is a **beta** Go software emulator of FIDO2/U2F/CTAP. It can expose a virtual USB device via USB/IP and store encrypted software credentials, but on Windows/Linux the setup may require local USB/IP drivers, kernel privileges or administrative rights. Read its threat model and source before installing.
- Not hardware-backed: software keys may be exportable, copied, lost, leaked or replaced. **Do not enroll a virtual authenticator on real ChatGPT/Daybreak/NEO production accounts** or claim it meets a physical FIDO2 hardware gate.
- A running Linux **Codespace does not provide the user's local USB receiver/flash drive or Windows USB/IP driver**; GitHub Actions synthetic tests are the appropriate initial no-spend proving ground.
- No emulator/USB-IP driver has been installed or started by ChatGPT.

### Browser virtual authenticator (for development)

- https://github.com/GramThanos/WebDevAuthn (experimental testing and analysis) or Chromium's DevTools WebAuthn virtual authenticator, strictly for isolated test RP / synthetic identities.
- Fake authenticators can produce test signatures and exercise server-side challenge, replay, recovery and rollback code. **These tests do not prove real USB hardware enrollment**.

## Gate 18 code delivered

- `neo-key-security/usb-authenticator-options.mjs` is a pure, read-only capability classifier. Its outcomes explicitly separate USB Raptor host lock, virtual FIDO software lab, Windows platform passkeys and genuine hardware. It always requires separate real-world physical device verification and independent security review.
- `neo-key-security/usb-authenticator-options.test.mjs` proves USB Raptor/flash drive and Logitech receiver cannot pass a physical-hardware gate, and even claimed FIDO2/virtual-FIDO devices remain unverified without direct evidence.
- Existing `.github/workflows/neo-key-prototype-ci.yml` includes the tests in GitHub Actions. No USB files, drivers, system packages, private keys, accounts or user PCs are touched.

## Gate 18 user-side safe sequence

1. **Local USB Raptor path** (optional, only authorized personal Windows machine): confirm device is an ordinary flash drive, review official installer safety, preserve fallback login, then install and initialize the lock file locally. Never confuse successful screen locking with signing a WebAuthn challenge.
2. **Actual passkey path**: if your own Windows PC supports Windows Hello and browser passkeys, use a test account at an approved relying party to create a platform passkey; alternatively use a personally owned phone. Do not use a public library PC for a permanent personal passkey.
3. **Software FIDO2 testing path**: review Virtual FIDO / browser DevTools emulation, then run against synthetic NEO test identities and an isolated HTTPS RP after approval. Keep emulated credentials off production services.
4. **Hardware-certified FIDO2 path**: identify a genuine FIDO2 roaming security key and backup, test both with user verification and device recovery, and separately obtain independent reviewer sign-off. The Logitech receiver remains for its intended mouse/keyboard.
5. **Codespace runtime**: first repair its Alpine fallback to an approved Node 24 development environment; do not launch a paid Codespace or force Git sync. Current existing GitHub Actions tests can validate repo changes independently.

## Go/no-go gates

- Real USB device manufacture/model inspection: NOT performed, user reports normal flash + Logitech receiver.
- USB Raptor Windows local lock: NOT installed or tested.
- Virtual FIDO software authenticator: NOT installed or live tested; staged as potential isolated lab approach.
- Windows Hello/phone passkey availability: NOT verified on the user's own permitted host.
- Independent security reviewer and two real enrollment custodians: NOT verified.
- Dedicated HTTPS RP, issuer custody, rollback rehearsal and owner release authorization: NOT verified.

**Production authentication: NO-GO. Staging deployment: NO-GO.** The ability to classify or emulate software FIDO2 does not establish hardware-backed certification. No production changes, spending, security-key enrollment, network service, or PR merge in Gate 18.
