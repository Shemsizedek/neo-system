#!/usr/bin/env bash
set -euo pipefail

FQDN="${1:-mailtest.holytemples.org}"

PUBLIC_IP="$(curl -4fsS https://api.ipify.org || true)"
if [ -z "${PUBLIC_IP}" ]; then
  echo "FAIL: could not determine public IPv4" >&2
  exit 2
fi

echo "Public IPv4: ${PUBLIC_IP}"
echo "Expected FQDN: ${FQDN}"

A_RECORD="$(dig +short A "${FQDN}" | tail -n1)"
PTR_RECORD="$(dig +short -x "${PUBLIC_IP}" | sed 's/\.$//' | tail -n1)"

echo "Forward A: ${A_RECORD:-<none>}"
echo "PTR/rDNS: ${PTR_RECORD:-<none>}"

if [ "${A_RECORD}" != "${PUBLIC_IP}" ]; then
  echo "PENDING: forward DNS does not yet match this host."
fi

if [ "${PTR_RECORD}" != "${FQDN}" ]; then
  echo "PENDING: PTR/rDNS does not yet match ${FQDN}."
fi

echo
echo "Testing outbound SMTP connectivity:"
for host in gmail-smtp-in.l.google.com mx1.titan.email; do
  printf "%-30s " "${host}:25"
  if timeout 8 bash -c "</dev/tcp/${host}/25" 2>/dev/null; then
    echo "PASS"
  else
    echo "FAIL/BLOCKED"
  fi
done

echo
echo "Local listener expectations after Stalwart starts:"
for port in 25 443 465 993; do
  if ss -ltn 2>/dev/null | awk '{print $4}' | grep -Eq "[:.]${port}$"; then
    echo "PASS local listener :${port}"
  else
    echo "PENDING local listener :${port}"
  fi
done

echo
echo "Qualification rule:"
echo "- static IPv4"
echo "- FQDN A -> same IPv4"
echo "- IPv4 PTR -> same FQDN"
echo "- outbound TCP/25 PASS"
echo "- inbound TCP/25 allowed by host firewall/security list"
echo "Do not publish production MX until all conditions are evidenced."