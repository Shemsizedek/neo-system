# OCI provisioning through GitHub Actions

This bridge is used when ChatGPT cannot authenticate directly to Oracle Cloud.

## Required GitHub environment

Create an environment named `oci-production` and add these environment secrets:

- `OCI_TENANCY_OCID`
- `OCI_USER_OCID`
- `OCI_FINGERPRINT`
- `OCI_REGION`
- `OCI_COMPARTMENT_OCID`
- `OCI_SUBNET_OCID`
- `OCI_SSH_PUBLIC_KEY`
- `OCI_API_PRIVATE_KEY`

Never commit these values to the repository.

## OCI IAM boundary

Use a dedicated OCI user/group or equivalent constrained identity for provisioning. Grant only the minimum permissions required to launch and inspect compute instances and VNICs in the selected compartment/subnet. Do not grant tenancy-wide administrator access solely for this workflow.

## Manual provisioning workflow

Run **Actions → OCI Provision NEO Runtime → Run workflow**.

Inputs:

- availability domain name
- ARM-compatible image OCID for Ubuntu 24.04 or Oracle Linux
- Ampere A1 OCPUs (default 2)
- memory GB (default 12)
- instance display name

The workflow deliberately refuses shape inputs above 4 OCPUs or 24 GB RAM so an accidental oversized A1 request is not silently provisioned.

## What the workflow does

1. Validates that all OCI environment secrets exist.
2. Installs the OCI CLI on the GitHub Actions runner.
3. Builds a temporary OCI CLI config with restrictive file permissions.
4. Launches a `VM.Standard.A1.Flex` instance and waits for `RUNNING`.
5. Resolves the instance public IP.
6. Prints only the instance ID/public-IP deployment handoff to the Actions summary.

It does not expose the OCI API private key, wallet keys, NEO signing credentials, or other runtime secrets.

## After VM launch

The first VM is intentionally not auto-bootstrapped over SSH from GitHub until a separate SSH deployment key and host-verification gate are designed. The safe next steps are:

1. Point the NEO API DNS hostname to the public IP.
2. Bootstrap the host with `infra/oci/bootstrap-host.sh`.
3. Deploy the merged `infra/oci/docker-compose.yml` stack.
4. Verify `https://<host>/health`.
5. Verify `https://<host>/api/v1/oci/services`.

Transactional, wallet-signing, treasury, mining-control, trading, and bot-control execution remain outside this provisioning workflow.
