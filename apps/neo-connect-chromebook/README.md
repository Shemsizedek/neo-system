# NEO Connect Chromebook companion

The public terminal page is served by `deploy/noogle-render/server.mjs` at **https://connect.holytemples.org/chromebook/** after this update is deployed. The Device Hub links to it as **Open Chromebook Terminal**. It connects from that browser origin directly to an authenticated local loopback companion. No Termux, SSH server, NEO Pass or cloud database is required for this same-Chromebook connection; browser pairing is separate.

On Chromebook, enable the supported Linux development environment, install Node.js 20+ inside it, then start:
```sh
cd neo-system
node apps/neo-connect-chromebook/agent.mjs
```
Use the existing checkout; skip `cd neo-system` if already in it. The process prints a fresh session token. Leave it running in that Terminal tab; if port 8766 is already in use, use the existing companion and its token rather than starting another copy.

Open the terminal page **in Chrome on that same Chromebook**, paste the token into **Local companion session token**, and select **Connect**. This runs `pwd` and must display its output with `[exit 0]` before enabling **Run on Chromebook**. Allow local-network access if Chrome asks. The token stays only in this page's memory, never in browser storage or a Render request. Disconnect clears it; Ctrl+C in the companion's Terminal tab stops access entirely. Refreshing requires entering the token again.

Linux-container networking and Chrome local-network access rules may prevent the browser connecting to 127.0.0.1; successful curl requests in the Linux terminal do not prove Chrome access. Test this on the target Chromebook. Never expose port 8766 or forward it to the internet. The Render hostname, localhost, and file URLs cannot authenticate to the companion; use the canonical HTTPS domain.

Each command runs in a fresh shell rooted at the Linux user's home directory, so `cd` does not persist across commands. Use `cd neo-system && ...` when needed. Interactive shells and long-running servers must use the normal Chromebook Terminal. Connecting this page does not give ChatGPT access to the Chromebook.

## SSH from Chromebook to a remote server

Select **Remote server (SSH)** before connecting. Enter the server hostname, IPv4 address, or existing SSH alias. The optional **Linux SSH username** and **SSH port** override the Chromebook's SSH configuration; leave them empty to use that configuration. A Google service-account email is not an SSH server address. Use a VM hostname/IP and the Linux account or an alias already defined in `~/.ssh/config`.

First make ordinary key-based SSH work from the Chromebook Terminal. Verify the server's host-key fingerprint through your server provider or administrator before accepting it. The web client never accepts a server password, private key, service-account key, or host-trust bypass. SSH runs through the companion using OpenSSH on the Chromebook, with `BatchMode=yes`, `StrictHostKeyChecking=yes`, no PTY, no agent forwarding, and no port forwarding. Server credentials stay on the Chromebook; only the companion session token and explicit command/target settings travel from the browser to loopback.

For an existing alias, test `ssh my-server pwd` in the Chromebook Terminal before choosing that alias on the page. For a hostname and username, use `ssh linux-user@server-hostname pwd` (replace the example with the actual target). Do not put these placeholder values or a service-account email into the page. After selecting SSH and entering the companion token, **Connect** runs `pwd` on the server; only exit 0 enables **Run on SSH server**. Each command creates a separate SSH connection, with a fifteen-second request limit. Disconnecting the page or timing out the SSH client does not guarantee that a remote command stops. This is command execution, not an interactive terminal or a long-running session. Commands run as the selected remote user.

SSH requires the updated companion as well as the deployed web page. After the update is merged, run `git pull --ff-only` in the existing Chromebook checkout, stop the old companion with Ctrl+C, restart it, and use the new token. If the page reports that the companion does not support SSH, the old companion is still running. If OpenSSH is missing, install `openssh-client` through the Chromebook Linux package manager. Host-key or key-authentication failures must be resolved in the normal Terminal; they are never silently bypassed by the browser.

The public Render service has no SSH endpoint or SSH credentials. The companion's `/ssh/command` requires the same canonical Origin and session token as `/command`. Development in a ChatGPT cloud workspace does not imply a public SSH endpoint for that workspace. A live external server connection still needs an actual reachable target and working Chromebook SSH configuration.

**Security limitation:** Browser origin restrictions and a high-entropy token limit access, but arbitrary commands run as the Chromebook Linux user or selected SSH user. Do not deploy the companion as a public network listener. No persistent sessions, PTY or hardware key emulation. Do not enter passwords or recovery seeds into terminal commands.

**Deployment:** The existing Render service uses root `render.yaml` on `main` with automatic deployments off. Review and merge the update, then manually deploy the latest commit in Render. No DNS change is needed. SSH users must update/restart their Chromebook companion as described above. The server serves only the page and its module, not a terminal or SSH proxy. `/connect/*` and `/api/*` remain denied. Verify the live page and actual Chromebook connection after deployment before claiming readiness.

**Tests:** `node --test apps/neo-connect-chromebook/*.test.mjs deploy/noogle-render/server.test.mjs deploy/noogle-render/pairing-preview.test.mjs deploy/noogle-render/chromebook.test.mjs`.
