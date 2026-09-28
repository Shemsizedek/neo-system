(() => {
  const root = document.documentElement;
  const platform = root.dataset.platform;
  const apiPath = `/neo-system/api/platforms/${platform}.json`;
  const seoDefaults = {
    'neo-books':['NEO Books — Accounting, Treasury & Ledger Platform','Accounting, treasury, ledger and reporting infrastructure across the NEO ecosystem.'],
    'neo-miner':['NEO Miner — Bitcoin Mining Control Plane','Mining telemetry, fleet control and operational infrastructure across the NEO ecosystem.'],
    'neopay':['NEOpay — Bitcoin & Counterparty Wallet Infrastructure','Bitcoin, Counterparty and digital-asset wallet infrastructure across the NEO ecosystem.'],
    'neo-counter':['NEO Counter — Commerce & Checkout Infrastructure','Merchant, checkout and transaction infrastructure across the NEO ecosystem.'],
    'neo-pads':['NEO Pads — Hospitality & Lodging Infrastructure','Hospitality, lodging and property workflows across the NEO ecosystem.'],
    'neopass':['NEO Pass — Identity & Access Infrastructure','Identity, authentication and access infrastructure across the NEO ecosystem.'],
    'neoscan':['NEO Scan — Bitcoin & Counterparty Explorer','Explore public Bitcoin, Counterparty and NEO ecosystem asset data.']
  };
  const pair = seoDefaults[platform];
  if (pair) {
    document.title = pair[0];
    let d = document.querySelector('meta[name="description"]');
    if (!d) { d=document.createElement('meta'); d.name='description'; document.head.appendChild(d); }
    d.content=pair[1];
    if (!document.querySelector('link[rel="canonical"]')) {
      const c=document.createElement('link'); c.rel='canonical'; c.href=location.origin+location.pathname; document.head.appendChild(c);
    }
    if (!document.querySelector('link[rel="icon"]')) {
      const f=document.createElement('link'); f.rel='icon'; f.type='image/png'; f.href='https://holytemples.org/wp-content/uploads/2026/09/holy-keys-transparent-master.png'; document.head.appendChild(f);
    }
    const metas = {
      'og:type':'website','og:title':pair[0],'og:description':pair[1],
      'og:url':location.origin+location.pathname,
      'og:image':'https://holytemples.org/wp-content/uploads/2026/09/holy-keys-transparent-master.png',
      'twitter:card':'summary_large_image','twitter:title':pair[0],
      'twitter:description':pair[1],
      'twitter:image':'https://holytemples.org/wp-content/uploads/2026/09/holy-keys-transparent-master.png'
    };
    for (const [key,val] of Object.entries(metas)) {
      const isTwitter=key.startsWith('twitter:');
      let m=document.querySelector(`meta[${isTwitter?'name':'property'}="${key}"]`);
      if(!m){m=document.createElement('meta');m.setAttribute(isTwitter?'name':'property',key);document.head.appendChild(m);}
      m.content=val;
    }
  }
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
