# NTEL-023 — First Device Certification and Enrollment Checklist

## Build certification
The previous Noogle Connect Android APK workflow run 40141197458 succeeded and produced artifact `noogle-connect-mobile-debug-apk`, but it predates the NeoTele DiagnosticsActivity integration. The new NTEL-023 workflow tests server/neotele/*.test.mjs and builds apps/noogle-connect-mobile, captures SHA-256 and uploads the resulting debug APK. Only a **successful new build** can certify the current code. Do not represent a CI-created debug APK as signed production software.

## Consent-based phone test
1. Download APK only from the verified workflow for the exact reviewed commit; check build conclusion and SHA-256.
2. Have the device owner approve installation of the debug build; retain the ability to uninstall and revoke access.
3. Open Noogle Connect → NeoTele eSIM / Network Diagnostics. Explicitly authorize the local check.
4. Confirm eSIM feature value, active network transport and validated network state are sensible for the physical phone. Do not collect IMEI, EID, ICCID or QR activation codes.
5. Open the existing NEO Pass availability check and record that HTTP reachability is **not** member or device enrollment.
6. Do not claim actual device enrollment until a trusted NEOpass session, Guardian cryptographic challenge, durable registry and device-side approval are integrated and verified.
7. The existing local sandbox terminal is distinct from the NeoTele diagnostic screen and must not accept remote commands.

## Boundaries
- No carrier-issued eSIM profile is bundled, created or downloaded.
- No NeoMask/Counterparty asset is issued or signed.
- No production device control or background agent enrollment.
- First-phone diagnostics are local and opt-in.

## Next gate
NTEL-024: review CI and artifact hash, instrument opt-in on-device test results (without identifiers), validate secure enrollment implementation, then decide whether to distribute the debug APK for supervised pilot use.
