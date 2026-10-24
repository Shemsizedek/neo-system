#!/usr/bin/env python3
"""Bounded, secret-free recovery of an existing SentinelX systemd service.

Default: inspect only. --restart-agent permits one service restart on the named
host. Does not reinstall, re-enroll, reboot, edit configuration, or run mining.
Local service status cannot prove that the remote SentinelX hub is connected.
"""
from __future__ import annotations

import argparse
import json
import os
import platform
import re
import subprocess
from datetime import datetime, timezone
from typing import Callable

SERVICE = "sentinelx-cloud-core.service"
PROPERTIES = {
    "LoadState": {"loaded", "not-found", "masked", "error", "bad-setting", "stub", "merged"},
    "ActiveState": {"active", "inactive", "failed", "activating", "deactivating", "reloading", "maintenance", "refreshing"},
    "SubState": {"dead", "condition", "start-pre", "start", "start-post", "running", "exited", "reload", "reload-signal", "reload-notify", "stop", "stop-watchdog", "stop-sigterm", "stop-sigkill", "stop-post", "final-watchdog", "final-sigterm", "final-sigkill", "failed", "auto-restart", "clean"},
    "Result": {"success", "exit-code", "signal", "core-dump", "timeout", "watchdog", "start-limit-hit", "resources", "protocol", "oom-kill", "exec-condition", "dependency", "assert", "condition"},
}
HOSTNAME = re.compile(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\Z")
SAFE_ENV = {"PATH": "/usr/sbin:/usr/bin:/sbin:/bin", "LANG": "C", "LC_ALL": "C", "SYSTEMD_PAGER": "", "SYSTEMD_COLORS": "0"}


def _binary(name: str) -> str | None:
    # Do not execute a same-named binary in a user-controlled PATH directory.
    for directory in ("/usr/bin", "/bin"):
        path = directory + "/" + name
        if os.path.isfile(path) and os.access(path, os.X_OK):
            return path
    return None


def _run(argv: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(argv, shell=False, stdin=subprocess.DEVNULL,
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                          text=True, encoding="utf-8", errors="replace",
                          timeout=20, env=SAFE_ENV)


def _properties(output: str) -> dict[str, str]:
    if len(output) > 8192:
        raise ValueError("UNEXPECTED_SERVICE_OUTPUT")
    result = {}
    for line in output.splitlines():
        name, separator, value = line.partition("=")
        if not separator or name not in PROPERTIES:
            continue
        if name in result:
            raise ValueError("DUPLICATE_SERVICE_PROPERTY")
        result[name] = value if value in PROPERTIES[name] else "UNKNOWN"
    if set(result) != set(PROPERTIES):
        raise ValueError("INCOMPLETE_SERVICE_PROPERTIES")
    return result


def recover(expected_host: str, restart: bool = False, *,
            runner: Callable | None = None, binary: Callable | None = None,
            hostname: str | None = None, system: str | None = None,
            euid: int | None = None) -> tuple[dict, int]:
    # Injection is available for hermetic tests, never through the public CLI.
    fixture = any(x is not None for x in (runner, binary, hostname, system, euid))
    runner = _run if runner is None else runner
    binary = _binary if binary is None else binary
    hostname = platform.node().split(".")[0] if hostname is None else hostname
    system = platform.system() if system is None else system
    report = {
        "schema": "neo-cloud-runtime-recovery/v1",
        "checkedAt": datetime.now(timezone.utc).isoformat(),
        "executionMode": "FIXTURE_TEST" if fixture else "LOCAL_HOST_CHECK",
        "service": SERVICE, "status": "BLOCKED",
        "hostMatches": False, "restartRequested": restart,
        "restartAttempted": False, "restartCommandSucceeded": False,
        "serviceBefore": None, "serviceAfter": None,
        "hubConnected": None, "externalEvidenceVerified": False,
        "miningGatePassed": False, "productionActivated": False,
    }

    def stop(reason: str, code: int = 2) -> tuple[dict, int]:
        report["reason"] = reason
        return report, code

    if not isinstance(expected_host, str) or not HOSTNAME.fullmatch(expected_host):
        return stop("EXPECTED_HOSTNAME_REQUIRED")
    if hostname != expected_host:
        return stop("WRONG_HOST_NO_ACTION")
    report["hostMatches"] = True
    if system != "Linux":
        return stop("LINUX_SYSTEMD_REQUIRED")
    systemctl = binary("systemctl")
    if systemctl is None:
        return stop("SYSTEMCTL_UNAVAILABLE")
    inspect = [systemctl, "--no-pager", "--no-ask-password", "show", SERVICE,
               "--property=" + ",".join(PROPERTIES)]

    def read_state() -> dict:
        result = runner(inspect)
        values = _properties(result.stdout)
        if values["LoadState"] == "loaded" and result.returncode != 0:
            raise ValueError("SERVICE_INSPECTION_FAILED")
        return values

    try:
        report["serviceBefore"] = read_state()
    except (OSError, subprocess.SubprocessError, ValueError):
        return stop("SERVICE_INSPECTION_FAILED")
    state = report["serviceBefore"]
    if state["LoadState"] != "loaded":
        return stop("SERVICE_NOT_LOADED_NO_ACTION")
    if restart:
        if euid is None:
            euid = os.geteuid()
        command = [systemctl, "--no-ask-password", "restart", SERVICE]
        if euid != 0:
            sudo = binary("sudo")
            if sudo is None:
                return stop("SUDO_UNAVAILABLE_NO_ACTION")
            command = [sudo, "-n", "--"] + command
        report["restartAttempted"] = True
        try:
            result = runner(command)
        except subprocess.TimeoutExpired:
            # Killing the local client does not cancel a queued systemd job.
            return stop("RESTART_COMPLETION_UNKNOWN_DO_NOT_REPEAT_AUTOMATICALLY", 3)
        except (OSError, subprocess.SubprocessError):
            return stop("RESTART_REQUEST_FAILED", 3)
        if result.returncode != 0:
            return stop("RESTART_REFUSED_OR_FAILED", 3)
        report["restartCommandSucceeded"] = True
        try:
            report["serviceAfter"] = read_state()
        except (OSError, subprocess.SubprocessError, ValueError):
            return stop("POST_RESTART_STATE_UNKNOWN", 3)
        state = report["serviceAfter"]
    if state["LoadState"] == "loaded" and state["ActiveState"] == "active" and state["SubState"] == "running":
        report["status"] = "LOCAL_AGENT_RUNNING_HUB_UNVERIFIED"
        report["reason"] = "RECHECK_SENTINELX_HOST_LIST_AND_READ_ONLY_PING"
        return report, 0
    return stop("LOCAL_AGENT_NOT_RUNNING", 4)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--expected-host", required=True,
                        help="Exact short hostname of the existing enrolled server")
    parser.add_argument("--restart-agent", action="store_true",
                        help="Permit one restart of the existing management agent only")
    args = parser.parse_args()
    report, code = recover(args.expected_host, args.restart_agent)
    print(json.dumps(report, indent=2))
    return code


if __name__ == "__main__":
    raise SystemExit(main())
