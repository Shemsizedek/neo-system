# GitHub → GitLab federation sync

Critical NEO infrastructure is mirrored from GitHub into the private GitLab Project 144 repository.

## Primary synchronization path: connector-mediated reconciliation
The NEO System Health Agent is the primary secret-free reconciliation mechanism.

On its existing schedule it should:
1. read the approved critical-infrastructure manifest from GitHub;
2. compare the corresponding GitLab Project 144 files;
3. update GitLab only when content differs;
4. never copy secrets, tokens, private keys, mailbox contents, or generated credentials;
5. record meaningful drift or synchronization failures;
6. preserve GitHub as the current canonical development source unless a later bidirectional policy is explicitly approved.

This path relies on separately authorized GitHub and GitLab connectors and therefore does not require a cross-provider token stored in either repository.

## Optional fast path
`.github/workflows/mirror-neomail-to-gitlab.yml` remains available as an optional Git-native push mirror.

It requires the GitHub Actions repository secret:

`GITLAB_MIRROR_TOKEN`

If that secret is absent, the workflow fails closed. The secret must never appear in source, issues, logs, Render variables exposed to clients, or documentation.

## Current limitations
- GitLab shared CI currently requires account identity verification before jobs can run.
- This does not prevent repository mirroring through the connected GitLab control plane.

## Canonical-source policy
GitHub remains the current primary development source. GitLab is an independent mirror/failure domain. Do not automatically merge GitLab-originated changes back to GitHub until bidirectional conflict policy is approved.
