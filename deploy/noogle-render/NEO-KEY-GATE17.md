# Project 144 — NEO Key Gate 17: Recover existing Codespace Linux runtime

**Date:** 2026-11-24  
**PR:** [#1435](https://github.com/Shemsizedek/neo-system/pull/1435) — draft, unmerged  
**Release:** NO-GO for staging and production. No secrets, enrollment, Tor changes, spending, merge or production modifications.

## Evidence reported from the live Codespace

The authorized Codespaces investigation reported:
- Linux Alpine **recovery** container, host `codespaces-8130df`, user `vscode`.
- The configured Node 24 image failed and the Codespace fell back to an Alpine recovery image. The **underlying failure reason has not been established from the quoted creation.log**; image availability vs policy/network/tag failure remains unknown.
- Repository `feature/neo-key-gate2-prototype` was clean and **three commits behind the tracked remote at the time of inspection**. That count can change as the PR advances.
- Node.js and npm **were absent** in the recovery container. Local WebAuthn Node tests cannot run there until the runtime is repaired, although the repository's separate GitHub Actions security suite can test the same code.
- The staging adapter was unmounted, and the release rehearsal was NO-GO.
- USB probe returned `REMOTE_OR_CONTAINER=YES_LOCAL_USB_NOT_PASSTHROUGH_VERIFIED` and `FIDO2_CERTIFIED=NO`. The Codespace has **no demonstrated direct access** to the local flash drive or Logitech receiver.

The results above were **provided from a Codespaces session**, not independently reproduced through this GitHub connector. Do not interpret container/host identity as evidence of hardware FIDO2.

## Gate 17 branch change

- `neo-key-security/codespace-recovery-preflight.sh`: pure read-only Linux/Alpine, Node/npm, Git state/upstream-lag and FIDO2-noncertification diagnostic. No network access, package install, Git pull, hardware/secret reads or deployment.
- `neo-key-security/codespace-recovery-preflight.test.mjs`: checks that the script never invokes common mutating commands and does not print secrets.
- CI unit test list updated; does not run any recovery action on a live Codespace.

## Recover the existing Codespace (manually, only on the authorized development container)

### 1. Synchronize the clean feature branch

Do not discard uncommitted work or use force/reset. In the **existing** Codespaces terminal:

```sh
cd /workspaces/neo-system
git status --short
git branch --show-current
git pull --ff-only origin feature/neo-key-gate2-prototype
sh deploy/noogle-render/neo-key-security/codespace-recovery-preflight.sh
```

Proceed with pull **only if** the branch remains `feature/neo-key-gate2-prototype` and the working tree remains clean. `--ff-only` refuses diverged branches; do not bypass a refusal. This acts only on the Codespace checkout; it is **not a PR merge into main**. The full latest commit and count must be reverified rather than assuming the earlier three-behind observation is still accurate.

### 2. Determine the recovery-container package options

```sh
cat /etc/alpine-release
id -u
command -v apk
command -v sudo || true
command -v node || true
command -v npm || true
```

**Preferred:** if the existing Codespace explicitly permits system package installation, use the official Alpine package manager under your authorized container administrator:

```sh
# Only if you have container admin permission and the network/repositories work:
sudo apk add --no-cache nodejs npm
node --version
npm --version
```

If you are already root, omit `sudo`. If `sudo` is unavailable or permission is denied, **stop**: do not bypass container policy. If Alpine's Node version is lower than the project CI's Node **24**, do not claim local test parity. A temporary fallback with another Node major is not official Gate 17 verification.

**Alternative:** in the *existing* Codespace editor, inspect its `creation.log` for the root cause of the failed Node 24 image. If the registry/tag problem is resolved and your included GitHub Codespaces quota permits, select **Codespaces: Rebuild Container** for the existing Codespace using `.devcontainer/neo-key-lab/devcontainer.json`. Do not create a paid second Codespace or trigger an unreviewed rebuild. No automatic rebuild was initiated by this PR.

### 3. Run only disposable tests, after Node 24 is available

```sh
cd /workspaces/neo-system
npm ci --prefix deploy/noogle-render/neo-key-security --ignore-scripts --no-audit --no-fund
node --test deploy/noogle-render/neo-key-security/codespace-recovery-preflight.test.mjs
node --test deploy/noogle-render/neo-key-security/staging-release-rehearsal.test.mjs
```

These perform test-only work in the Codespace; they do not mount the staging adapter, issue real NEO Pass tokens, enroll passkeys or deploy a production site. Real PostgreSQL integration tests are already covered by GitHub Actions against its own ephemeral PostgreSQL database; do not connect a test to any live NEO database.

### 4. Local physical USB inspection is separate

Codespaces Linux has no direct evidence of the user computer's USB device class. Two *reported* devices are an **ordinary USB flash drive** and a **Logitech receiver**. Neither can be converted by software/file copying into genuine FIDO2/CTAP2 hardware. The user's local browser may use Windows Hello or an authorized personal phone platform passkey for **provider-supported** enrollment or future isolated test accounts. Do not enroll permanent passkeys into a shared/library computer.

For local Windows read-only device inventory, the existing `usb-windows-local-probe.ps1` is available, but must be run **locally** with workstation-owner permission, not in Codespaces.

## Gate 17 approval boundaries

- No Codespace rebuild, `apk` installation, Git checkout/pull, local hardware scan or browser authentication was executed by this GitHub API change.
- Independent security review, human two-person signer custody, real FIDO2 primary/backup device proof, dedicated HTTPS staging RP, and owner staging approval remain **unverified**.
- Do not assert go-live merely because the Codespace is repaired, CI passes or Windows Hello works.

**Release decision: NO-GO.** Next verifiable gate is a fixed Node 24 Codespace runtime plus authorized local browser/platform-authenticator identification; then independently reviewed isolated WebAuthn ceremony.
