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

**Security limitation:** Browser origin restrictions and a high-entropy token limit access, but any arbitrary shell command entered here runs as the Linux user. Do not deploy as a public network listener. No persistent sessions, PTY, SSH or hardware key emulation yet. Do not enter passwords or recovery seeds into terminal commands.

**Deployment:** The existing Render service uses root `render.yaml` on `main` with automatic deployments off. Review and merge the update, then manually deploy the latest commit in Render. No DNS change or companion update is needed. The server serves only the page and its module, not a terminal proxy. `/connect/*` and `/api/*` remain denied. Verify the live page and actual Chromebook connection after deployment before claiming readiness.

**Tests:** `node --test apps/neo-connect-chromebook/*.test.mjs deploy/noogle-render/server.test.mjs deploy/noogle-render/pairing-preview.test.mjs deploy/noogle-render/chromebook.test.mjs`.
