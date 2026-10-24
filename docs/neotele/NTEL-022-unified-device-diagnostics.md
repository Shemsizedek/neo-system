# NTEL-022 — Unified Noogle Connect NeoTele Diagnostics
- Verified the previous Noogle Connect APK workflow and main CI finished successfully at commit e72a231cc55bd7fb309fa6877d82770b239a86f8.
- Added an unexported NeoTeleDiagnosticsActivity to apps/noogle-connect-mobile, including explicit per-check local consent.
- Uses EuiccManager.isEnabled() and ConnectivityManager network capabilities. No IMEI, EID, ICCID, IMSI, phone number, precise location, payment data or biometric data is collected or sent to a server by this activity.
- Home screen now opens the NeoTele diagnostics screen.
- Existing local-only shell functionality in MainActivity remains unchanged; it must undergo separate security review before production distribution. No remote shell access was added.
- Noogle device enrollment, signed device commands, BIP-322 wallet verification, Hage runtime, telecom provider integration and live eSIM provisioning remain unconnected.
- New Android APK must be compiled, artifact hash verified, debug install approved by user and physical-device smoke tested before release. The previous passing APK is not evidence that the newly added activity compiles.
- Run `node --test server/neotele/*.test.mjs` for backend contracts and Android Gradle `assembleDebug` for the companion.
Next NTEL-023: verify APK workflow artifacts, enrollment security, and user-consented first-device testing; keep carrier provisioning disabled.
