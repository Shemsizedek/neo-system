import json
import subprocess
import unittest
from unittest.mock import patch
import neo_cloud_runtime_recovery as recovery

ACTIVE = "LoadState=loaded\nActiveState=active\nSubState=running\nResult=success\n"
INACTIVE = "LoadState=loaded\nActiveState=failed\nSubState=failed\nResult=exit-code\n"


class RecoveryTests(unittest.TestCase):
    def run_case(self, outputs=(), **kwargs):
        calls = []
        queue = iter(outputs)
        def run(argv):
            calls.append(argv)
            item = next(queue)
            if isinstance(item, Exception):
                raise item
            if isinstance(item, tuple):
                return subprocess.CompletedProcess(argv, item[0], item[1], "PRIVATE-ERROR")
            return subprocess.CompletedProcess(argv, 0, item, "")
        options = dict(runner=run, binary=lambda name: "/usr/bin/" + name,
                       hostname="test-node", system="Linux", euid=1000)
        options.update(kwargs)
        expected = options.pop("expected_host", "test-node")
        restart = options.pop("restart", False)
        report, code = recovery.recover(expected, restart, **options)
        self.assertFalse(report["miningGatePassed"])
        self.assertFalse(report["externalEvidenceVerified"])
        self.assertFalse(report["productionActivated"])
        self.assertIsNone(report["hubConnected"])
        self.assertEqual(report["executionMode"], "FIXTURE_TEST")
        return report, code, calls

    def test_default_never_restarts(self):
        report, code, calls = self.run_case([ACTIVE])
        self.assertEqual(code, 0)
        self.assertFalse(report["restartAttempted"])
        self.assertEqual(len(calls), 1)
        self.assertIn("show", calls[0])

    def test_wrong_host_does_nothing(self):
        report, code, calls = self.run_case(expected_host="another-node", restart=True)
        self.assertEqual(report["reason"], "WRONG_HOST_NO_ACTION")
        self.assertEqual(calls, [])
        self.assertEqual(code, 2)

    def test_invalid_expected_hosts(self):
        for host in ("", "--help", "host;sh", "a/b", "hostname.example", "x" * 64):
            with self.subTest(host=host):
                report, code, calls = self.run_case(expected_host=host, restart=True)
                self.assertEqual(report["reason"], "EXPECTED_HOSTNAME_REQUIRED")
                self.assertEqual(calls, [])

    def test_non_linux_rejected(self):
        report, _, calls = self.run_case(system="Darwin", restart=True)
        self.assertEqual(report["reason"], "LINUX_SYSTEMD_REQUIRED")
        self.assertEqual(calls, [])

    def test_systemctl_missing(self):
        report, _, calls = self.run_case(binary=lambda _: None)
        self.assertEqual(report["reason"], "SYSTEMCTL_UNAVAILABLE")
        self.assertEqual(calls, [])

    def test_missing_or_masked_service_never_restarted(self):
        for load in ("masked", "not-found", "bad-setting", "error"):
            with self.subTest(load=load):
                report, _, calls = self.run_case([ACTIVE.replace("loaded", load)], restart=True)
                self.assertFalse(report["restartAttempted"])
                self.assertEqual(len(calls), 1)

    def test_inactive_default_is_blocked(self):
        report, code, calls = self.run_case([INACTIVE])
        self.assertEqual(code, 4)
        self.assertEqual(report["reason"], "LOCAL_AGENT_NOT_RUNNING")
        self.assertEqual(len(calls), 1)

    def test_authorized_restart_uses_only_fixed_service(self):
        report, code, calls = self.run_case([INACTIVE, "", ACTIVE], restart=True)
        self.assertEqual(calls[1], ["/usr/bin/sudo", "-n", "--", "/usr/bin/systemctl", "--no-ask-password", "restart", recovery.SERVICE])
        self.assertEqual(code, 0)
        self.assertTrue(report["restartCommandSucceeded"])
        self.assertEqual(len(calls), 3)

    def test_root_needs_no_sudo(self):
        _, code, calls = self.run_case([INACTIVE, "", ACTIVE], restart=True, euid=0)
        self.assertEqual(calls[1][0], "/usr/bin/systemctl")
        self.assertEqual(code, 0)

    def test_already_active_still_requires_explicit_restart(self):
        report, code, calls = self.run_case([ACTIVE, "", ACTIVE], restart=True)
        self.assertEqual(len(calls), 3)
        self.assertTrue(report["restartAttempted"])
        self.assertEqual(code, 0)

    def test_missing_sudo_cannot_restart(self):
        report, _, calls = self.run_case([INACTIVE], restart=True, binary=lambda n: "/usr/bin/systemctl" if n == "systemctl" else None)
        self.assertEqual(report["reason"], "SUDO_UNAVAILABLE_NO_ACTION")
        self.assertEqual(len(calls), 1)

    def test_restart_failure_redacts_all_raw_output(self):
        report, code, calls = self.run_case([INACTIVE, (1, "SECRET-TOKEN")], restart=True)
        self.assertEqual(report["reason"], "RESTART_REFUSED_OR_FAILED")
        self.assertEqual(code, 3)
        self.assertEqual(len(calls), 2)
        self.assertNotIn("SECRET-TOKEN", json.dumps(report))
        self.assertNotIn("PRIVATE-ERROR", json.dumps(report))

    def test_restart_timeout_is_unknown_not_success(self):
        report, code, calls = self.run_case([INACTIVE, subprocess.TimeoutExpired("private-command", 20)], restart=True)
        self.assertIn("COMPLETION_UNKNOWN", report["reason"])
        self.assertFalse(report["restartCommandSucceeded"])
        self.assertEqual(code, 3)
        self.assertEqual(len(calls), 2)

    def test_restart_request_os_error_is_bounded(self):
        report, code, calls = self.run_case([INACTIVE, OSError("secret path")], restart=True)
        self.assertEqual(code, 3)
        self.assertNotIn("secret path", json.dumps(report))
        self.assertEqual(len(calls), 2)

    def test_post_restart_inspection_failure(self):
        report, code, _ = self.run_case([INACTIVE, "", "bad"], restart=True)
        self.assertTrue(report["restartCommandSucceeded"])
        self.assertEqual(report["reason"], "POST_RESTART_STATE_UNKNOWN")
        self.assertEqual(code, 3)

    def test_successful_command_not_running_is_blocked(self):
        report, code, _ = self.run_case([INACTIVE, "", INACTIVE], restart=True)
        self.assertTrue(report["restartCommandSucceeded"])
        self.assertEqual(code, 4)

    def test_incomplete_duplicate_and_large_properties_rejected(self):
        for text in ("LoadState=loaded\n", ACTIVE + "LoadState=loaded\n", "x" * 8193):
            with self.subTest(text=text[:25]):
                report, code, calls = self.run_case([text], restart=True)
                self.assertEqual(report["reason"], "SERVICE_INSPECTION_FAILED")
                self.assertFalse(report["restartAttempted"])
                self.assertEqual(len(calls), 1)

    def test_allowlist_discards_extra_fields_and_unknown_values(self):
        report, code, _ = self.run_case([ACTIVE.replace("success", "secret-result") + "Environment=secret-env\nExecStart=secret-command\n"])
        output = json.dumps(report)
        self.assertNotIn("secret-", output)
        self.assertEqual(report["serviceBefore"]["Result"], "UNKNOWN")
        self.assertEqual(code, 0)

    def test_failed_initial_inspection_blocks_mutation(self):
        for value in ((1, ACTIVE), OSError("sensitive"), subprocess.TimeoutExpired("x", 20)):
            with self.subTest(value=str(value)):
                report, _, calls = self.run_case([value], restart=True)
                self.assertEqual(report["reason"], "SERVICE_INSPECTION_FAILED")
                self.assertFalse(report["restartAttempted"])
                self.assertEqual(len(calls), 1)

    def test_real_runner_never_uses_shell_or_inherits_secrets(self):
        with patch.object(subprocess, "run") as run:
            recovery._run(["/usr/bin/systemctl", "show", recovery.SERVICE])
            _, kwargs = run.call_args
            self.assertFalse(kwargs["shell"])
            self.assertEqual(kwargs["timeout"], 20)
            self.assertEqual(kwargs["env"], recovery.SAFE_ENV)
            self.assertNotIn("NICEHASH_TEST_API_SECRET", kwargs["env"])

    def test_binary_search_does_not_use_path_environment(self):
        with patch.object(recovery.os.path, "isfile", return_value=True), patch.object(recovery.os, "access", return_value=True):
            self.assertEqual(recovery._binary("systemctl"), "/usr/bin/systemctl")


if __name__ == "__main__":
    unittest.main(verbosity=2)
