(() => {
  const root = document.documentElement;
  const platform = root.dataset.platform;
  const apiPath = `/neo-system/api/platforms/${platform}.json`;
  const statusEl = document.querySelector('[data-api-status]');
  const dotEl = document.querySelector('[data-api-dot]');
  const checkedEl = document.querySelector('[data-checked]');
  const capabilitiesEl = document.querySelector('[data-capabilities]');
  const endpointEl = document.querySelector('[data-endpoint]');

  if (endpointEl) endpointEl.textContent = apiPath;

  fetch(apiPath, { cache: 'no-store' })
    .then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((data) => {
      if (statusEl) statusEl.textContent = data.status === 'ready' ? 'Pages API online' : data.status;
      if (dotEl) dotEl.classList.add(data.status === 'ready' ? 'ok' : 'warn');
      if (checkedEl) checkedEl.textContent = data.generatedAt ? new Date(data.generatedAt).toLocaleString() : 'unknown';
      if (capabilitiesEl) {
        capabilitiesEl.innerHTML = '';
        for (const item of data.capabilities || []) {
          const row = document.createElement('div');
          row.className = 'row';
          row.innerHTML = `<strong>${item.name}</strong><small>${item.mode}</small>`;
          capabilitiesEl.appendChild(row);
        }
      }
    })
    .catch((error) => {
      if (statusEl) statusEl.textContent = 'API snapshot unavailable';
      if (dotEl) dotEl.classList.add('warn');
      if (checkedEl) checkedEl.textContent = error.message;
    });
})();
