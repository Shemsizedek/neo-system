#!/usr/bin/env bash
# Project 144: explicitly gated local ARTEX lab. NEVER points at production.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE="${ROOT}/deploy/neo-artex-lab/compose.yaml"
STATE="${NEO_ARTEX_LAB_STATE_DIR:-${HOME}/.local/share/neo-artex-lab}"
SOURCE="${STATE}/source"
ENVFILE="${STATE}/lab.env"
REPO="https://github.com/BaaRai/ARTEX.git"
SHA="22ae88afabf66e47e73644a0528d8b427c4c80b8"

die() { printf 'NEO ARTEX: %s\n' "$*" >&2; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || die "missing prerequisite: $1"; }
compose() { docker compose --project-name neo-artex-lab --env-file "$ENVFILE" -f "$COMPOSE" "$@"; }
secure_state() {
  [ "$STATE" != / ] || die 'refusing root as state directory'
  mkdir -p "$STATE"
  chmod 700 "$STATE"
}
verify_source() {
  [ -d "$SOURCE/.git" ] || die 'missing ARTEX source checkout'
  [ "$(git -C "$SOURCE" remote get-url origin)" = "$REPO" ] || die 'unexpected upstream Git remote'
  [ "$(git -C "$SOURCE" rev-parse HEAD)" = "$SHA" ] || die 'source commit does not match pinned v0.7.0 revision'
  [ -z "$(git -C "$SOURCE" status --porcelain)" ] || die 'uncommitted or untracked source files found'
}
prepare() {
  need git
  need openssl
  secure_state
  if [ ! -e "$SOURCE" ]; then
    git clone --depth 1 --branch v0.7.0 --no-single-branch "$REPO" "$SOURCE"
    git -C "$SOURCE" checkout --detach "$SHA"
  fi
  verify_source
  if [ ! -e "$ENVFILE" ]; then
    umask 077
    {
      printf 'ARTEX_LAB_SOURCE_DIR=%s\n' "$SOURCE"
      printf 'ARTEX_LAB_DB_PASSWORD=%s\n' "$(openssl rand -hex 24)"
    } > "$ENVFILE"
  fi
  chmod 600 "$ENVFILE"
  printf 'Pinned ARTEX source and lab-only credentials prepared. No containers started.\n'
}
case "${1:-help}" in
  prepare)
    prepare ;;
  start)
    [ "${NEO_ARTEX_LAB_ENABLE:-}" = "YES" ] || die 'start requires NEO_ARTEX_LAB_ENABLE=YES'
    need docker
    prepare
    compose config -q
    compose up --build -d
    printf 'Lab only: check localhost:8787. No external model configured; no scans started.\n' ;;
  status)
    need docker
    [ -f "$ENVFILE" ] || die 'run prepare first'
    compose ps ;;
  stop)
    need docker
    [ -f "$ENVFILE" ] || die 'run prepare first'
    compose down ;;
  check)
    need docker
    [ -f "$ENVFILE" ] || die 'run prepare first'
    verify_source
    compose config -q
    printf 'Compose syntax valid and source commit verified; runtime egress not yet verified.\n' ;;
  *)
    cat <<'HELP'
Usage: scripts/neo-artex-lab.sh prepare|start|status|stop|check
The lab uses a source-built ARTEX image, loopback-only console, internal-only
Docker network and a synthetic test target. No external LLM credentials.
To start after authorization: NEO_ARTEX_LAB_ENABLE=YES scripts/neo-artex-lab.sh start
Always verify network-deny behavior on the chosen Docker host before scanning.
HELP
    ;;
esac
