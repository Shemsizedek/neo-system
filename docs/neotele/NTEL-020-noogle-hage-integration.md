# NTEL-020 — Hage and Noogle Connect mobile reconciliation

New server module binds a limited Hage/English command lexicon to three read-only NeoTele capabilities and requires trusted NEOpass plus Guardian proof before storing a device enrollment in PENDING_DEVICE_CONFIRMATION. Nuwaubian is reserved for linguistically reviewed vocabulary; no invented translations are shipped.

Repository check: the NeoTele feature branch does not currently contain apps/noogle-connect-mobile/README.md, although it exists on main. The next integration requires reconciling branch changes with main in a reviewable PR rather than blindly copying a competing Android agent. Current additions do not establish agent communications or device control.

Android NTEL-018 screen exists on branch, but an APK build run and actual phone installation are not confirmed. Need to locate the Gradle wrapper/workflow, reconcile current main Noogle Connect source, run Android build, inspect the artifact, and obtain device-owner approval before any installation. Avoid creating arbitrary shell command pathways.

Test: node --test server/neotele/*.test.mjs
Production eSIM activation, remote shell access, token issuance and telephone subscriber provisioning remain disabled.
