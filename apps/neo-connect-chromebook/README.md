# NEO Connect Chromebook companion

The public HTML page is designed for **https://connect.holytemples.org**. It connects from that browser origin to an authenticated local loopback companion. No Termux, SSH server, NEO Pass or cloud database required.

On Chromebook, enable the supported Linux development environment, install Node.js 20+ inside it, then start:
```sh
node agent.mjs
```
The process prints a fresh session token. Paste it into the browser page. Linux-container networking and Chrome private-network access rules may prevent the browser connecting to 127.0.0.1; this must be tested on the target Chromebook. Never expose port 8766 or forward it to the internet.

**Security limitation:** Browser origin restrictions and a high-entropy token limit access, but any arbitrary shell command entered here runs as the Linux user. Do not deploy as a public network listener. No persistent sessions, PTY, SSH or hardware key emulation yet. Do not enter passwords or recovery seeds into terminal commands.

**Deployment:** Place index.html at connect.holytemples.org only after DNS/hosting is verified and explicitly approved. Do not replace Noogle search or modify existing production routes.
