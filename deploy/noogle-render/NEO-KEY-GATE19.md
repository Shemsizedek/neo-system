# Project 144 — NEO Key Gate 19: optional USB Raptor package integration

**Date:** 2026-11-24  
**PR:** [#1435](https://github.com/Shemsizedek/neo-system/pull/1435) (draft, unmerged)  
**Release status:** Windows local-lock utility packaged as an **opt-in install workflow**, NOT installed on a Windows computer, NOT executed in Codespaces, and NOT a FIDO2/WebAuthn authenticator. No production changes or spending.

## Source archive verification

The user provided `USBRaptor_01994_(Cherry2)_Installer.zip`. The exact uploaded ZIP was independently inspected in the current task without executing its contents.

| Attribute | Value |
| --- | --- |
| Version | 0.19.94 (Cherry2) |
| ZIP bytes | 9,941,035 |
| SHA-256 | `ef57166a9f01bb204ef7ec3beb49634cb5f2dd8427d121d21e2bf1fda3a6ee6e` |
| ZIP contents | `Output/USB Raptor Setup.exe`, `Output/Version Changes.txt` |
| Archive integrity | ZIP CRC/member verification passed |
| Provenance | Official SourceForge ZIP download SHA-256 matches the uploaded archive |
| Installer operating system | Windows |
| Executable safety | **Not independently certified malware-free**. A hash match authenticates the downloaded bytes against a published digest, not the software's safety or publisher signature. |

Official distribution: https://sourceforge.net/projects/usbraptor/files/  
Exact pinned version: https://sourceforge.net/projects/usbraptor/files/USBRaptor_01994_%28Cherry2%29_Installer.zip/download  
Vendor FAQ: https://sourceforge.net/p/usbraptor/wiki/FAQ/

The uploaded `Version Changes.txt` mentions notification and Telegram reporting/network capabilities. Keep third-party reporting, network unlock, automatic lock startup and remote commands **disabled** during the initial local test.

## What was integrated into NEO

| Repo path under `deploy/noogle-render/neo-key-security/` | Responsibility |
| --- | --- |
| `usb-raptor/package-lock.json` | Fixed source/version/ZIP size/SHA-256 manifest and explicit non-FIDO2 capability |
| `usb-raptor/stage-usb-raptor.sh` | Manual Linux/Codespaces ZIP verification and optional secure user-cache staging; never executes Windows code |
| `usb-raptor/Install-NeoUsbRaptor.ps1` | Windows-only SHA-256 guarded, interactive and explicitly authorized installation helper |
| `usb-raptor/.gitignore` | Prevent committing vendor ZIP/EXE, USB key files or private material |
| `usb-raptor-deployment.test.mjs` | Automated security tests for vendor package pin and no automatic unsafe behavior |

**No third-party executable is committed to the repository.** This avoids redistribution/licensing uncertainty, reduces malware exposure and protects key material.

## Using the existing Linux Codespace

The user reports their Codespace fell back to Alpine recovery because its Node 24 image failed. USB Raptor **cannot be installed as a working Windows service inside that Linux Codespace**. It can be staged for future authorized Windows use, whether Node is installed or not.

From the existing `feature/neo-key-gate2-prototype` checkout, only when the working tree is clean:

```sh
cd /workspaces/neo-system
git status --short
git pull --ff-only origin feature/neo-key-gate2-prototype
sh deploy/noogle-render/neo-key-security/usb-raptor/stage-usb-raptor.sh --help
```

If the uploaded ZIP has been copied to the Codespace, verify and stage it:

```sh
sh deploy/noogle-render/neo-key-security/usb-raptor/stage-usb-raptor.sh --verify "/path/to/USBRaptor_01994_(Cherry2)_Installer.zip"
sh deploy/noogle-render/neo-key-security/usb-raptor/stage-usb-raptor.sh --stage "/path/to/USBRaptor_01994_(Cherry2)_Installer.zip"
```

Alternatively, with an approved network-enabled Codespace that has `curl` and `sha256sum`, opt in to downloading the *exact* SourceForge archive:

```sh
sh deploy/noogle-render/neo-key-security/usb-raptor/stage-usb-raptor.sh --download
```

The script refuses any unexpected size/hash and keeps a verified ZIP in `$HOME/.cache/neo-key/usb-raptor/`. This private Linux cache can be ephemeral across Codespace rebuilds. **No `.exe` is run, no local USB is accessed, and nothing is automatically started.** Codespaces compute/storage usage should remain within an approved quota; no new Codespace is created by these scripts.

## Using the uploaded archive on an authorized Windows computer

**Only on your own Windows PC or with explicit computer-owner/admin permission; never bypass restrictions on a library/shared machine.**

1. Back up personal files on the flash drive and verify a separate functioning Windows password/PIN recovery method. Do not enable automatic lock until recovery succeeds.
2. Scan the ZIP/installer using your local Microsoft Defender or independently managed endpoint protection and review the results. The helper does not perform or attest a malware scan.
3. Copy the exact uploaded ZIP to an accessible local path; download the feature branch scripts. Inspect the script before execution.
4. Verify the ZIP without any installation:

```powershell
powershell -NoProfile -File .\deploy\noogle-render\neo-key-security\usb-raptor\Install-NeoUsbRaptor.ps1 -ArchivePath "C:\path\USBRaptor_01994_(Cherry2)_Installer.zip"
```

5. **Only after** authorization, recovery and malware review, explicitly launch the installer (confirmation prompt; no silent mode):

```powershell
powershell -NoProfile -File .\deploy\noogle-render\neo-key-security\usb-raptor\Install-NeoUsbRaptor.ps1 -ArchivePath "C:\path\USBRaptor_01994_(Cherry2)_Installer.zip" -Install -AuthorizedWindowsComputer -RecoveryUnlockMethodVerified -MalwareScanReviewed -AllowUnsignedVendorInstaller
```

The helper verifies the exact ZIP SHA-256 before extracting and launching. It rejects invalid executable signatures; if the vendor executable is unsigned, explicit `-AllowUnsignedVendorInstaller` is required. The flags are user attestations, **not a substitute for independent scanning**. It does not install itself as an auto-start service or create a flash-drive unlock file. Complete the vendor setup locally and manually, with automatic locking and remote reports disabled initially. Confirm both lock/unlock **and fallback login** on a device you can recover.

Do not change PowerShell execution policy if the machine blocks scripts. Use the computer-owner-approved installer procedure instead.

## Architectural guardrail

**USB Raptor:** protects a *local Windows session* via a removable file; removal may lock a workstation, and this should only supplement normal Windows account security. **Not FIDO2, not WebAuthn, not a portable passkey or NEO login authenticator.** A Logitech receiver remains a peripheral and does not participate.

**NEO Key:** authenticators must use a genuine FIDO2/CTAP2 device or explicitly approved platform authenticator for test ceremonies, a trusted backend, two independent human custodians and independent review before staging authorization. Virtual/software devices remain lab-only and must not be represented as certified hardware.

## Evidence / release checklist

- [x] User-supplied archive verified as a ZIP; source SHA-256 matches SourceForge.
- [x] Pinned package manifest and opt-in staging/install scripts committed to draft PR.
- [x] Vendor binaries/key material excluded from Git.
- [ ] Codespace cache actually staged; no remote terminal execution performed by this connector.
- [ ] Windows installer actually launched on authorized local computer.
- [ ] Defender/AV verdict, Windows fallback recovery and removable-drive lock/unlock behavior verified.
- [ ] Genuine FIDO2/Windows Hello enrollment on approved test account.
- [ ] Independent security review, human custody and staged RP approval.

**Final disposition:** Integration prepared for future authorized Windows deployment; no real installation, no active Windows service, no Codespaces Windows runtime, no FIDO2 key conversion, no production deployment, no spending, PR stays draft/unmerged.
