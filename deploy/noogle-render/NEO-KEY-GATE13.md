# Project 144 — NEO Key Gate 13: Linux connection and physical USB triage

**Date:** 2026-11-24  
**PR:** [#1435](https://github.com/Shemsizedek/neo-system/pull/1435)  
**Decision:** WORKSTATION ACCESS PREPARED, PHYSICAL FIDO2 CERTIFICATION NOT COMPLETE  
**Constraints:** draft/unmerged; no paid Codespaces provision, deployment, production changes, key enrollment, secrets, DNS or Bitcoin writes.

## What was verified

- Authorized Desktop Commander device `penguin` is **offline**. SentinelX has **zero connected hosts** and the enrolled `crown-node-001` is **offline**. No authorized remote shell can inspect the USB attached to the user's computer.
- GitHub plugin's current tool set does **not** offer create/list/control Codespaces actions. No Codespace was created or started by this gate. A browser-only user launch is possible using existing GitHub Codespaces features.
- GitHub Codespaces offers a remote Linux environment in the browser, VS Code or SSH. Its container does **not** automatically receive locally plugged-in USB devices. GitHub's TLS port forwarding lets a *local browser* access a development web service; WebAuthn can ask a **local** browser for a user-held authenticator when a later approved HTTPS RP exists. That does not expose USB devices to the remote terminal and does not remove FIDO2 certification requirements.
- Repository `server/neo-router/ollama-provider.mjs` provides a model adapter. It is not a Linux terminal, device driver or CTAP2 authenticator. Tor is a transport, not a physical-key emulator.
- The attached USB's product/USB class is **unknown**. A flash drive, Logitech USB receiver or ordinary storage device cannot be converted into a hardware-backed FIDO2 authenticator by copying a file or installing USB Raptor. USB Raptor/Predator are workstation lock approaches, not phishing-resistant WebAuthn security keys.

## Prepared, but not launched: GitHub Codespaces Linux lab

Opt-in configuration: `.devcontainer/neo-key-lab/devcontainer.json`.

- GitHub repository: `https://github.com/Shemsizedek/neo-system`
- Working branch: `feature/neo-key-gate2-prototype` (draft PR #1435)
- In GitHub: **Code → Codespaces → Create codespace on branch**; open advanced options if necessary and select **NEO Key Gate 13 — Linux Development Only** (or configuration `.devcontainer/neo-key-lab/devcontainer.json`). Verify billed owner, free compute/storage quota, and idle timeout **before** starting. Do not create if it would incur spending.
- In the browser terminal (Linux), after checkout:
  ```sh
  uname -s
  node --version
  npm ci --prefix deploy/noogle-render/neo-key-security --ignore-scripts --no-audit --no-fund
  node --test deploy/noogle-render/neo-key-security/usb-local-probe.test.mjs
  ```
- **The Codespaces Linux output cannot identify your physical USB.** Running `usb-local-probe.sh` in a Codespace only inspects its cloud container and will report that it does NOT certify local FIDO2.
- Keep all forwarded ports **private**. This profile forwards none, performs no post-create install/script, starts no Ollama/Tor daemon and deploys nothing. Avoid entering personal secrets, YubiKey PINs, passphrase or backup material in a public repository or Codespaces terminal.
- Codespaces compute/storage is metered; personal GitHub accounts may have included allowance, but the user's remaining quota and billing owner were **not inspected or approved**. No Codespace was created by ChatGPT.

## On the actual computer with the USB attached

If an authorized **local Linux terminal** exists, use this non-destructive script at the repository root:
```sh
sh deploy/noogle-render/neo-key-security/usb-local-probe.sh
```
It does not use sudo, write to the USB, enroll any credential, initialize a FIDO2 key, change PIN, or print device identifiers. The `fido2-token -L` list is queried **only if libfido2's tool is already present**. Candidate detection is not certification.

Manual local Linux commands, if permitted by the computer owner:
```sh
uname -a
command -v lsusb
command -v fido2-token
fido2-token -L
```
Do not run `fido2-token` enrollment, formatting, reset or PIN commands. Don't paste serial numbers or device identifier output into public GitHub.

If terminal access is prohibited (for example, a locked-down public/library PC), stop; do not bypass workstation policy. Native browser WebAuthn may still support a genuine USB security key on supported systems without Linux or administrator access. You can use an account's normal **Security → Passkeys/Security keys** menu when eligible and authorized. This is **provider-controlled enrollment**, not NEO Key's deployment.

### Classification outcomes

| Actual device | What can safely be done | What cannot be claimed |
| --- | --- | --- |
| Genuine CTAP2/FIDO2 USB key | Locally inspect candidate capability; later user-controlled WebAuthn security-key enrollment through supported browser/site; separately prepare backup key | That ChatGPT/Daybreak/NEO have already been enrolled |
| Ordinary USB flash drive | Store ordinary files or use a separately reviewed local PC lock scheme on an owned/authorized workstation | WebAuthn, secure-element key storage, phishing-resistant account login |
| Logitech/other peripheral dongle | Use for intended peripheral purpose | Automatically an authenticator |
| Unknown USB device | Identify visible product class safely with owner's permissions | Install firmware, flash device, reset PIN, claim hardware-backed authentication |

## No-spend hardware + review next gate

1. Attach the device to a **personally owned or expressly authorized** local Windows/Linux computer.
2. Confirm device class and FIDO2 candidate status with local read-only tools or browser native security-key enrollment flow; preserve privacy of identifiers.
3. Check if a genuine FIDO2 authenticator is already available before considering buying hardware. A second independently enrolled backup is recommended.
4. Get independent security review of PR #1435, validate the custody registry and secure issuer, then set up an approved isolated HTTPS staging RP.
5. Complete primary/backup real browser ceremonies, recovery, rollback, logging, rate limiting and independent go/no-go approval.
6. Preserve production, keep PR draft/unmerged, no paid services, no blockchain audit writes.

**Release decision: NO-GO.** Cloud Linux development is now configured in source but not provisioned; attached device access and actual FIDO2 certification remain unverified.
