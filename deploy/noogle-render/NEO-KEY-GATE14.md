# Project 144 — NEO Key Gate 14: live Codespaces connection and local USB classification

**Date:** 2026-11-24 · **PR:** #1435 · **Release:** NO-GO / DRAFT / UNMERGED  
**User-provided facts:** a Codespace has been launched, and a conventional USB flash drive plus a Logitech receiver are connected to their current computer. Do **not** describe either as a FIDO2 authenticator.

## Verified agent connectivity

- GitHub repository and PR are accessible through the connected GitHub application. PR #1435 is still draft/unmerged; Gate 13 branch head was `966a165fb2857b27ac76b5f52789dc6cb1f42d06` before Gate 14 edits.
- Codespaces: the user reports a running Codespace. This ChatGPT session's browser-tab tool returned **"Browser access requires the originating browser context. Open ChatGPT in the browser with the connected extension and try again."** The connected GitHub app available here has no Codespaces list or terminal-control operation. Thus **no Codespace terminal access has been established or used**, and no Codespace's command output has been inspected.
- Local physical USB: Desktop Commander `penguin` offline; SentinelX `crown-node-001` offline with no online hosts. No remote command to the current Windows computer is possible until an authorized Desktop Commander/SentinelX device connects. This does not imply the user's plugged-in devices are absent.
- A Codespace is a Linux cloud container, which does not automatically receive hardware devices plugged into the user's local computer. The local OS must identify local USB equipment. Forwarding a web port is not USB device passthrough.

## Gate 14 deliverables

1. `neo-key-security/usb-windows-local-probe.ps1` — optional read-only Windows local inventory. Queries only existing CIM device information and emits coarse device-class signals, not serial numbers, PnP identifiers, PINs or device secrets. No format, mount change, firmware flash, driver install, UAC elevation or FIDO2 enrollment.
2. Updated `usb-local-probe.test.mjs` to check that the PowerShell probe does not call common device-mutating commands and explicitly reports `FIDO2_HARDWARE_VERIFIED=NO`.
3. Existing `.devcontainer/neo-key-lab/devcontainer.json` and `usb-local-probe.sh` are available for Linux development and *local Linux* respectively.

## Safest next connection action

**For agent access to the Codespace UI:** open this ChatGPT conversation in the browser where the connected ChatGPT browser extension is authorized, with the Codespaces editor open. Browser tab access then needs to be tested again. If browser connection is not available, use **ChatGPT Work mode** for browser navigation; this is a separate user-visible mode, not an established connection in this chat. The GitHub connector can still edit/test repository files without accessing the live Codespace.

**In the existing Codespaces Linux terminal (user-operated):**
```sh
pwd
uname -s
git branch --show-current
git rev-parse --short HEAD
```
Expected platform: Linux; branch should be `feature/neo-key-gate2-prototype` (if not, do not change branches without reviewing uncommitted work). No command above enumerates local USB hardware. Never paste GitHub tokens, cookies, environment variables or credentials into chat.

**On the Windows machine PHYSICALLY HOLDING the USB devices (not Codespaces), only if locally authorized to use PowerShell and the repo files are available:**
```powershell
powershell -NoProfile -File .\deploy\noogle-render\neo-key-security\usb-windows-local-probe.ps1
```
If the computer disallows local terminal or scripts, **do not change execution policies or bypass device restrictions**. Follow the owner's permitted setup, or run the probe on a personally owned Windows/Linux machine. The script must be downloaded/checked out from the trusted PR branch before running. Its output is only a coarse inventory, not proof of WebAuthn/CTAP2 capability.

**For a local Linux machine with the devices connected:**
```sh
sh deploy/noogle-render/neo-key-security/usb-local-probe.sh
```

## Physical hardware decision

| Device available | Appropriate capability | NEO PassKey account authentication |
|---|---|---|
| Ordinary USB flash drive | Removable data storage; optional encrypted backup, or a separately reviewed local-lock tool on an authorized personal device | Cannot become a genuine FIDO2 security key through file copies/USB Raptor |
| Logitech USB receiver | Logitech keyboard/mouse wireless receiver, possibly Bolt/Unifying | Does not function as WebAuthn security-key hardware |
| Windows Hello on personal computer | FIDO2 platform passkeys on supported services, protected by local PIN/biometric | Possible **provider-supported account enrollment**, not a physical USB flash-drive conversion |
| Compatible Android/iPhone platform passkey | Potential cross-device passkey authentication on compatible sites | Possible provider-supported enrollment, independent of current USB devices |
| Genuine FIDO2 USB/NFC hardware key | CTAP2/WebAuthn physical authenticator | Candidate for NEO Key primary or backup enrollment, after real browser and authorization checks |

Avoid enrolling lasting personal passkeys in a public library or shared computer. Do not store secrets or authenticate NEO production through a shared browser without organizational authorization.

## Go/no-go

**Development connectivity:** GitHub connected; Codespace reported launched by user but actual terminal not reachable by this chat.  
**Local USB classification:** User-reported flash drive and receiver; no live local device scan performed.  
**FIDO2 certification:** NO. No genuine key proven accessible.  
**Independent security review:** No submitted sign-off for PR #1435.  
**Staging/prod release:** NO-GO, no spending, no merge, no service activation.

## Next operational dependency

1. Re-establish an authorized connection to the current computer or browser/Work session; read-only inspect live Codespace and local USB classifications.
2. If no FIDO2 USB key is available, use a **personally owned** phone or Windows Hello platform passkey for isolated, provider-supported staging testing—not as a substitute for independent external hardware certification.
3. Only after independent review, tested identity issuer, approved two-person custody, dedicated RP and operational controls can NEO Key be considered for staging activation.
