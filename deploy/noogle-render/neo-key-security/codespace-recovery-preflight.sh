#!/bin/sh
# Gate 17: no-write inventory for an existing NEO Key Codespace.
# It does not install packages, synchronize the repository, read secrets, launch
# any daemon, inspect USB hardware, rebuild or deploy anything.
set -eu
printf 'NEO_KEY_CODESPACE_PREFLIGHT=READ_ONLY\n'
if [ "$(uname -s 2>/dev/null || true)" = "Linux" ]; then
  printf 'PLATFORM=LINUX\n'
else
  printf 'PLATFORM=OTHER\n'
fi
if [ -f /etc/alpine-release ]; then
  printf 'DISTRO=ALPINE\n'
else
  printf 'DISTRO=NON_ALPINE_OR_UNKNOWN\n'
fi
if [ -n "${CODESPACES:-}" ] || [ -e /.dockerenv ]; then
  printf 'ENVIRONMENT=CLOUD_OR_CONTAINER\n'
else
  printf 'ENVIRONMENT=LOCAL_OR_UNKNOWN\n'
fi
if command -v node >/dev/null 2>&1; then
  printf 'NODE=AVAILABLE\n'
  node --version
else
  printf 'NODE=MISSING\n'
fi
if command -v npm >/dev/null 2>&1; then
  printf 'NPM=AVAILABLE\n'
  npm --version
else
  printf 'NPM=MISSING\n'
fi
if command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  printf 'GIT_REPO=YES\n'
  branch="$(git branch --show-current 2>/dev/null || true)"
  if [ "$branch" = "feature/neo-key-gate2-prototype" ]; then
    printf 'GIT_BRANCH=EXPECTED_NEO_KEY\n'
  else
    printf 'GIT_BRANCH=UNEXPECTED\n'
  fi
  if [ -z "$(git status --porcelain 2>/dev/null)" ]; then
    printf 'GIT_WORKTREE=CLEAN\n'
  else
    printf 'GIT_WORKTREE=DIRTY_DO_NOT_AUTO_SYNC\n'
  fi
  behind="$(git rev-list --count 'HEAD..@{upstream}' 2>/dev/null || true)"
  case "$behind" in
    ''|*[!0-9]*) printf 'UPSTREAM_BEHIND=UNKNOWN\n' ;;
    *) printf 'UPSTREAM_BEHIND=%s\n' "$behind" ;;
  esac
  printf 'UPSTREAM_AHEAD_NOT_CHECKED=YES\n'
else
  printf 'GIT_REPO=UNKNOWN\n'
fi
printf 'USB_LOCAL_PASSTHROUGH=NOT_VERIFIED\n'
printf 'FIDO2_CERTIFIED=NO\n'
printf 'PRODUCTION_MODIFIED=NO\n'
