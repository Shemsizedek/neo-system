# NEO Connect — native Android terminal prototype

NEO Connect is **our own application**, not an external Termux dependency.

## Scope of first source drop
- Android-native Kotlin app and simple local command/output interface.
- Executes available `/system/bin/sh` commands **only under the app's unprivileged Android UID**.
- No root, unrestricted filesystem access, PTY, package manager, SSH, network listener, file sync, WebAuthn key provider or remote control yet.
- Not a replacement for a full terminal emulator until PTY-backed sessions, terminal escape processing, and a packaged userland are integrated.

## Build
Use JDK 17 and an Android SDK with API 35, then run `gradle :app:assembleDebug` from this directory. A Gradle wrapper and reproducible CI build are required before distributing an APK. **Build and device testing have not been verified.**

## Next engineering gates
1. PTY-backed interactive shell with terminal emulation; keep sandbox isolation.
2. Bundle a maintained Android-compatible command-line userland without requiring Termux.
3. SSH client/server adapter with owner-controlled approvals, trusted host keys, no default exposed listener.
4. ChromeOS Linux companion and FIDO2/WebAuthn integration separately; an SSH key is not itself a Daybreak FIDO2 security key.

Security boundary: no NEO Pass or cloud database needed for first-run local terminal.
