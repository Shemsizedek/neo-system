#!/usr/bin/env bash
# NEO-MULTICLOUD-008: operator-only short-lived Codespaces NetBird test peer.
# Usage: bash multicloud-008-rootless-codespace.sh start|status|stop
# Never run this from CI, or store credentials in GitHub or an AI chat.
# A one-off ephemeral setup key is typed privately on the Codespaces terminal.
# Docker environment metadata remains visible to Docker admins until stopped.
set -euo pipefail

CONTAINER="neo-cs-netbird-pilot"
VOLUME="neo_cs_netbird_pilot_state"
IMAGE="netbirdio/netbird:rootless-latest"
ACTION="${1:-}"

message() { printf '%s\n' "$1"; }
container_exists() { docker container inspect "$CONTAINER" >/dev/null 2>&1; }
volume_exists() { docker volume inspect "$VOLUME" >/dev/null 2>&1; }

if [[ "$ACTION" != "start" && "$ACTION" != "status" && "$ACTION" != "stop" ]]; then
  message "Usage: bash multicloud-008-rootless-codespace.sh start|status|stop"
  exit 2
fi
if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
  message "HOLD_DOCKER_DAEMON_UNAVAILABLE"
  exit 2
fi
if [[ "${CI:-}" == "true" || "${GITHUB_ACTIONS:-}" == "true" ]]; then
  message "HOLD_CI_RUNNER_NOT_APPROVED_FOR_NETBIRD_ENROLLMENT"
  exit 2
fi
if [[ "${CODESPACES:-}" != "true" ]]; then
  message "HOLD_NOT_VERIFIED_AS_CODESPACE"
  exit 2
fi

case "$ACTION" in
  start)
    if container_exists || volume_exists; then
      message "HOLD_EXISTING_PILOT_CONTAINER_OR_STATE_REQUIRES_REVIEW"
      exit 2
    fi
    if [[ ! -r /dev/tty || ! -w /dev/tty ]]; then
      message "HOLD_OPERATOR_PRIVATE_TERMINAL_REQUIRED"
      exit 2
    fi
    message "PRECHECK_OK_ONE_OFF_EPHEMERAL_KEY_REQUIRED"
    message "Enter the key only in this terminal, never an AI chat or script argument."
    NB_SETUP_KEY=''
    trap 'unset NB_SETUP_KEY || true' EXIT
    read -r -s -p "One-off NetBird key (hidden input): " NB_SETUP_KEY </dev/tty
    printf '\n' >/dev/tty
    if [[ -z "$NB_SETUP_KEY" || "${#NB_SETUP_KEY}" -gt 512 ]]; then
      message "HOLD_INVALID_LOCAL_CREDENTIAL_INPUT"
      exit 2
    fi
    # Docker -e NAME reads value from local environment, not the CLI args;
    # Docker admins can still inspect the running container environment.
    export NB_SETUP_KEY
    docker volume create "$VOLUME" >/dev/null
    if ! docker run --rm --detach \
      --name "$CONTAINER" --hostname "neo-codespace-test" \
      --volume "$VOLUME:/var/lib/netbird" \
      --env NB_SETUP_KEY \
      "$IMAGE" >/dev/null 2>&1; then
      docker volume rm "$VOLUME" >/dev/null 2>&1 || true
      message "HOLD_ROOTLESS_CONTAINER_COULD_NOT_START"
      exit 2
    fi
    unset NB_SETUP_KEY
    trap - EXIT
    message "PILOT_CONTAINER_STARTED_PEER_ENROLLMENT_NOT_YET_CONFIRMED"
    message "Run: bash multicloud-008-rootless-codespace.sh status"
    ;;
  status)
    if ! container_exists; then
      message "HOLD_NO_PILOT_CONTAINER"
      exit 2
    fi
    if docker exec "$CONTAINER" netbird status --check ready >/dev/null 2>&1; then
      message "PILOT_NETBIRD_DAEMON_READY_CHECK_ANDROID_PEERS"
    else
      message "HOLD_NETBIRD_DAEMON_NOT_READY_OR_NOT_LOGGED_IN"
      exit 2
    fi
    ;;
  stop)
    if container_exists; then docker stop "$CONTAINER" >/dev/null; fi
    if volume_exists; then
      if ! docker volume rm "$VOLUME" >/dev/null 2>&1; then
        message "HOLD_PILOT_VOLUME_STILL_IN_USE"
        exit 2
      fi
    fi
    message "PILOT_CONTAINER_AND_STATE_CLEANED_UP"
    message "Confirm ephemeral peer removal in the NetBird dashboard."
    ;;
esac
