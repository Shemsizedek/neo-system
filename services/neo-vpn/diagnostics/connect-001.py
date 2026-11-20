#!/usr/bin/env python3
"""NEO-CONNECT-001: read-only, redacted connectivity diagnostic.

No interface configuration, routes, firewall rules, VPN keys or settings are changed.
No SSID, BSSID, MAC address, location, public IP or raw Termux API payload is printed.
"""
import argparse
import datetime
import json
import shutil
import socket
import ssl
import subprocess
import time


def signal_grade(rssi):
    if not isinstance(rssi, (int, float)) or not -120 <= rssi <= 0:
        return "UNKNOWN"
    if rssi >= -55:
        return "EXCELLENT"
    if rssi >= -67:
        return "GOOD"
    if rssi >= -75:
        return "FAIR"
    return "WEAK"


def termux_wifi():
    """Return only numeric signal data. Never return SSID/BSSID/IP identifiers."""
    if not shutil.which("termux-wifi-connectioninfo"):
        return {"status": "NOT_AVAILABLE", "signal": "UNKNOWN"}
    try:
        p = subprocess.run(["termux-wifi-connectioninfo"], text=True,
                           capture_output=True, timeout=5, check=False)
        if p.returncode != 0:
            return {"status": "PERMISSION_OR_API_UNAVAILABLE", "signal": "UNKNOWN"}
        data = json.loads(p.stdout)
        if not isinstance(data, dict):
            raise ValueError("Non-object Wi-Fi response")
        rssi = data.get("rssi")
        if isinstance(rssi, bool) or not isinstance(rssi, (float, int)):
            rssi = None
        return {"status": "READ" if rssi is not None else "RSSI_UNAVAILABLE",
                "signal": signal_grade(rssi),
                "rssi_dbm": rssi}
    except (subprocess.TimeoutExpired, json.JSONDecodeError, ValueError, OSError):
        return {"status": "UNAVAILABLE", "signal": "UNKNOWN"}


def probe(target, port=443, timeout=4):
    """Resolve DNS and make one TLS handshake; never send page data."""
    started = time.monotonic()
    try:
        socket.getaddrinfo(target, port, type=socket.SOCK_STREAM)
        dns_ms = round((time.monotonic() - started) * 1000)
    except (OSError, socket.gaierror):
        return {"target": target, "dns": "FAIL", "tls": "NOT_TESTED"}
    try:
        begin = time.monotonic()
        with socket.create_connection((target, port), timeout=timeout) as sock:
            with ssl.create_default_context().wrap_socket(sock, server_hostname=target):
                pass
        return {"target": target, "dns": "PASS", "dns_ms": dns_ms,
                "tls": "PASS", "tls_ms": round((time.monotonic()-begin)*1000)}
    except (OSError, ssl.SSLError, TimeoutError):
        return {"target": target, "dns": "PASS", "dns_ms": dns_ms,
                "tls": "FAIL"}


def assess(wifi, probes):
    if wifi["signal"] == "WEAK":
        return "Investigate local Wi-Fi range, placement, walls, and a wired-backhaul AP."
    if probes and all(p["tls"] == "PASS" for p in probes):
        return "Internet path passed brief probes; check coverage at multiple rooms."
    if any(p["dns"] == "FAIL" for p in probes):
        return "DNS resolution failed on at least one target; check network DNS."
    if any(p["tls"] == "FAIL" for p in probes):
        return "TLS connectivity failed on at least one target; check ISP or captive portal."
    return "Insufficient evidence; no network configuration changes recommended."


def main():
    parser = argparse.ArgumentParser(description="Redacted NEO connectivity diagnostic")
    parser.add_argument("--offline", action="store_true",
                        help="Skip public DNS/TLS probes (Wi-Fi diagnostics only)")
    args = parser.parse_args()
    wifi = termux_wifi()
    probes = [] if args.offline else [probe("example.org"), probe("www.wikipedia.org")]
    output = {
        "gate": "NEO-CONNECT-001",
        "timestamp_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "source": "LOCAL_DEVICE_DIAGNOSTIC",
        "wifi": wifi, "internet": probes,
        "assessment": assess(wifi, probes),
        "limitations": "No speed, packet-loss, mesh, cellular backup, VPN or failover certification."
    }
    print(json.dumps(output, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
