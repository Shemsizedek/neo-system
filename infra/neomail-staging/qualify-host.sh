#!/usr/bin/env bash
set -euo pipefail

FQDN="${1:-mailtest.holytemples.org}"

section() { printf '\n== %s ==\n' "$1"; }
pass() { printf 'PASS: %s\n' "$1"; }
warn() { printf 'PENDING: %s\n' "$1"; }
fail() { printf 'FAIL: %s\n' "$1"; }

section "Host identity"
echo "Hostname: $(hostname 2>/dev/null || true)"
echo "Kernel: $(uname -srmo 2>/dev/null || true)"
if [ -f /etc/os-release ]; then . /etc/os-release; echo "OS: ${PRETTY_NAME:-unknown}"; fi
if [ -n "${CODESPACES:-}" ]; then
  echo "Environment: GitHub Codespaces"
  NODE_CLASS="ephemeral"
else
  echo "Environment: standard Linux / unknown"
  NODE_CLASS="candidate"
fi

section "Public addressing"
PUBLIC_IP="$(curl -4fsS --max-time 8 https://api.ipify.org || true)"
if [ -n "$PUBLIC_IP" ]; then
  pass "public IPv4 detected: $PUBLIC_IP"
else
  fail "could not determine public IPv4"
fi

if command -v dig >/dev/null 2>&1; then
  A_RECORD="$(dig +short A "$FQDN" | tail -n1)"
  PTR_RECORD=""
  [ -n "$PUBLIC_IP" ] && PTR_RECORD="$(dig +short -x "$PUBLIC_IP" | sed 's/\.$//' | tail -n1)"
  echo "Expected FQDN: $FQDN"
  echo "Forward A: ${A_RECORD:-<none>}"
  echo "PTR/rDNS: ${PTR_RECORD:-<none>}"
  [ -n "$PUBLIC_IP" ] && [ "$A_RECORD" = "$PUBLIC_IP" ] && pass "forward DNS matches public IP" || warn "forward DNS not yet bound to this host"
  [ "$PTR_RECORD" = "$FQDN" ] && pass "PTR matches FQDN" || warn "PTR/rDNS not yet matched (required before direct-to-MX outbound)"
else
  warn "dig not installed; DNS comparison skipped"
fi

section "Outbound transport"
if timeout 8 bash -c '</dev/tcp/smtp.resend.com/465' 2>/dev/null; then
  pass "smtp.resend.com:465 reachable"
else
  fail "smtp.resend.com:465 unreachable"
fi

for host in gmail-smtp-in.l.google.com mx1.titan.email; do
  if timeout 5 bash -c "</dev/tcp/$host/25" 2>/dev/null; then
    echo "INFO: outbound direct SMTP $host:25 reachable"
  else
    echo "INFO: outbound direct SMTP $host:25 blocked/unreachable (not a free-first blocker)"
  fi
done

section "Local listeners"
if command -v ss >/dev/null 2>&1; then
  for port in 25 443 465 993; do
    if ss -ltn | awk '{print $4}' | grep -Eq "[:.]$port$"; then
      pass "local listener :$port"
    else
      warn "local listener :$port not active"
    fi
  done
else
  warn "ss unavailable; listener test skipped"
fi

section "Storage"
ROOT_AVAIL="$(df -Pk / 2>/dev/null | awk 'NR==2 {print $4}')"
ROOT_FS="$(df -PT / 2>/dev/null | awk 'NR==2 {print $2}')"
echo "Root filesystem: ${ROOT_FS:-unknown}"
echo "Root available KiB: ${ROOT_AVAIL:-unknown}"
if [ -n "${ROOT_AVAIL:-}" ] && [ "$ROOT_AVAIL" -ge 5242880 ]; then
  pass "at least 5 GiB free storage"
else
  warn "less than 5 GiB free or storage could not be verified"
fi

section "Container runtime"
if command -v docker >/dev/null 2>&1; then
  docker --version || true
  if docker info >/dev/null 2>&1; then pass "Docker daemon usable"; else warn "Docker installed but daemon unavailable"; fi
else
  warn "Docker not installed"
fi

section "Firewall"
if command -v ufw >/dev/null 2>&1; then
  ufw status || true
elif command -v firewall-cmd >/dev/null 2>&1; then
  firewall-cmd --state || true
elif command -v nft >/dev/null 2>&1; then
  nft list ruleset 2>/dev/null | sed -n '1,120p' || true
elif command -v iptables >/dev/null 2>&1; then
  iptables -S 2>/dev/null | sed -n '1,120p' || true
else
  warn "no supported firewall administration tool detected"
fi

section "External inbound requirements"
echo "REQUIRES EXTERNAL PROBE:"
echo "- public TCP/25 -> this host"
echo "- public TCP/443 -> this host"
echo "- public TCP/465 -> this host"
echo "- public TCP/993 -> this host"
echo "A local listener does NOT prove public reachability."

section "Classification"
if [ "$NODE_CLASS" = "ephemeral" ]; then
  echo "CLASSIFICATION: NEO_CODESPACE_NODE"
  echo "Eligible for build/test/control-plane work; not permanent authoritative MX."
elif [ -z "$PUBLIC_IP" ]; then
  echo "CLASSIFICATION: NEO_EDGE_NODE_PENDING_NETWORK"
else
  echo "CLASSIFICATION: NEO_NODE_A_CANDIDATE"
  echo "Final promotion requires external inbound TCP/25, 443, 465, 993 + durable storage + backup/restore + Stalwart acceptance."
fi

echo
echo "Production Titan MX MUST remain unchanged until the permanent-node acceptance checklist passes."
