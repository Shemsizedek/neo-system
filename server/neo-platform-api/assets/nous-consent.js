(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const status = byId('nous-consent-status');
  const expiry = byId('nous-consent-expiry');
  const controls = byId('nous-consent-controls');
  const ack = byId('nous-consent-ack');
  const grant = byId('nous-consent-grant');
  const revoke = byId('nous-consent-revoke');
  const retry = byId('nous-consent-retry');
  const ACK = 'ENABLE_NOUS_READ_ONLY_FOR_24_HOURS';
  let busy = false;
  let token = null; // Only in this closure; never in URL, browser storage or DOM.

  function notify(message, error = false) {
    status.textContent = message;
    status.classList.toggle('error', error);
  }
  function toggleBusy(value) {
    busy = value;
    grant.disabled = busy || !ack.checked || !token;
    revoke.disabled = busy || !token;
    retry.disabled = busy;
  }
  async function getIntent() {
    const response = await fetch('/api/v1/auth/nous-consent/intent', {
      method: 'GET', credentials: 'same-origin', cache: 'no-store',
      headers: { accept: 'application/json' },
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) throw new Error('Sign in to NEOpass again to review or change access.');
      throw new Error('The NEOpass identity service is unavailable. Your access was not changed.');
    }
    const body = await response.json();
    if (typeof body.token !== 'string' || !body.token) throw new Error('Consent session is unavailable.');
    token = body.token;
    return token;
  }
  async function callApi(operation, body) {
    const response = await fetch('/api/v1/auth/nous-consent/' + operation, {
      method: operation === 'status' ? 'GET' : 'POST',
      credentials: 'omit', cache: 'no-store',
      headers: { authorization: 'Bearer ' + token, accept: 'application/json',
        ...(body ? { 'content-type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        token = null;
        throw new Error('Sign in to NEOpass again before changing Nous access.');
      }
      throw new Error('Nous access could not be updated. No successful change was confirmed.');
    }
    return data;
  }
  async function refresh() {
    if (busy) return;
    toggleBusy(true);
    controls.hidden = true;
    token = null;
    expiry.hidden = true;
    notify('Checking your current Nous access…');
    try {
      await getIntent();
      const data = await callApi('status');
      controls.hidden = false;
      notify(data.nousAccessEnabled ? 'Read-only Nous OS access is enabled.' : 'Nous OS access is not enabled.');
      revoke.disabled = !data.nousAccessEnabled;
      if (data.expiresAt && data.nousAccessEnabled) {
        const until = new Date(data.expiresAt);
        if (Number.isFinite(until.getTime())) {
          expiry.textContent = 'Access expires: ' + until.toLocaleString();
          expiry.hidden = false;
        }
      }
    } catch (error) {
      controls.hidden = true;
      notify(error.message || 'Could not verify your current access.', true);
    } finally {
      toggleBusy(false);
    }
  }
  async function change(operation) {
    if (busy || !token || (operation === 'grant' && !ack.checked)) return;
    toggleBusy(true);
    notify('Submitting your choice…');
    try {
      const body = operation === 'grant' ? { acknowledge: ACK } : undefined;
      const data = await callApi(operation, body);
      ack.checked = false;
      controls.hidden = false;
      notify(data.nousAccessEnabled ? 'Read-only Nous access has been granted for up to 24 hours.' : 'Nous access has been revoked. Already-issued tokens may remain valid for up to 120 seconds.');
      revoke.disabled = !data.nousAccessEnabled;
      if (data.expiresAt && data.nousAccessEnabled) {
        expiry.textContent = 'Access expires: ' + new Date(data.expiresAt).toLocaleString();
        expiry.hidden = false;
      } else expiry.hidden = true;
      status.focus();
    } catch (error) {
      notify(error.message || 'Your choice could not be confirmed.', true);
      controls.hidden = true;
    } finally {
      toggleBusy(false);
    }
  }

  ack.addEventListener('change', () => { if (!busy) grant.disabled = !ack.checked || !token; });
  grant.addEventListener('click', () => change('grant'));
  revoke.addEventListener('click', () => change('revoke'));
  retry.addEventListener('click', refresh);
  window.addEventListener('pagehide', () => { token = null; });
  refresh();
})();