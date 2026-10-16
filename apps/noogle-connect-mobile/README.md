# Noogle Connect Mobile — Android development build

Android APK build: GitHub Actions **Noogle Connect Android APK** produces `noogle-connect-mobile-debug-apk` after compiling the app. Download the build artifact from the workflow run; it is a **development/debug build** and is not yet an approved signed production release.

Current features:
- A native Android interface with an **Open Noogle Connect** button that launches the verified HTTPS domain in the device's default browser.
- A **Check this device** button displays Android version and device information.
- A **local-only Android app sandbox terminal** using `/system/bin/sh` and direct, on-device command entry. This does not install Termux packages or give Linux desktop capabilities, root access or remote control.
- No background agent, credential storage, remote command endpoints, NEO Pass assertion exchange or ChatGPT remote commands. App does not accept remote shell requests.

Important: this is a new companion source package, **not yet a tested downloadable APK** until the Android workflow succeeds. Do not distribute as a trusted production app without signing, app-integrity, threat-model and review.

NEO System terminal access architecture:
1. NEO Pass/OIDC login with verified issuer and passkeys.
2. Explicit device enrollment into durable account-scoped registry.
3. Outbound, mutually authenticated companion-to-control-plane connection.
4. Per-session interactive user authorization, bounded command execution and audit records; revocation on device.
5. ChatGPT access only through a connected tool/agent with explicit per-operation approval and clearly disclosed terminal permissions. Simply hosting a website does not grant ChatGPT access to anyone's device.
6. ChromeOS, Windows, macOS and Linux require their own agent or supported local integration. A browser cannot directly access OS terminals without installation/permissions.

Render free PostgreSQL instance `noogle-connect-dev` expires November 15, 2026; it is not durable production credential storage. Do not use it for unrecoverable device enrollment without migration and backup.
