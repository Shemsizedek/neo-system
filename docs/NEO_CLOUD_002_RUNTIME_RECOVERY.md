# CLOUD-002: restore the existing runtime connection

Status: recovery helper implemented; real host restoration and external mining/payment acceptance remain unverified.

## Decision and scope

Do not create another mining gate, replace the server, rotate its enrollment, weaken access controls or bypass CLOUD-002 with fixture success. Recover the existing management connection first. The existing acceptance runner and provider/Counter boundaries remain unchanged.

The helper uses Python 3.10+ standard library only. It defaults to read-only inspection, requires an explicit expected short hostname, accepts no arbitrary service name, and invokes only the existing `sentinelx-cloud-core.service`. Subprocesses have a timeout and use absolute binaries from system directories. Raw command output, logs, environment variables, enrollment files and credentials are not printed. It neither reinstalls software nor edits files on the target host.

## Operator procedure

Use the hosting provider's existing SSH/serial console to reach the intended machine. A Cloud Shell session is not that machine unless an SSH session to it has been opened. Confirm the machine identity in the provider console before using its hostname as the guard; matching a hostname is a sanity check, not ownership proof.

Copy the reviewed helper to that machine. From the directory holding it:

```sh
# Read-only; replace the placeholder with the known existing short hostname.
python3 neo_cloud_runtime_recovery.py --expected-host <existing-hostname>

# Explicitly request ONE agent-service restart, then read back its state.
python3 neo_cloud_runtime_recovery.py --expected-host <existing-hostname> --restart-agent
```

When running from the repository checkout, prepend `scripts/` to the filename. A non-root operator uses `sudo -n`; lack of permission fails closed without requesting or handling a password. Authenticate locally using the approved administrative process before retrying. Do not supply credentials in chat. A masked, missing or misconfigured unit is not unmasked, installed or rewritten automatically.

If the restart command times out, its final state is unknown; do not automatically repeat it. Inspect the existing service from the same console. A request can remain queued in systemd after its client exits.

## Interpretation

- Exit 0 and `LOCAL_AGENT_RUNNING_HUB_UNVERIFIED`: local process appears active/running. This does NOT establish a restored SentinelX connection.
- Exit 2: wrong host, unsupported platform, missing service/tools or failed inspection. No restart was attempted.
- Exit 3: restart command refused/failed/timed out, or its subsequent state could not be read. Inspect `restartAttempted` and `restartCommandSucceeded`; do not assume nothing happened.
- Exit 4: the local process is not running; the report shows whether a restart was requested and attempted.

Reports always retain `hubConnected: null`, `externalEvidenceVerified: false`, `miningGatePassed: false` and `productionActivated: false`. These cannot be inferred from service health.

## Actual completion gate

1. The enrolled host appears connected and operational in SentinelX.
2. A read-only ping/command succeeds against that same stable enrollment ID.
3. Inspect narrowly scoped runtime/configuration metadata without exposing secrets. Run the existing `cloudSandboxAcceptance.mjs --preflight` on the reviewed checkout and protected configuration.
4. Only after preflight and operator approval, use the existing acceptance runner against the actual authorized provider order and genuine Counter test payment.

An offline VM, broken networking or agent enrollment failure may require provider-side diagnosis; this helper cannot repair those while the host is unreachable. No support report, new VM, paid service or enrollment is created by the helper.

## Verification and ownership

- Code/tests: NEO implementation workstream. Hermetic tests mock subprocess execution; they do not prove a physical-host restart or remote reconnection.
- Existing host console access: authorized infrastructure operator. No provider-console access is assumed.
- Reconnection and external acceptance evidence: NEO operations, verified through the connected tools after restoration.
- Rollback: no configuration or persistent files are modified by the helper. The optional service restart is a real runtime action; do not stop the agent as a purported rollback.

Primary command semantics: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html (`show` selects machine-readable properties; `restart` acts on the named unit). The helper is not itself proof of successful recovery.
