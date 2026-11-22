#!/usr/bin/env bash
# NEO-ARTEX-004: read-only smoke checks against our disposable local lab.
# Never invokes scanner tools, loads API keys, or targets external hosts.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE="${ROOT}/deploy/neo-artex-lab/compose.yaml"
STATE="${NEO_ARTEX_LAB_STATE_DIR:-${HOME}/.local/share/neo-artex-lab}"
ENVFILE="${STATE}/lab.env"
PROJECT="neo-artex-lab"
NETWORK="${PROJECT}_lab"

die() { printf 'ARTEX LAB SMOKE: %s\n' "$*" >&2; exit 1; }
for tool in docker jq curl; do
  command -v "$tool" >/dev/null 2>&1 || die "missing tool: $tool"
done
[ -f "$ENVFILE" ] || die 'lab.env missing: run prepare first'
compose() { docker compose --project-name "$PROJECT" --env-file "$ENVFILE" -f "$COMPOSE" "$@"; }

docker network inspect "$NETWORK" | jq -e '.[0].Internal == true' >/dev/null ||
  die 'lab Docker network is not marked internal'
printf '%s\n' 'PASS lab Docker network is internal'

for service in artex postgres neo-artex-target; do
  id="$(compose ps -q "$service")"
  [ -n "$id" ] || die "$service container is missing"
  docker inspect "$id" | jq -e --arg network "$NETWORK" '
    .[0].State.Running == true and
    (.[0].NetworkSettings.Networks | keys == [$network]) and
    (.[0].HostConfig.NetworkMode == $network)
  ' >/dev/null || die "$service is down or connected to another network"
  printf 'PASS %s running on isolated network\n' "$service"
done

artex_id="$(compose ps -q artex)"
docker inspect "$artex_id" | jq -e '
  .[0].HostConfig.PortBindings as $ports |
  ($ports["8787/tcp"] | length == 1) and
  ($ports["8787/tcp"][0].HostIp == "127.0.0.1") and
  ($ports["8787/tcp"][0].HostPort == "8787") and
  ($ports["8788/tcp"] == null) and
  (.[0].HostConfig.Privileged == false) and
  (.[0].HostConfig.NetworkMode == "neo-artex-lab_lab")
' >/dev/null || die 'ARTEX UI/proxy port exposure or privilege boundary failed'
printf '%s\n' 'PASS ARTEX UI is localhost-only; proxy unpublished; privileged mode off'

compose exec -T postgres pg_isready -U artexlab -d artexlab >/dev/null ||
  die 'lab PostgreSQL is unavailable'
printf '%s\n' 'PASS lab PostgreSQL ready'

compose exec -T artex curl --noproxy '*' -fsS --max-time 6 http://neo-artex-target:8080/ |
  grep -q 'NEO ARTEX isolated test target' ||
  die 'ARTEX cannot reach its synthetic internal fixture'
printf '%s\n' 'PASS synthetic test target is reachable inside lab'

status="$(curl --noproxy '*' --max-time 8 -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8787/)" ||
  die 'ARTEX UI is unreachable from host loopback'
case "$status" in
  200|301|302|303|307|308|401|403) ;;
  *) die "ARTEX UI returned unexpected HTTP status: $status" ;;
esac
printf 'PASS ARTEX UI responded over host loopback (HTTP %s)\n' "$status"
printf '%s\n' 'SMOKE COMPLETE. Do not run autonomous tasks until independent egress and scope checks pass.'
