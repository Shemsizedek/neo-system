'use strict';

// Public preview navigation only. No sign-in, account lookup, or financial API calls.
const sections = new Set(['home', 'accounts', 'community', 'activity']);
const legacy = {overview: 'home', exchange: 'community', markets: 'community', integrations: 'home'};
const byId = (id) => document.getElementById(id);
const normalize = (name) => {
  const target = legacy[name] || name;
  return sections.has(target) ? target : 'home';
};

function showSection(name, {updateHash = true} = {}) {
  const section = normalize(name);
  for (const view of document.querySelectorAll('[data-view]')) {
    view.hidden = view.dataset.view !== section;
  }
  for (const button of document.querySelectorAll('[data-section]')) {
    const selected = button.dataset.section === section;
    button.classList.toggle('is-active', selected);
    if (selected) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  }
  if (updateHash && window.location.hash !== '#' + section) {
    window.location.hash = section;
  }
  document.title = section === 'home'
    ? 'NEO Bank | Community Finance'
    : section.charAt(0).toUpperCase() + section.slice(1) + ' | NEO Bank';
}

for (const button of document.querySelectorAll('[data-section]')) {
  button.addEventListener('click', () => showSection(button.dataset.section));
}
for (const card of document.querySelectorAll('[data-open]')) {
  card.addEventListener('click', () => {
    showSection(card.dataset.open);
    byId('main').focus({preventScroll: true});
    window.scrollTo({top: 0, behavior: 'smooth'});
  });
}
window.addEventListener('hashchange', () =>
  showSection(window.location.hash.slice(1), {updateHash: false}));
showSection(window.location.hash.slice(1), {updateHash: false});

let checking = false;
async function refreshStatus() {
  if (checking) return;
  checking = true;
  const button = byId('refreshStatus');
  const runtime = byId('runtimeStatus');
  const checked = byId('checkedAt');
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  runtime.textContent = 'Checking…';
  runtime.classList.remove('is-good');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch('./site-status.json', {
      method: 'GET', headers: {'accept': 'application/json'},
      credentials: 'omit', cache: 'no-store', redirect: 'error', signal: controller.signal
    });
    const status = response.ok ? await response.json() : null;
    const available = Boolean(status && status.ok === true &&
      status.mode === 'read-only-preview' &&
      status.accountServices === false && status.financialWrites === false);
    runtime.textContent = available ? 'Preview available' : 'Status not verified';
    runtime.classList.toggle('is-good', available);
  } catch {
    runtime.textContent = 'Unable to check';
  } finally {
    clearTimeout(timer);
    checked.textContent = 'Checked ' + new Date().toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'}) +
      ' · Banking services remain unavailable';
    button.disabled = false;
    button.removeAttribute('aria-busy');
    checking = false;
  }
}
byId('refreshStatus').addEventListener('click', refreshStatus);
refreshStatus();
