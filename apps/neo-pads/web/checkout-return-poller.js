const POLL_INTERVAL_MS = 10_000;
const MAX_POLL_ATTEMPTS = 12;

const panel = document.querySelector('#checkoutReturn');
const refreshButton = document.querySelector('#refreshBookingStatus');
const title = document.querySelector('#checkoutReturnTitle');
const tokenInput = document.querySelector('#neopassToken');

let timer = null;
let attempts = 0;

function checkoutReturnActive() {
  if (!panel || panel.hidden) return false;
  return Boolean(new URLSearchParams(window.location.search).get('booking'));
}

function hasNeopassCredential() {
  const entered = tokenInput?.value.trim();
  if (entered) return true;
  return Boolean(sessionStorage.getItem('neo-neopass-token'));
}

function terminalStatusReached() {
  const value = title?.textContent?.trim().toLowerCase() || '';
  return [
    'booking confirmed',
    'booking refunded',
    'booking disputed',
    'booking cancelled',
    'booking access denied'
  ].includes(value);
}

function stopPolling() {
  if (timer !== null) {
    window.clearInterval(timer);
    timer = null;
  }
}

function pollOnce() {
  if (!checkoutReturnActive() || !hasNeopassCredential() || terminalStatusReached()) {
    stopPolling();
    return;
  }
  if (attempts >= MAX_POLL_ATTEMPTS) {
    stopPolling();
    return;
  }
  attempts += 1;
  refreshButton?.click();
}

function startPolling() {
  if (!checkoutReturnActive() || !hasNeopassCredential() || terminalStatusReached()) return;
  attempts = 0;
  stopPolling();
  timer = window.setInterval(pollOnce, POLL_INTERVAL_MS);
}

refreshButton?.addEventListener('click', () => {
  if (hasNeopassCredential() && !terminalStatusReached()) startPolling();
});

tokenInput?.addEventListener('change', () => {
  if (tokenInput.value.trim()) startPolling();
});

const observer = title ? new MutationObserver(() => {
  if (terminalStatusReached()) stopPolling();
}) : null;
observer?.observe(title, { childList: true, characterData: true, subtree: true });

window.addEventListener('pagehide', stopPolling);

if (checkoutReturnActive() && hasNeopassCredential()) startPolling();
