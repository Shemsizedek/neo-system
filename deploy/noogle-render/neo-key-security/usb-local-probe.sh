#!/bin/sh
# NEO Key Gate 13: LOCAL Linux read-only FIDO2 inventory.
# Do not run in Codespaces to inspect a key plugged into your own computer.
# No sudo, driver install, token init, PIN changes, USB writes or key enrollment.
set -eu
printf 'NEO_KEY_USB_PROBE=read_only\n'
if [ "$(uname -s 2>/dev/null || echo unknown)" != Linux ]; then
  printf 'PLATFORM=not_linux\nFIDO2_CERTIFIED=NO\n'
  exit 0
fi
printf 'PLATFORM=linux\n'
if [ -n "${CODESPACES:-}" ] || [ -e /.dockerenv ]; then
  printf 'REMOTE_OR_CONTAINER=YES_LOCAL_USB_NOT_PASSTHROUGH_VERIFIED\n'
fi
if command -v fido2-token >/dev/null 2>&1; then
  # Never print a token's transport path, serial number or metadata.
  candidates="$(fido2-token -L 2>/dev/null || true)"
  if [ -n "$candidates" ]; then
    printf 'FIDO2_TOOL_CANDIDATES=FOUND_REQUIRES_LOCAL_BROWSER_TEST\n'
  else
    printf 'FIDO2_TOOL_CANDIDATES=NONE_DETECTED_OR_NO_PERMISSION\n'
  fi
else
  printf 'FIDO2_TOOL_CANDIDATES=UNKNOWN_TOOL_NOT_INSTALLED\n'
fi
if command -v lsusb >/dev/null 2>&1; then
  printf 'USB_ENUMERATION_TOOL=AVAILABLE\n'
else
  printf 'USB_ENUMERATION_TOOL=UNAVAILABLE\n'
fi
printf 'FIDO2_CERTIFIED=NO\n'
printf 'NEXT=Identify_local_device_type_then_test_WebAuthn_on_isolated_HTTPS_RP\n'
