const companionBase = 'http://127.0.0.1:8766';
const trustedOrigin = 'https://connect.holytemples.org';

export function mountTerminal({document, fetch:request = globalThis.fetch, origin = globalThis.location.origin}) {
  const element = id => document.getElementById(id);
  const key = element('key'), command = element('cmd'), output = element('out'), status = element('status');
  const connect = element('connect'), disconnect = element('disconnect'), run = element('run');
  const mode = element('mode'), sshSettings = element('ssh-settings');
  const sshHost = element('ssh-host'), sshUser = element('ssh-user'), sshPort = element('ssh-port');
  let sessionToken = '', sessionTarget = null, connected = false, activeRequest = null;

  function controls() {
    connect.disabled = Boolean(activeRequest) || connected || origin !== trustedOrigin;
    disconnect.disabled = !activeRequest && !connected;
    key.disabled = Boolean(activeRequest) || connected || origin !== trustedOrigin;
    mode.disabled = key.disabled;
    sshSettings.hidden = mode.value !== 'ssh';
    for (const input of [sshHost, sshUser, sshPort]) input.disabled = key.disabled;
    command.disabled = run.disabled = !connected || Boolean(activeRequest);
    run.textContent = (sessionTarget?.type || mode.value) === 'ssh' ? 'Run on SSH server' : 'Run on Chromebook';
  }

  function clearSession() {
    activeRequest?.abort();
    activeRequest = null;
    connected = false;
    sessionToken = '';
    sessionTarget = null;
    key.value = '';
    controls();
  }

  async function execute(text, connecting) {
    const target = sessionTarget;
    const isSsh = target?.type === 'ssh';
    const controller = new AbortController();
    activeRequest = controller;
    controls();
    status.textContent = connecting ? 'Checking companion…' : 'Running command…';
    try {
      const response = await request(companionBase + (isSsh ? '/ssh/command' : '/command'), {
        method:'POST', credentials:'omit', cache:'no-store', redirect:'error',
        headers:{'content-type':'application/json', 'x-neo-token':sessionToken},
        body:JSON.stringify(isSsh ? {...target.options, command:text} : {command:text}),
        signal:AbortSignal.any([controller.signal, AbortSignal.timeout(isSsh ? 20000 : 10000)])
      });
      if (controller.signal.aborted) return;
      if (!response.ok) {
        if (response.status === 401) throw Error('Token not accepted. Paste the session token from the currently running companion, then reconnect.');
        if (response.status === 403) throw Error('The companion rejected this site. Use https://connect.holytemples.org/chromebook/ and the supported companion.');
        if (isSsh && response.status === 404) throw Error('This companion does not support SSH yet. Update the Chromebook checkout and restart the companion.');
        if (isSsh && response.status === 503) throw Error('OpenSSH is unavailable. Install the openssh-client package in your Chromebook Linux environment, then reconnect.');
        if (isSsh && response.status === 504) throw Error('The SSH connection or command timed out. Check the server address and network from your Chromebook Terminal.');
        throw Error('The companion could not run that command (HTTP ' + response.status + ').');
      }
      const result = await response.json();
      if (controller.signal.aborted) return;
      if (typeof result.output !== 'string' || !Number.isInteger(result.code)) throw Error('Unexpected companion response. Check that the supported companion is running.');
      output.textContent = result.output + '\n[exit ' + result.code + ']';
      if (connecting && result.code !== 0) throw Error(isSsh
        ? 'The SSH connection check failed. See the output. First verify the server host key and key-based login in your Chromebook Terminal.'
        : 'The companion responded, but its connection check failed. Check the output and try again.');
      connected = true;
      key.value = '';
      status.textContent = isSsh ? 'Connected over SSH to ' + target.options.hostAlias + ' from this Chromebook.' : 'Connected to this Chromebook.';
    } catch (error) {
      if (controller.signal.aborted) return;
      const message = isSsh && error.name === 'TimeoutError'
        ? 'The SSH request timed out. Check the companion and the SSH connection from your Chromebook Terminal.'
        : error.name === 'TypeError' || error.name === 'TimeoutError'
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
    let target = {type:'local'};
    if (mode.value === 'ssh') {
      const hostAlias = sshHost.value.trim(), username = sshUser.value.trim(), port = sshPort.value.trim();
      if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,252}$/.test(hostAlias)) {
        status.textContent = 'Enter a server hostname, IPv4 address, or SSH alias—not a service-account email or user@host.';
        return;
      }
      if (username && !/^[a-zA-Z0-9_][a-zA-Z0-9_.-]{0,63}$/.test(username)) {
        status.textContent = 'Enter a Linux SSH username of up to 64 letters, numbers, underscores, dots, or hyphens.';
        return;
      }
      if (port && (!/^[0-9]+$/.test(port) || Number(port) < 1 || Number(port) > 65535)) {
        status.textContent = 'Enter an SSH port from 1 to 65535, or leave it empty to use your SSH configuration.';
        return;
      }
      target = {type:'ssh', options:{hostAlias, ...(username ? {username} : {}), ...(port ? {port:Number(port)} : {})}};
    }
    sessionTarget = target;
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
  mode.addEventListener('change', controls);
  document.defaultView?.addEventListener('pagehide', clearSession);
  if (origin !== trustedOrigin) {
    status.textContent = 'Open https://connect.holytemples.org/chromebook/ on your Chromebook to connect. Other sites cannot use its companion token.';
  }
  controls();
}

if (typeof document !== 'undefined') mountTerminal({document});
