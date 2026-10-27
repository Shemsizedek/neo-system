const companionUrl = 'http://127.0.0.1:8766/command';
const trustedOrigin = 'https://connect.holytemples.org';

export function mountTerminal({document, fetch:request = globalThis.fetch, origin = globalThis.location.origin}) {
  const element = id => document.getElementById(id);
  const key = element('key'), command = element('cmd'), output = element('out'), status = element('status');
  const connect = element('connect'), disconnect = element('disconnect'), run = element('run');
  let sessionToken = '', connected = false, activeRequest = null;

  function controls() {
    connect.disabled = Boolean(activeRequest) || connected || origin !== trustedOrigin;
    disconnect.disabled = !activeRequest && !connected;
    key.disabled = Boolean(activeRequest) || connected || origin !== trustedOrigin;
    command.disabled = run.disabled = !connected || Boolean(activeRequest);
  }

  function clearSession() {
    activeRequest?.abort();
    activeRequest = null;
    connected = false;
    sessionToken = '';
    key.value = '';
    controls();
  }

  async function execute(text, connecting) {
    const controller = new AbortController();
    activeRequest = controller;
    controls();
    status.textContent = connecting ? 'Checking companion…' : 'Running command…';
    try {
      const response = await request(companionUrl, {
        method:'POST', credentials:'omit', cache:'no-store', redirect:'error',
        headers:{'content-type':'application/json', 'x-neo-token':sessionToken},
        body:JSON.stringify({command:text}),
        signal:AbortSignal.any([controller.signal, AbortSignal.timeout(10000)])
      });
      if (controller.signal.aborted) return;
      if (!response.ok) {
        if (response.status === 401) throw Error('Token not accepted. Paste the session token from the currently running companion, then reconnect.');
        if (response.status === 403) throw Error('The companion rejected this site. Use https://connect.holytemples.org/chromebook/ and the supported companion.');
        throw Error('The companion could not run that command (HTTP ' + response.status + ').');
      }
      const result = await response.json();
      if (controller.signal.aborted) return;
      if (typeof result.output !== 'string' || !Number.isInteger(result.code)) throw Error('Unexpected companion response. Check that the supported companion is running.');
      output.textContent = result.output + '\n[exit ' + result.code + ']';
      if (connecting && result.code !== 0) throw Error('The companion responded, but its connection check failed. Check the output and try again.');
      connected = true;
      key.value = '';
      status.textContent = 'Connected to this Chromebook.';
    } catch (error) {
      if (controller.signal.aborted) return;
      const message = error.name === 'TypeError' || error.name === 'TimeoutError'
        ? 'Cannot reach the companion. Keep it running on this Chromebook and allow local-network access in Chrome. If no permission appears, check this site’s permissions. Chromebook Linux loopback access may be unavailable in this browser.'
        : error.message;
      clearSession();
      status.textContent = message;
    } finally {
      if (activeRequest === controller) activeRequest = null;
      controls();
    }
  }

  connect.addEventListener('click', async () => {
    if (origin !== trustedOrigin || activeRequest || connected) return;
    const token = key.value.trim();
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      status.textContent = 'Paste the full 64-character session token from your Chromebook Terminal, not your password.';
      return;
    }
    sessionToken = token;
    await execute('pwd', true);
  });
  disconnect.addEventListener('click', () => {
    clearSession();
    status.textContent = 'Disconnected. The companion is still running; stop it in Terminal with Ctrl+C to end access.';
    output.textContent = 'Disconnected.';
  });
  run.addEventListener('click', async () => {
    if (!connected || activeRequest) return;
    const text = command.value.trim();
    if (!text || text.length > 512) {
      status.textContent = 'Enter a command of 1–512 characters.';
      return;
    }
    await execute(text, false);
  });
  command.addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); run.click(); }
  });
  document.defaultView?.addEventListener('pagehide', clearSession);
  if (origin !== trustedOrigin) {
    status.textContent = 'Open https://connect.holytemples.org/chromebook/ on your Chromebook to connect. Other sites cannot use its companion token.';
  }
  controls();
}

if (typeof document !== 'undefined') mountTerminal({document});
