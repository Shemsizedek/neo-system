const API = window.NEO_PADS_API || 'http://localhost:8788';

const qs = (s) => document.querySelector(s);

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
  const body = {
    hostWallet: qs('#hostWallet').value.trim(),
    title: qs('#propertyTitle').value.trim(),
    location: qs('#propertyLocation').value.trim(),
    priceWorld: Number(qs('#propertyRate').value),
    propertyAuthorityVerified: qs('#authorityVerified').checked
  };
  const response = await fetch(`${API}/pads/properties`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  qs('#hostStatus').textContent = JSON.stringify(data, null, 2);
});

search().catch(() => {
  qs('#results').innerHTML = '<div class="panel">NEO Pads API is offline or not yet configured.</div>';
});
