#!/usr/bin/env bash
# NEO-MULTICLOUD-009: operator-run, short-lived static response inside the
# existing, rootless NetBird container. Never opens a Codespaces/public port.
# Requires an operator-reviewed peer-specific NetBird access rule for TCP/18443.
# This does not prove an encrypted handshake or a successful remote request.
set -euo pipefail

CONTAINER="neo-cs-netbird-pilot"
IMAGE="netbirdio/netbird:rootless-latest"
TEST_PATH="/tmp/neo-mc009-www"
PORT=18443

say() { printf '%s\n' "$1"; }

if [[ "$#" -ne 1 || ( "$1" != "serve" && "$1" != "status" ) ]]; then
  say "Usage: bash multicloud-009-rootless-service.sh serve|status"
  exit 2
fi
ACTION="$1"
if [[ "${CODESPACES:-}" != "true" || "${CI:-}" == "true" || "${GITHUB_ACTIONS:-}" == "true" ]]; then
  say "HOLD_NOT_AN_APPROVED_INTERACTIVE_CODESPACE"
  exit 2
fi
if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
  say "HOLD_DOCKER_UNAVAILABLE"
  exit 2
fi
if ! docker container inspect "$CONTAINER" >/dev/null 2>&1; then
  say "HOLD_ROOTLESS_PEER_NOT_STARTED"
  exit 2
fi
# Read only image name and unprivileged user, never the env or setup key.
ACTUAL_IMAGE="$(docker inspect --format '{{.Config.Image}}' "$CONTAINER" 2>/dev/null)" || exit 2
ACTUAL_USER="$(docker inspect --format '{{.Config.User}}' "$CONTAINER" 2>/dev/null)" || exit 2
if [[ "$ACTUAL_IMAGE" != "$IMAGE" || -z "$ACTUAL_USER" ||
      "$ACTUAL_USER" == "root" || "$ACTUAL_USER" == "0" ]]; then
  say "HOLD_UNEXPECTED_CONTAINER_IDENTITY"
  exit 2
fi
# Reject any preexisting container that could expose the probe beyond the
# intended unprivileged Docker bridge namespace. Read only specific host config
# properties: never use unrestricted docker inspect (which includes setup keys).
NET_MODE="$(docker inspect --format '{{.HostConfig.NetworkMode}}' "$CONTAINER" 2>/dev/null)" || exit 2
PRIVILEGED="$(docker inspect --format '{{.HostConfig.Privileged}}' "$CONTAINER" 2>/dev/null)" || exit 2
PORT_BINDINGS="$(docker inspect --format '{{json .HostConfig.PortBindings}}' "$CONTAINER" 2>/dev/null)" || exit 2
ADDED_CAPS="$(docker inspect --format '{{json .HostConfig.CapAdd}}' "$CONTAINER" 2>/dev/null)" || exit 2
if [[ "$PRIVILEGED" != "false" ||
      ( "$NET_MODE" != "bridge" && "$NET_MODE" != "default" ) ||
      ( "$PORT_BINDINGS" != "null" && "$PORT_BINDINGS" != "{}" ) ||
      ( "$ADDED_CAPS" != "null" && "$ADDED_CAPS" != "[]" ) ]]; then
  say "HOLD_CONTAINER_EXPOSURE_OR_PRIVILEGE_POLICY"
  exit 2
fi

if ! docker exec "$CONTAINER" netbird status --check ready >/dev/null 2>&1; then
  say "HOLD_NETBIRD_PEER_DAEMON_NOT_READY"
  exit 2
fi

if [[ "$ACTION" == "serve" ]]; then
  if [[ ! -r /dev/tty || ! -w /dev/tty ]]; then
    say "HOLD_INTERACTIVE_TERMINAL_REQUIRED"
    exit 2
  fi
  say "Confirm a NetBird peer-to-peer rule only permits your authorized Android peer to TCP/18443."
  say "This is temporary static test data, not a general proxy or NEO production service."
  read -r -p "Type POLICY_REVIEWED only after checking the rule: " APPROVAL </dev/tty
  if [[ "$APPROVAL" != "POLICY_REVIEWED" ]]; then
    say "HOLD_ACCESS_POLICY_NOT_REVIEWED"
    exit 2
  fi
  if ! docker exec "$CONTAINER" sh -c 'busybox --list | grep -qx httpd'; then
    say "HOLD_BUSYBOX_HTTPD_NOT_AVAILABLE"
    exit 2
  fi
  # No user-controlled path, command, hostname, setup key or public bind.
  if ! docker exec "$CONTAINER" sh -ec '
    test ! -e /tmp/neo-mc009-www/neo-private-probe
    mkdir -p /tmp/neo-mc009-www
    printf "%s\n" "{\"gate\":\"NEO-MULTICLOUD-002\",\"response\":\"PRIVATE_APPLICATION_RESPONSE\",\"private_tunnel_verified\":false,\"gateway_production_verified\":false}" > /tmp/neo-mc009-www/neo-private-probe
    chmod 644 /tmp/neo-mc009-www/neo-private-probe
  ' >/dev/null 2>&1; then
    say "HOLD_EXISTING_TEST_RESPONSE_OR_CONTAINER_FILE_ERROR"
    exit 2
  fi
  # This listener is bound INSIDE the Docker container only. No -p/--publish
  # and no Codespaces port forwarding. The NetBird rootless image provides
  # userspace local forwarding, subject to the approved peer policy.
  if ! docker exec -d "$CONTAINER" sh -c \
    'exec timeout 120 busybox httpd -f -p 0.0.0.0:18443 -h /tmp/neo-mc009-www' \
      >/dev/null 2>&1; then
    say "HOLD_TEST_SERVER_COULD_NOT_START"
    exit 2
  fi
  sleep 1
fi
if docker exec "$CONTAINER" sh -c \
  'busybox wget -q -O - http://127.0.0.1:18443/neo-private-probe | grep -q PRIVATE_APPLICATION_RESPONSE' \
    >/dev/null 2>&1; then
  say "LOCAL_CONTAINER_TEST_RESPONSE_OK_ANDROID_REQUEST_AND_HANDSHAKE_NOT_VERIFIED"
  say "Test from Android NetBird using the operator-only private IP within the 120-second window."
  say "After the test, use the NEO-MULTICLOUD-008 bootstrap stop command for cleanup."
else
  say "HOLD_NO_LOCAL_TEST_SERVICE_RESPONSE"
  exit 2
fi
