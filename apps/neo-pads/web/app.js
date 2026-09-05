const API = window.NEO_PADS_API || 'http://localhost:8788';

const qs = (s) => document.querySelector(s);

function checkoutReturnBookingId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('booking');
}

async function refreshBookingStatus() {
  const bookingId = checkoutReturnBookingId();
  if (!bookingId) return;
  const title = qs('#checkoutReturnTitle');
  const message = qs('#checkoutReturnMessage');
  const enteredToken = qs('#neopassToken').value.trim();
  if (enteredToken) sessionStorage.setItem('neo-neopass-token', enteredToken);
  const token = enteredToken || sessionStorage.getItem('neo-neopass-token');
  title.textContent = 'Payment verification pending';
  if (!token) {
    message.textContent = 'A NEOpass sign-in is required to read this booking. Browser return data is not payment proof.';
    return;
  }

  try {
    const response = await fetch(`${API}/pads/reservations/${encodeURIComponent(bookingId)}/status`, {
      headers: { authorization: `Bearer ${token}` },
      cache: 'no-store'
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      title.textContent = response.status === 401 || response.status === 403 ? 'Booking access denied' : 'Status temporarily unavailable';
      message.textContent = data.error || 'Unable to verify the booking status.';
      return;
    }
    const confirmed = data.bookingState === 'CONFIRMED' && data.settlementState === 'SETTLED';
    const terminalMessages = {
      REFUNDED: ['Booking refunded', 'The settlement was refunded and occupancy access is revoked.'],
      DISPUTED: ['Booking disputed', 'This booking is disputed and occupancy access is revoked.'],
      CANCELLED: ['Booking cancelled', 'This booking is cancelled and will not become confirmed.']
    };
    const terminal = terminalMessages[data.bookingState];
    title.textContent = confirmed ? 'Booking confirmed' : terminal?.[0] || 'Payment verification pending';
    message.textContent = confirmed
      ? 'Authenticated settlement is recorded and the booking is confirmed.'
      : terminal?.[1] || 'No authenticated settlement record is available yet. Refresh after network confirmation.';
  } catch {
    title.textContent = 'Status temporarily unavailable';
    message.textContent = 'The NEO Pads API could not be reached. The booking remains unconfirmed.';
  }
}

const returnBookingId = checkoutReturnBookingId();
if (returnBookingId) {
  qs('#checkoutReturn').hidden = false;
  qs('#refreshBookingStatus').addEventListener('click', refreshBookingStatus);
  void refreshBookingStatus();
}

for (const button of document.querySelectorAll('[data-view]')) {
  button.addEventListener('click', () => {
    document.querySelectorAll('.view').forEach((view) => view.classList.remove('active'));
    qs(`#${button.dataset.view}`).classList.add('active');
  });
}

function padCard(pad) {
  return `
    <article class="card">
      <div class="card-visual" aria-hidden="true"></div>
      <div class="card-body">
        <h3>${escapeHtml(pad.title)}</h3>
        <div class="muted">${escapeHtml(pad.location)}</div>
        <p class="price">∞${Number(pad.priceWorld).toLocaleString()} / night</p>
        <button class="primary" data-property="${escapeHtml(pad.id)}">View Pad</button>
      </div>
    </article>`;
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[char]);
}

async function search(location = '') {
  const url = new URL(`${API}/pads/search`);
  if (location) url.searchParams.set('location', location);
  const response = await fetch(url);
  const data = await response.json();
  qs('#results').innerHTML = data.results?.length
    ? data.results.map(padCard).join('')
    : '<div class="panel">No active Pads matched this search yet.</div>';
}

qs('#searchForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  await search(qs('#location').value.trim());
});

qs('#verifyHomeshares').addEventListener('click', async () => {
  const wallet = qs('#hostWallet').value.trim();
  if (!wallet) return;
  qs('#hostStatus').textContent = 'Checking Counterparty…';
  try {
    const response = await fetch(`${API}/counterparty/${encodeURIComponent(wallet)}/homeshares`);
    const data = await response.json();
    qs('#hostStatus').textContent = JSON.stringify(data, null, 2);
  } catch (error) {
    qs('#hostStatus').textContent = `Verification unavailable: ${error.message}`;
  }
});

qs('#propertyForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const authorityStatus = qs('#propertyAuthorityStatus');
  authorityStatus.textContent = 'Submitting property. Authority will remain pending until trusted review is completed.';
  const body = {
    hostWallet: qs('#hostWallet').value.trim(),
    title: qs('#propertyTitle').value.trim(),
    location: qs('#propertyLocation').value.trim(),
    priceWorld: Number(qs('#propertyRate').value)
  };
  try {
    const response = await fetch(`${API}/pads/properties`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({}));
    qs('#hostStatus').textContent = JSON.stringify(data, null, 2);
    if (!response.ok) {
      authorityStatus.textContent = 'Property was not created. No authority state was changed.';
      return;
    }
    const verified = data.propertyAuthorityVerified === true || data.authorityVerified === true;
    authorityStatus.textContent = verified
      ? 'Authority verified by the trusted NEO Pads review process.'
      : 'Pending verification. Submission does not self-approve property authority.';
  } catch (error) {
    authorityStatus.textContent = 'Property submission could not be completed. Authority remains unverified.';
    qs('#hostStatus').textContent = `Property creation unavailable: ${error.message}`;
  }
});

search().catch(() => {
  qs('#results').innerHTML = '<div class="panel">NEO Pads API is offline or not yet configured.</div>';
});
